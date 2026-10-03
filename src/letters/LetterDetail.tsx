/**
 * One published letter: who has a copy and who has opened it, the WhatsApp
 * list for sending each partner their link, copies for partners added
 * later, and withdrawing.
 *
 * The links exist only on the device that published (local.ts). Elsewhere
 * the page says so, and offers what needs no key: the opens, and withdrawing.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type CopyRow, type Letter, type Partner, type Settings } from "./api";
import { fillTemplate, fmtDate, fmtShort, fmtSize, fmtTime, local, msg, statusOf, waUrl, type LocalLetter } from "./local";
import { emailOne, sendCopies, type SendResult, type Step } from "./publish";
import { Bar, Box, Btn, Check, Err, GOOD, INK, Note, Pill, Reach, SERIF, SOFT } from "./ui";

/** What the publish step hands over: the links, in case this browser wouldn't keep them, and how it went. */
export type Fresh = { rec: LocalLetter; result: SendResult };

export default function LetterDetail({ id, fresh, partners, settings, onBack }: { id: string; fresh?: Fresh; partners: Partner[]; settings: Settings; onBack: () => void }) {
  const [data, setData] = useState<{ letter: Letter; copies: CopyRow[] } | null>(null);
  const [rec, setRec] = useState<LocalLetter | null>(() => local.get(id) ?? fresh?.rec ?? null);
  const [sent, setSent] = useState<Record<string, number>>(() => local.sent(id));
  const [result, setResult] = useState<SendResult | null>(fresh?.result ?? null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState("");
  // "Days left" counts from when the page opened: a pure value for render.
  const [openedAt] = useState(() => Date.now());

  const load = useCallback(() => api.letter(id).then(setData, (e) => setError(msg(e))), [id]);
  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => new Map(partners.map((p) => [p.id, p])), [partners]);

  const act = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError("");
    setNote("");
    try {
      await fn();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy("");
    }
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <Btn onClick={onBack}>‹ All letters</Btn>
        {error ? <Err>{error}</Err> : <p style={{ color: SOFT }}>Loading…</p>}
      </div>
    );
  }

  const { letter, copies } = data;
  const live = letter.status === "live";
  const st = statusOf(letter);
  const opened = copies.filter((c) => c.opened).length;
  const praying = copies.filter((c) => c.praying).length;
  const daysLeft = Math.max(0, Math.ceil((letter.expiresAt - openedAt) / 864e5));
  const keys = live ? rec : null;
  const have = new Set(copies.map((c) => c.partnerId));

  const message = (p: Partner, link: string) =>
    fillTemplate(settings.waTemplate, { hello: p.hello || p.name, name: p.name, title: letter.title, link, expires: fmtDate(letter.expiresAt) });

  const tick = (copyId: string, on: boolean) => setSent(local.setSent(id, copyId, on));

  const copy = async (copyId: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(copyId);
      setTimeout(() => setCopied((c) => (c === copyId ? "" : c)), 2500);
    } catch {
      window.prompt("Copy this link:", link);
    }
  };

  return (
    <div className="space-y-4">
      <Btn onClick={onBack}>‹ All letters</Btn>

      {result && <Outcome result={result} />}

      <Box className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold leading-snug sm:text-2xl" style={{ color: INK, fontFamily: SERIF }}>
            {letter.title}
          </h2>
          <Pill tone={st.tone}>{st.label}</Pill>
        </div>
        <p className="text-sm" style={{ color: SOFT }}>
          Published {fmtShort(letter.publishedAt)} · available until {fmtDate(letter.expiresAt)} · {fmtSize(letter.size)} · download {letter.allowDownload ? "allowed" : "off"}
        </p>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <Stat label="Copies" value={String(copies.length)} />
          <Stat label="Opened" value={`${opened}`} />
          <Stat label="Praying" value={`${praying}`} />
          <Stat label="Days left" value={String(daysLeft)} />
        </div>
        {letter.status === "withdrawn" && (
          <p className="text-sm" style={{ color: SOFT }}>
            Withdrawn {letter.withdrawnAt ? fmtTime(letter.withdrawnAt) : ""}: every copy and the file are deleted, and no link opens it any more.
          </p>
        )}
        {letter.status === "uploading" && (
          <p className="text-sm" style={{ color: SOFT }}>
            This upload didn't finish, so nobody got it. Remove it and publish again.
          </p>
        )}
        {live && !rec && (
          <div className="rounded-2xl bg-[#faf6ee] p-4 text-sm leading-relaxed" style={{ color: INK }}>
            <p className="font-bold">The links aren't on this device.</p>
            <p className="mt-1" style={{ color: SOFT }}>
              Each partner's link holds the key to their copy, and the links are kept only on the device that published the letter. Here you can see who opened it and withdraw
              copies, but to send links or make copies for more partners, use that device.
            </p>
          </div>
        )}
      </Box>

      {copies.length > 0 && (
        <Box>
          <p className="font-bold" style={{ color: INK }}>
            {keys ? "Send each partner their link" : "Partners"}
          </p>
          {keys && (
            <p className="mt-1 text-sm" style={{ color: SOFT }}>
              Tap Send on WhatsApp: the message opens ready to send, with their own link. Tick each one off as you go.
            </p>
          )}
          <ul className="mt-2 divide-y divide-[#efe9df]">
            {copies.map((c) => {
              const p = byId.get(c.partnerId);
              const link = keys?.links[c.copyId]?.link;
              const done = !!sent[c.copyId];
              // Emailed and not on WhatsApp: nothing left to send by hand.
              const tickable = !!link && !(c.mailed && !p?.whatsapp);
              const withdraw = live ? (
                <button
                  type="button"
                  disabled={!!busy}
                  className="ml-auto min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  onClick={() => {
                    if (!window.confirm(`Withdraw ${c.name}'s copy? Their link stops working at once.`)) return;
                    void act("withdraw", async () => {
                      await api.withdrawCopy(letter.id, c.copyId);
                      local.removeLink(letter.id, c.copyId);
                      setRec((r) => {
                        if (!r) return r;
                        const links = { ...r.links };
                        delete links[c.copyId];
                        return { ...r, links };
                      });
                      await load();
                    });
                  }}
                >
                  Withdraw
                </button>
              ) : null;
              return (
                <li key={c.copyId} className="py-3">
                  <p className="font-semibold" style={{ color: INK }}>
                    {c.name}
                  </p>
                  <p className="text-sm" style={{ color: SOFT }}>
                    {c.opened ? <span style={{ color: GOOD }}>Opened {fmtTime(c.opened)}</span> : "Not opened yet"}
                    {c.mailed ? " · emailed" : ""}
                    {c.praying ? <span style={{ color: "#8a6a2e" }}> · 🙏 praying{c.praying.at ? ` (${fmtTime(c.praying.at)})` : ""}</span> : ""}
                  </p>
                  {c.praying?.note && (
                    <p className="mt-1 rounded-xl bg-[#faf6ee] px-3 py-2 text-sm italic leading-relaxed" style={{ color: INK }}>
                      “{c.praying.note}”
                    </p>
                  )}
                  {(link || withdraw) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {link && p?.whatsapp && (
                        <Btn kind="whatsapp" href={waUrl(p.whatsapp, message(p, link))} onClick={() => tick(c.copyId, true)}>
                          Send on WhatsApp
                        </Btn>
                      )}
                      {link && <Btn onClick={() => void copy(c.copyId, link)}>{copied === c.copyId ? "Copied" : "Copy link"}</Btn>}
                      {link && p?.email && !c.mailed && (
                        <Btn
                          disabled={!!busy}
                          onClick={() =>
                            void act("email", async () => {
                              if (await emailOne(letter.id, c.copyId, c.partnerId, link)) setNote(`Emailed ${c.name}.`);
                              await load();
                            })
                          }
                        >
                          Send email
                        </Btn>
                      )}
                      {tickable && (
                        <button
                          type="button"
                          aria-pressed={done}
                          onClick={() => tick(c.copyId, !done)}
                          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-bold"
                          style={done ? { borderColor: "#bcd6b5", background: "#e3eedf", color: GOOD } : { borderColor: "#ddd5c7", color: SOFT }}
                        >
                          <span aria-hidden="true">{done ? "✓" : "○"}</span> Sent
                        </button>
                      )}
                      {withdraw}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-2 space-y-2">
            <Err>{error}</Err>
            <Note>{note}</Note>
          </div>
        </Box>
      )}

      {keys && (
        <MorePartners
          rec={keys}
          candidates={partners.filter((p) => p.active && !have.has(p.id))}
          onDone={(next, r) => {
            setRec(next);
            setResult(r);
            void load();
            window.scrollTo(0, 0);
          }}
        />
      )}

      <Box className="space-y-3">
        <p className="font-bold" style={{ color: INK }}>
          {live ? "Withdraw" : "Clean up"}
        </p>
        {live && (
          <>
            <p className="text-sm" style={{ color: SOFT }}>
              Withdrawing deletes every copy and the encrypted file. Every link stops working at once, and it can't be undone.
            </p>
            <Btn
              kind="danger"
              disabled={!!busy}
              onClick={() => {
                if (!window.confirm("Withdraw this letter from everyone? Every link stops working at once.")) return;
                void act("all", async () => {
                  await api.withdrawAll(letter.id);
                  local.forget(letter.id);
                  setRec(null);
                  await load();
                });
              }}
            >
              Withdraw from everyone
            </Btn>
          </>
        )}
        {rec && (
          <div className="pt-1">
            <p className="text-sm" style={{ color: SOFT }}>
              {live
                ? "This device keeps every partner's link so you can send them. Forgetting them leaves the letter open for partners; you just can't send links from here any more."
                : "This device still has the old links. They no longer open anything."}
            </p>
            <Btn
              className="mt-2"
              onClick={() => {
                if (live && !window.confirm("Forget the links on this device? You won't be able to send them from here again.")) return;
                local.forget(letter.id);
                setRec(null);
              }}
            >
              Forget links on this device
            </Btn>
          </div>
        )}
        {!live && (
          <Btn
            kind="danger"
            disabled={!!busy}
            onClick={() => {
              if (!window.confirm("Remove this letter from the list?")) return;
              void act("remove", async () => {
                await api.removeLetter(letter.id);
                local.forget(letter.id);
                onBack();
              });
            }}
          >
            Remove from the list
          </Btn>
        )}
        {!copies.length && <Err>{error}</Err>}
      </Box>
    </div>
  );
}

function Outcome({ result }: { result: SendResult }) {
  return (
    <Box className="space-y-2 border-2 border-[#cfe0c9]">
      <p className="text-lg font-bold" style={{ color: GOOD, fontFamily: SERIF }}>
        {result.made ? `Published. ${result.made} partner${result.made === 1 ? " has" : "s have"} their own copy.` : "No copies were made."}
      </p>
      {result.emailed > 0 && (
        <p className="text-sm" style={{ color: INK }}>
          {result.emailed} email{result.emailed === 1 ? "" : "s"} went out. Now send the WhatsApp messages below.
        </p>
      )}
      {result.emailed === 0 && !result.emailError && <p className="text-sm" style={{ color: INK }}>Now send the WhatsApp messages below.</p>}
      {result.emailError && (
        <Err>{`The emails didn't go out: ${result.emailError} Send those partners their link on WhatsApp or with Copy link, or try Send email on each.`}</Err>
      )}
      {result.failed.length > 0 && <Err>{`Couldn't make a copy for ${result.failed.join(", ")}. Try again with Send to more partners.`}</Err>}
      {!result.kept && (
        <Err>This browser wouldn't keep the links (private browsing?). Send every WhatsApp message now, before you close this page: the links can't be recovered later.</Err>
      )}
    </Box>
  );
}

function MorePartners({ rec, candidates, onDone }: { rec: LocalLetter; candidates: Partner[]; onDone: (rec: LocalLetter, r: SendResult) => void }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState("");
  const pick = candidates.filter((p) => chosen.has(p.id));

  const go = async () => {
    const emails = pick.filter((p) => p.email).length;
    if (!window.confirm(`Make copies for ${pick.length} more partner${pick.length === 1 ? "" : "s"}?${emails ? ` ${emails} email${emails === 1 ? "" : "s"} will go out right away.` : ""}`)) return;
    setError("");
    setStep({ label: "Making each partner's copy", done: 0, total: pick.length });
    try {
      const r = await sendCopies(rec, pick, setStep);
      setChosen(new Set());
      setOpen(false);
      onDone(r.rec, r.result);
    } catch (e) {
      setError(msg(e));
    } finally {
      setStep(null);
    }
  };

  return (
    <Box className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold" style={{ color: INK }}>
          Send to more partners
        </p>
        {!open && candidates.length > 0 && <Btn onClick={() => setOpen(true)}>Choose partners</Btn>}
      </div>
      {!candidates.length && (
        <p className="text-sm" style={{ color: SOFT }}>
          Everyone on your list has this letter. Partners you add later can be sent it from here, until it expires.
        </p>
      )}
      {open && (
        <>
          <p className="text-sm" style={{ color: SOFT }}>
            Each gets their own copy and link, open until {fmtDate(rec.expiresAt)} like everyone else's. Emails go out as soon as you send.
          </p>
          <div className="divide-y divide-[#f2ede4]">
            {candidates.map((p) => (
              <Check
                key={p.id}
                checked={chosen.has(p.id)}
                onChange={(on) =>
                  setChosen((s) => {
                    const n = new Set(s);
                    if (on) n.add(p.id);
                    else n.delete(p.id);
                    return n;
                  })
                }
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold" style={{ color: INK }}>
                    {p.name}
                  </span>
                  <Reach email={p.email} whatsapp={p.whatsapp} />
                </span>
              </Check>
            ))}
          </div>
          {step ? (
            <Bar done={step.done} total={step.total} label={step.label} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Btn kind="primary" disabled={!pick.length} onClick={() => void go()}>
                Encrypt &amp; send to {pick.length || "…"}
              </Btn>
              <Btn onClick={() => setOpen(false)}>Cancel</Btn>
            </div>
          )}
          <Err>{error}</Err>
        </>
      )}
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#faf8f4] px-2 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: SOFT }}>
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums" style={{ color: INK }}>
        {value}
      </p>
    </div>
  );
}
