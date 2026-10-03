/**
 * The owner's prayer requests: add one, mark it answered (with how), remove
 * it, and the prayer team's link to share. Answered requests leave the team's
 * page two weeks later on their own.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MINISTRY_ORIGIN } from "../lib/host";
import { api, type PrayerRequest } from "./api";
import { shrinkPhoto } from "./compose";
import { fmtShort, msg, waUrl } from "./local";
import { weeklyMessage } from "./weekly";

/** Prayer photos: small enough that a page of them loads fast on a phone. */
const PRAYER_PX = 900;
import { Box, Btn, Err, GOOD, INK, Label, Note, Pill, SOFT, inputCls } from "./ui";

export default function PrayerTab() {
  const [data, setData] = useState<{ requests: PrayerRequest[]; token: string } | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [answering, setAnswering] = useState<{ id: string; answer: string } | null>(null);
  const [photo, setPhoto] = useState("");
  const [msgCopied, setMsgCopied] = useState(false);
  const photoFor = useRef<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  // A photo picked for the new request (photoFor null) or for one on the list.
  const pickPhoto = (forId: string | null) => {
    photoFor.current = forId;
    photoInput.current?.click();
  };
  const onPhoto = async (f: File | undefined) => {
    if (!f) return;
    const forId = photoFor.current;
    await act(forId ?? "photo", async () => {
      const url = await shrinkPhoto(f, PRAYER_PX);
      if (forId) setRequests((await api.editPrayer(forId, { photo: url })).requests);
      else setPhoto(url);
    });
  };

  useEffect(() => {
    api.prayer().then(setData, (e) => setError(msg(e)));
  }, []);

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
  const setRequests = (requests: PrayerRequest[]) => setData((d) => (d ? { ...d, requests } : d));

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    void act("add", async () => {
      const r = await api.addPrayer(text.trim(), photo);
      setRequests(r.requests);
      setText("");
      setPhoto("");
      setNote("Added. The team sees it the next time they open the page.");
    });
  };

  const link = data ? `${MINISTRY_ORIGIN}/pray/${data.token}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", link);
    }
  };

  const open = data?.requests.filter((r) => !r.answeredAt) ?? [];
  const answered = data?.requests.filter((r) => r.answeredAt) ?? [];

  return (
    <div className="space-y-4">
      <Box>
        <form onSubmit={add} className="space-y-3">
          <Label text="A new prayer request" hint="Short and plain: one thing to pray for. It shows on the team's page until you mark it answered.">
            <textarea className={`${inputCls} min-h-[6rem] resize-y leading-relaxed`} value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder="Wisdom for the conversation with the CMA board on the 14th" />
          </Label>
          {photo && (
            <div className="relative">
              <img src={photo} alt="" className="max-h-56 w-full rounded-xl object-cover" />
              <button type="button" onClick={() => setPhoto("")} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg font-bold" aria-label="Remove the photo">
                ×
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn kind="primary" type="submit" disabled={busy === "add" || !text.trim()}>
              {busy === "add" ? "Adding…" : "Add request"}
            </Btn>
            <Btn onClick={() => pickPhoto(null)} disabled={busy === "photo"}>
              {busy === "photo" ? "Preparing…" : photo ? "Change photo" : "+ Photo"}
            </Btn>
          </div>
        </form>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void onPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </Box>

      {data && open.length > 0 && (
        <Box className="space-y-3">
          <p className="font-bold" style={{ color: INK }}>
            This week's message
          </p>
          <p className="text-sm" style={{ color: SOFT }}>
            Made from the open requests, with the team's link. Send it to your prayer group, or copy it anywhere.
          </p>
          <p className="whitespace-pre-wrap break-words rounded-2xl bg-[#e7f3e6] p-3 text-[0.92rem] leading-relaxed" style={{ color: INK }}>
            {weeklyMessage(
              open.map((r) => r.text),
              link,
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn kind="whatsapp" href={waUrl("", weeklyMessage(open.map((r) => r.text), link))}>
              Send on WhatsApp
            </Btn>
            <Btn
              onClick={() =>
                void navigator.clipboard.writeText(weeklyMessage(open.map((r) => r.text), link)).then(
                  () => {
                    setMsgCopied(true);
                    setTimeout(() => setMsgCopied(false), 2500);
                  },
                  () => window.prompt("Copy this message:", weeklyMessage(open.map((r) => r.text), link)),
                )
              }
            >
              {msgCopied ? "Copied" : "Copy message"}
            </Btn>
          </div>
        </Box>
      )}

      <Err>{error}</Err>
      <Note>{note}</Note>
      {!data && !error && <p style={{ color: SOFT }}>Loading…</p>}

      {data && (
        <>
          <Box className="space-y-2">
            <p className="font-bold" style={{ color: INK }}>
              Open requests
            </p>
            {open.length === 0 && (
              <p className="text-sm" style={{ color: SOFT }}>
                None open. Add one above.
              </p>
            )}
            <ul className="divide-y divide-[#efe9df]">
              {open.map((r) => (
                <li key={r.id} className="py-3">
                  {r.photo && <img src={r.photo} alt="" className="mb-2 max-h-48 w-full rounded-xl object-cover" />}
                  <p className="whitespace-pre-line leading-relaxed" style={{ color: "#2b2420" }}>
                    {r.text}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: SOFT }}>
                    Since {fmtShort(r.createdAt)} · prayed {r.prayed} {r.prayed === 1 ? "time" : "times"}
                  </p>
                  {answering?.id === r.id ? (
                    <div className="mt-2 space-y-2 rounded-2xl bg-[#f3f8f1] p-3">
                      <Label text="How was it answered?" hint="One line the team will see with their thanks. Optional.">
                        <input className={inputCls} value={answering.answer} onChange={(e) => setAnswering({ id: r.id, answer: e.target.value })} maxLength={600} placeholder="The board said yes; we start in January" />
                      </Label>
                      <div className="flex gap-2">
                        <Btn
                          kind="primary"
                          disabled={!!busy}
                          onClick={() =>
                            void act(r.id, async () => {
                              const res = await api.editPrayer(r.id, { answered: true, answer: answering.answer.trim() });
                              setRequests(res.requests);
                              setAnswering(null);
                            })
                          }
                        >
                          Mark answered
                        </Btn>
                        <Btn onClick={() => setAnswering(null)}>Cancel</Btn>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn onClick={() => pickPhoto(r.id)} disabled={!!busy}>
                        {busy === r.id ? "Preparing…" : r.photo ? "Change photo" : "+ Photo"}
                      </Btn>
                      {r.photo && (
                        <Btn disabled={!!busy} onClick={() => void act(r.id, async () => setRequests((await api.editPrayer(r.id, { photo: "" })).requests))}>
                          Remove photo
                        </Btn>
                      )}
                      <Btn onClick={() => setAnswering({ id: r.id, answer: "" })} disabled={!!busy}>
                        <span aria-hidden="true" style={{ color: GOOD }}>
                          ✓
                        </span>{" "}
                        Answered
                      </Btn>
                      <Btn
                        kind="danger"
                        disabled={!!busy}
                        onClick={() => {
                          if (!window.confirm("Remove this request? It leaves the team's page at once.")) return;
                          void act(r.id, async () => setRequests((await api.deletePrayer(r.id)).requests));
                        }}
                      >
                        Remove
                      </Btn>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Box>

          {answered.length > 0 && (
            <Box className="space-y-2">
              <p className="font-bold" style={{ color: INK }}>
                Answered
              </p>
              <p className="text-sm" style={{ color: SOFT }}>
                Shown to the team with thanks for two weeks, then gone on their own.
              </p>
              <ul className="divide-y divide-[#efe9df]">
                {answered.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 whitespace-pre-line leading-relaxed" style={{ color: SOFT }}>
                        {r.text}
                      </p>
                      <Pill tone="good">Answered</Pill>
                    </div>
                    {r.answer && (
                      <p className="mt-1 font-semibold" style={{ color: GOOD }}>
                        {r.answer}
                      </p>
                    )}
                    <p className="mt-1 text-xs" style={{ color: SOFT }}>
                      Answered {r.answeredAt ? fmtShort(r.answeredAt) : ""} · prayed {r.prayed} {r.prayed === 1 ? "time" : "times"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn disabled={!!busy} onClick={() => void act(r.id, async () => setRequests((await api.editPrayer(r.id, { answered: false })).requests))}>
                        Open again
                      </Btn>
                      <Btn
                        kind="danger"
                        disabled={!!busy}
                        onClick={() => {
                          if (!window.confirm("Remove this request now?")) return;
                          void act(r.id, async () => setRequests((await api.deletePrayer(r.id)).requests));
                        }}
                      >
                        Remove
                      </Btn>
                    </div>
                  </li>
                ))}
              </ul>
            </Box>
          )}

          <Box className="space-y-3">
            <p className="font-bold" style={{ color: INK }}>
              The team's link
            </p>
            <p className="text-sm" style={{ color: SOFT }}>
              Anyone with this link sees the requests and can tap "I prayed". It's also linked from the bottom of every letter. Share it with your prayer partners; make a new one if it gets passed on too far.
            </p>
            <p className="break-all rounded-xl border border-[#ddd5c7] bg-[#faf8f4] px-3 py-2 font-mono text-sm" style={{ color: INK }}>
              {link}
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn kind="primary" onClick={() => void copy()}>
                {copied ? "Copied" : "Copy link"}
              </Btn>
              <Btn kind="whatsapp" href={waUrl("", `Our prayer requests this month, just for our prayer team:\n${link}\n\nThank you for praying with us.`)}>
                Share on WhatsApp
              </Btn>
              <Btn href={link}>See what they see</Btn>
              <Btn
                disabled={!!busy}
                onClick={() => {
                  if (!window.confirm("Make a new link? The old one stops working right away.")) return;
                  void act("rotate", async () => {
                    const r = await api.rotatePrayer();
                    setData((d) => (d ? { ...d, token: r.token } : d));
                  });
                }}
              >
                Make a new link
              </Btn>
            </div>
          </Box>
        </>
      )}
    </div>
  );
}
