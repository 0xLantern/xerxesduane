/**
 * The writer's desk at ministry.xerxesduane.com/letters: write a monthly
 * letter, add photos and prayer requests, preview it exactly as partners
 * will see it, then schedule it (sent on the monthly send day) or send now.
 * Signs in with the same owner login as the hours log.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, api, resizePhoto, type Issue, type Partner, type Reader, type Settings } from "./api";
import LetterView, { ACCENT, INK, SOFT } from "./LetterView";
import { renderLetter, LIFESPAN_DAYS, type Draft } from "./shared";

type Tab = "letters" | "partners" | "settings";

const fmtDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const fmtTime = (ms: number) => new Date(ms).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Desk() {
  const [state, setState] = useState<"loading" | "login" | "ready" | "off">("loading");
  const check = useCallback(async () => {
    try {
      const s = await api.session();
      setState(!s.configured ? "off" : s.authed ? "ready" : "login");
    } catch {
      setState("login");
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the check sets state only once the network answers
    void check();
  }, [check]);

  return (
    <div className="min-h-screen" style={{ background: "#f6f3ee", color: "#2b2420" }}>
      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-[max(1.5rem,env(safe-area-inset-top))]">
        {state === "loading" && <p className="py-24 text-center" style={{ color: SOFT }}>Loading…</p>}
        {state === "off" && <Box>The letters desk isn't switched on: set WORK_PASSWORD in Vercel.</Box>}
        {state === "login" && <Login onIn={() => setState("ready")} />}
        {state === "ready" && <Workspace onOut={() => setState("login")} />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function Box({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(43,26,20,.05),0_10px_30px_-20px_rgba(43,26,20,.3)] sm:p-6 ${className}`}>{children}</section>;
}

function Btn({ children, onClick, kind = "ghost", disabled, type = "button", className = "" }: { children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "danger"; disabled?: boolean; type?: "button" | "submit"; className?: string }) {
  const look = {
    primary: "text-white hover:opacity-90",
    ghost: "border border-[#ddd5c7] bg-white hover:bg-[#faf8f4]",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  }[kind];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[0.95rem] font-bold transition disabled:opacity-50 ${look} ${className}`} style={kind === "primary" ? { background: INK } : kind === "ghost" ? { color: INK } : undefined}>
      {children}
    </button>
  );
}

const inputCls = "w-full min-h-11 rounded-xl border border-[#ddd5c7] bg-[#faf8f4] px-3 py-2 text-base text-[#2b2420] placeholder:text-[#a49a8f] focus:border-[#8a6a2e] focus:outline-none focus:ring-2 focus:ring-[#8a6a2e]/20";

function Label({ text, hint, children }: { text: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold" style={{ color: INK }}>
        {text}
      </span>
      {children}
      {hint && <span className="mt-1 block text-sm" style={{ color: SOFT }}>{hint}</span>}
    </label>
  );
}

function Err({ children }: { children: string }) {
  return children ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p> : null;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

function Login({ onIn }: { onIn: () => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login(email, pw);
      onIn();
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box className="mx-auto mt-16 max-w-sm">
      <form onSubmit={submit} className="space-y-3">
        <h1 className="text-xl font-bold" style={{ color: INK, fontFamily: "Georgia, serif" }}>
          Partner letters
        </h1>
        <p className="text-sm" style={{ color: SOFT }}>Sign in with your work log account.</p>
        <input className={inputCls} type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputCls} type="password" autoComplete="current-password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <Err>{error}</Err>
        <Btn kind="primary" type="submit" disabled={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Btn>
      </form>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Workspace: tabs
// ---------------------------------------------------------------------------

function Workspace({ onOut }: { onOut: () => void }) {
  const [tab, setTab] = useState<Tab>("letters");
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            ministry.xerxesduane.com
          </p>
          <h1 className="text-2xl font-bold" style={{ color: INK, fontFamily: "Georgia, serif" }}>
            Partner letters
          </h1>
        </div>
        <Btn onClick={() => void api.logout().finally(onOut)}>Sign out</Btn>
      </header>
      <nav className="mt-5 flex gap-1 rounded-full bg-white p-1 shadow-sm">
        {(["letters", "partners", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setOpen(null);
            }}
            className="min-h-10 flex-1 rounded-full text-[0.95rem] font-bold capitalize transition"
            style={tab === t ? { background: INK, color: "#fff" } : { color: SOFT }}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="mt-5">
        {tab === "letters" && (open ? <Editor id={open} onClose={() => setOpen(null)} /> : <Letters onOpen={setOpen} />)}
        {tab === "partners" && <Partners />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Letters list
// ---------------------------------------------------------------------------

function Letters({ onOpen }: { onOpen: (id: string) => void }) {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .issues()
      .then((r) => setIssues(r.issues))
      .catch((e) => setError(msg(e)));
  }, []);
  const create = async () => {
    try {
      onOpen((await api.newIssue()).issue.id);
    } catch (e) {
      setError(msg(e));
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: SOFT }}>
          Each partner gets a private, encrypted copy that disappears after {LIFESPAN_DAYS} days.
        </p>
        <Btn kind="primary" onClick={() => void create()}>
          + New letter
        </Btn>
      </div>
      <Err>{error}</Err>
      {!issues && !error && <p style={{ color: SOFT }}>Loading…</p>}
      {issues?.length === 0 && <Box className="text-center"><p style={{ color: SOFT }}>No letters yet. Start your first one.</p></Box>}
      {issues?.map((i) => (
        <button key={i.id} type="button" onClick={() => onOpen(i.id)} className="block w-full text-left">
          <Box className="transition hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-bold" style={{ color: INK, fontFamily: "Georgia, serif" }}>
                  {i.draft.title || "Untitled letter"}
                </p>
                <p className="mt-0.5 text-sm" style={{ color: SOFT }}>
                  {i.status === "sent" && i.sent
                    ? `Sent ${fmtTime(i.sent.at)} to ${i.sent.count} · expires ${fmtTime(i.sent.expiresAt)}`
                    : i.status === "scheduled"
                      ? `Sends ${fmtDay(i.sendOn)}, 09:15 Dubai`
                      : `Draft · edited ${fmtTime(i.modified)}`}
                </p>
              </div>
              <StatusPill status={i.status} />
            </div>
          </Box>
        </button>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: Issue["status"] }) {
  const c = { draft: ["#efe9df", SOFT], scheduled: ["#fdf0dc", "#8a5a0e"], sent: ["#e3eedf", "#3b6b35"] }[status];
  return (
    <span className="shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ background: c[0], color: c[1] }}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

function Editor({ id, onClose }: { id: string; onClose: () => void }) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sendOn, setSendOn] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [view, setView] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  // The preview's "sent" date: when the editor opened (a pure value for render).
  const [openedAt] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([api.issue(id), api.settings()]);
    setIssue(r.issue);
    setReaders(r.readers);
    setDraft(r.issue.draft);
    setSendOn(r.issue.sendOn);
    setSettings(s.settings);
    setDirty(false);
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open; load() sets state only once the network answers
    load().catch((e) => setError(msg(e)));
  }, [load]);

  const edit = (patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await fn();
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  };

  const save = (status?: "draft" | "scheduled") =>
    run(async () => {
      if (!draft) return;
      const r = await api.saveIssue(id, { draft, sendOn, ...(status ? { status } : {}) });
      setIssue(r.issue);
      setDirty(false);
      setNote(status === "scheduled" ? `Scheduled for ${fmtDay(r.issue.sendOn)}.` : status === "draft" ? "Unscheduled. It's a draft again." : "Saved.");
    });

  const send = (test: boolean) =>
    run(async () => {
      if (!draft) return;
      if (!test && !window.confirm("Send this letter to every active partner now? It can't be edited after sending.")) return;
      if (dirty) await api.saveIssue(id, { draft, sendOn });
      const r = await api.send(id, test);
      if (test) setNote(`A test copy is on its way to your inbox (expires ${fmtTime(r.expiresAt)}).`);
      else {
        await load();
        setNote(`Sent to ${r.sent} partners.`);
      }
    });

  const addPhotos = (files: FileList | null) =>
    run(async () => {
      if (!files || !draft) return;
      const add: Draft["images"] = [];
      for (const f of Array.from(files).slice(0, 8 - draft.images.length)) {
        const data = await resizePhoto(f);
        const { id: imgId } = await api.upload(id, data);
        add.push({ id: imgId, caption: "" });
      }
      const next = { ...draft, images: [...draft.images, ...add] };
      setDraft(next);
      await api.saveIssue(id, { draft: next });
    });

  const preview = useMemo(() => {
    if (!draft || !settings) return null;
    const d = draft.giving.url ? draft : { ...draft, giving: { url: settings.givingUrl, label: settings.givingLabel } };
    const now = issue?.sent?.at ?? openedAt;
    return renderLetter(d, { name: "Beat Baumann", hello: "Beat" }, { sender: settings.sender, sentAt: now, expiresAt: now + LIFESPAN_DAYS * 864e5 });
  }, [draft, settings, issue, openedAt]);

  if (error && !issue) return <Err>{error}</Err>;
  if (!issue || !draft || !preview) return <p style={{ color: SOFT }}>Loading…</p>;
  const sent = issue.status === "sent";
  const photo = (imgId: string) => `/api/letters/image?issue=${id}&img=${imgId}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Btn onClick={onClose}>‹ All letters</Btn>
        <div className="flex gap-1 rounded-full bg-white p-1 shadow-sm">
          {(["write", "preview"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className="min-h-9 rounded-full px-4 text-sm font-bold capitalize" style={view === v ? { background: INK, color: "#fff" } : { color: SOFT }}>
              {v === "write" ? (sent ? "Details" : "Write") : "Preview"}
            </button>
          ))}
        </div>
      </div>

      {view === "preview" && (
        <Box className="!px-5 !py-10 sm:!px-10">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: SOFT }}>
            Preview as Beat Baumann would see it
          </p>
          <LetterView letter={preview} photo={sent ? () => undefined : photo} />
        </Box>
      )}

      {view === "write" && sent && issue.sent && <SentPanel issue={issue} readers={readers} onChange={() => void load()} />}

      {view === "write" && !sent && (
        <>
          <Box className="space-y-4">
            <Label text="Title" hint="Also the email subject. {{hello}} becomes each partner's first name.">
              <input className={`${inputCls} text-lg font-bold`} value={draft.title} maxLength={140} onChange={(e) => edit({ title: e.target.value })} placeholder="October: new doors in Bern" />
            </Label>
          </Box>

          {draft.sections.map((s, i) => (
            <Box key={i} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: ACCENT }}>
                  Section {i + 1}
                </p>
                <div className="flex gap-1 text-sm font-semibold" style={{ color: SOFT }}>
                  {i > 0 && (
                    <button type="button" className="rounded-full px-2 py-1 hover:bg-[#f2ede4]" onClick={() => edit({ sections: swap(draft.sections, i, i - 1) })} aria-label="Move up">
                      ↑
                    </button>
                  )}
                  {i < draft.sections.length - 1 && (
                    <button type="button" className="rounded-full px-2 py-1 hover:bg-[#f2ede4]" onClick={() => edit({ sections: swap(draft.sections, i, i + 1) })} aria-label="Move down">
                      ↓
                    </button>
                  )}
                  {draft.sections.length > 1 && (
                    <button type="button" className="rounded-full px-2 py-1 text-red-700 hover:bg-red-50" onClick={() => edit({ sections: draft.sections.filter((_, j) => j !== i) })}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input className={inputCls} value={s.heading} placeholder={i === 0 ? "Heading (optional)" : "Heading, e.g. What God is doing"} onChange={(e) => edit({ sections: draft.sections.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)) })} />
              <textarea
                className={`${inputCls} min-h-[11rem] resize-y leading-relaxed`}
                value={s.body}
                onChange={(e) => edit({ sections: draft.sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })}
                placeholder="Write freely. A blank line starts a new paragraph."
              />
              {i === 0 && (
                <p className="text-xs" style={{ color: SOFT }}>
                  Formatting: <code>**bold**</code> · <code>*italic*</code> · <code>- bullet</code> · <code>## subheading</code> · <code>&gt; quote</code> · <code>[link](https://…)</code> · <code>{"{{hello}}"}</code> for their name
                </p>
              )}
            </Box>
          ))}
          <Btn onClick={() => edit({ sections: [...draft.sections, { heading: "", body: "" }] })}>+ Add a section</Btn>

          <Box className="space-y-3">
            <p className="font-bold" style={{ color: INK }}>
              Photos <span className="font-normal" style={{ color: SOFT }}>({draft.images.length}/8, shown after the first section)</span>
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {draft.images.map((im, i) => (
                <div key={im.id} className="space-y-1.5">
                  <div className="relative overflow-hidden rounded-xl bg-[#efe9df]" style={{ aspectRatio: "4/3" }}>
                    <img src={photo(im.id)} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => edit({ images: draft.images.filter((_, j) => j !== i) })} className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-sm font-bold text-red-700 shadow" aria-label="Remove photo">
                      ✕
                    </button>
                  </div>
                  <input className={`${inputCls} !min-h-9 text-sm`} placeholder="Caption" value={im.caption} onChange={(e) => edit({ images: draft.images.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })} />
                </div>
              ))}
            </div>
            {draft.images.length < 8 && (
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-dashed border-[#c9bfae] px-5 text-[0.95rem] font-bold" style={{ color: INK }}>
                + Add photos
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void addPhotos(e.target.files)} />
              </label>
            )}
          </Box>

          <Box className="space-y-3">
            <Label text="Prayer requests" hint="One per line. They show as a list under “Please pray with us”.">
              <textarea className={`${inputCls} min-h-[7rem] resize-y`} value={draft.prayer.join("\n")} onChange={(e) => edit({ prayer: e.target.value.split("\n") })} placeholder={"For open doors with the churches in Bern\nFor rest and health for the team"} />
            </Label>
          </Box>

          <Box className="grid gap-3 sm:grid-cols-2">
            <Label text="Giving link" hint={settings?.givingUrl ? `Empty uses your default: ${settings.givingUrl}` : "Optional. Set a default in Settings."}>
              <input className={inputCls} value={draft.giving.url} onChange={(e) => edit({ giving: { ...draft.giving, url: e.target.value } })} placeholder="https://…" />
            </Label>
            <Label text="Button text">
              <input className={inputCls} value={draft.giving.label} onChange={(e) => edit({ giving: { ...draft.giving, label: e.target.value } })} placeholder={settings?.givingLabel || "Support the work"} />
            </Label>
          </Box>

          <Box className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <Label text="Send on" hint={`Sends at 09:15 Dubai time. Your monthly day is the ${ordinal(settings?.sendDay ?? 1)}.`}>
                <input type="date" className={`${inputCls} w-auto`} value={sendOn} onChange={(e) => {
                  setSendOn(e.target.value);
                  setDirty(true);
                }} />
              </Label>
              <StatusPill status={issue.status} />
            </div>
            <Err>{error}</Err>
            {note && <p className="text-sm font-semibold" style={{ color: "#3b6b35" }}>{note}</p>}
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => void save()} disabled={busy}>
                {dirty ? "Save draft" : "Saved"}
              </Btn>
              <Btn onClick={() => void send(true)} disabled={busy}>
                Send me a test
              </Btn>
              {issue.status === "scheduled" ? (
                <Btn onClick={() => void save("draft")} disabled={busy}>
                  Unschedule
                </Btn>
              ) : (
                <Btn kind="primary" onClick={() => void save("scheduled")} disabled={busy}>
                  Schedule
                </Btn>
              )}
              <Btn onClick={() => void send(false)} disabled={busy}>
                Send now
              </Btn>
              <Btn
                kind="danger"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (!window.confirm("Delete this draft and its photos?")) return;
                    await api.deleteIssue(id);
                    onClose();
                  })
                }
              >
                Delete
              </Btn>
            </div>
          </Box>
        </>
      )}
    </div>
  );
}

function SentPanel({ issue, readers, onChange }: { issue: Issue; readers: Reader[]; onChange: () => void }) {
  const [error, setError] = useState("");
  const opened = readers.filter((r) => r.opened).length;
  const sent = issue.sent!;
  return (
    <Box className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Sent to" value={String(sent.count)} />
        <Stat label="Opened" value={`${opened}`} />
        <Stat label="Expires" value={new Date(sent.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} />
      </div>
      <ul className="divide-y divide-[#efe9df]">
        {readers.map((r) => (
          <li key={r.copyId} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-semibold" style={{ color: INK }}>
                {r.partner}
              </p>
              <p className="text-sm" style={{ color: SOFT }}>
                {r.opened ? `Opened ${fmtTime(r.opened)}` : "Not opened yet"}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
              onClick={() => {
                if (!window.confirm(`Withdraw ${r.partner}'s copy? Their link stops working right away.`)) return;
                api.revoke(issue.id, r.copyId).then(onChange, (e) => setError(msg(e)));
              }}
            >
              Withdraw
            </button>
          </li>
        ))}
      </ul>
      <Err>{error}</Err>
      <Btn
        kind="danger"
        onClick={() => {
          if (!window.confirm("Withdraw every copy of this letter now? All links stop working.")) return;
          api.revokeAll(issue.id).then(onChange, (e) => setError(msg(e)));
        }}
      >
        Withdraw from everyone
      </Btn>
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#faf8f4] px-2 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: SOFT }}>
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums" style={{ color: INK }}>
        {value}
      </p>
    </div>
  );
}

function swap<T>(a: T[], i: number, j: number): T[] {
  const b = [...a];
  [b[i], b[j]] = [b[j], b[i]];
  return b;
}

function ordinal(n: number) {
  return `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
}

// ---------------------------------------------------------------------------
// Partners
// ---------------------------------------------------------------------------

function Partners() {
  const [list, setList] = useState<Partner[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hello, setHello] = useState("");
  const [bulk, setBulk] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const load = useCallback(() => api.partners().then((r) => setList(r.partners), (e) => setError(msg(e))), []);
  useEffect(() => {
    void load();
  }, [load]);

  const add = async (rows: Partial<Partner>[]) => {
    setError("");
    setNote("");
    try {
      const r = await api.addPartners(rows);
      setNote(`Added ${r.added}.${r.skipped.length ? ` Skipped: ${r.skipped.join(" ")}` : ""}`);
      await load();
      return true;
    } catch (e) {
      setError(msg(e));
      return false;
    }
  };

  const active = list?.filter((p) => p.active).length ?? 0;
  return (
    <div className="space-y-4">
      <Box className="space-y-3">
        <p className="font-bold" style={{ color: INK }}>
          Add a partner
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={inputCls} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputCls} placeholder="Greeting, e.g. Beat (optional)" value={hello} onChange={(e) => setHello(e.target.value)} />
        </div>
        <Btn
          kind="primary"
          onClick={() =>
            void add([{ name, email, hello }]).then((ok) => {
              if (ok) {
                setName("");
                setEmail("");
                setHello("");
              }
            })
          }
        >
          Add partner
        </Btn>
        <details className="pt-1">
          <summary className="cursor-pointer text-sm font-semibold" style={{ color: ACCENT }}>
            Add many at once
          </summary>
          <textarea className={`${inputCls} mt-2 min-h-[7rem] font-mono text-sm`} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"One per line: Name, email, greeting\nBeat Baumann, bb@gcn.live, Beat\nAnna Meier, anna@example.ch"} />
          <Btn
            className="mt-2"
            onClick={() =>
              void add(
                bulk
                  .split("\n")
                  .map((l) => l.split(/[,;\t]/).map((x) => x.trim()))
                  .filter((c) => c[0])
                  .map(([n, e, h]) => ({ name: n, email: e, hello: h })),
              ).then((ok) => ok && setBulk(""))
            }
          >
            Add all
          </Btn>
        </details>
        <Err>{error}</Err>
        {note && <p className="text-sm font-semibold" style={{ color: "#3b6b35" }}>{note}</p>}
      </Box>

      <Box>
        <p className="font-bold" style={{ color: INK }}>
          {list ? `${list.length} partners · ${active} receive letters` : "Loading…"}
        </p>
        <ul className="mt-2 divide-y divide-[#efe9df]">
          {list?.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-semibold" style={{ color: p.active ? INK : SOFT }}>
                  {p.name} <span className="font-normal" style={{ color: SOFT }}>· “Dear {p.hello}”</span>
                </p>
                <p className="truncate text-sm" style={{ color: SOFT }}>
                  {p.email}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" className="rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-[#f2ede4]" style={{ color: INK }} onClick={() => void api.savePartner({ ...p, active: !p.active }).then(load)}>
                  {p.active ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                  onClick={() => window.confirm(`Remove ${p.name}?`) && void api.deletePartner(p.id).then(load)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Box>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function SettingsTab() {
  const [s, setS] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.settings().then((r) => setS(r.settings), (e) => setError(msg(e)));
  }, []);
  if (!s) return error ? <Err>{error}</Err> : <p style={{ color: SOFT }}>Loading…</p>;
  const set = (patch: Partial<Settings>) => {
    setS({ ...s, ...patch });
    setSaved(false);
  };
  return (
    <Box className="space-y-4">
      <Label text="Your name, as partners see it">
        <input className={inputCls} value={s.sender} onChange={(e) => set({ sender: e.target.value })} />
      </Label>
      <Label text="Monthly send day" hint="New letters are scheduled for this day of the month, at 09:15 Dubai time.">
        <input className={`${inputCls} w-28`} type="number" min={1} max={28} value={s.sendDay} onChange={(e) => set({ sendDay: Number(e.target.value) })} />
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label text="Default giving link">
          <input className={inputCls} value={s.givingUrl} onChange={(e) => set({ givingUrl: e.target.value })} placeholder="https://…" />
        </Label>
        <Label text="Default button text">
          <input className={inputCls} value={s.givingLabel} onChange={(e) => set({ givingLabel: e.target.value })} />
        </Label>
      </div>
      <Label text="Replies go to" hint="Empty uses hi@xerxesduane.com.">
        <input className={inputCls} type="email" value={s.replyTo} onChange={(e) => set({ replyTo: e.target.value })} />
      </Label>
      <Err>{error}</Err>
      <Btn
        kind="primary"
        onClick={() =>
          void api.saveSettings(s).then(
            (r) => {
              setS(r.settings);
              setSaved(true);
              setError("");
            },
            (e) => setError(e instanceof ApiError ? e.message : msg(e)),
          )
        }
      >
        {saved ? "Saved" : "Save settings"}
      </Btn>
    </Box>
  );
}
