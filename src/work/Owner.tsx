/**
 * The owner's screen: sign in, run the timer, add or fix entries, and manage
 * the client's link. Built for a phone held in one hand: the timer and its
 * button sit at the top, the month's log below.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ApiError, api, type Entry, type OwnerData, type Settings } from "./api";
import { Button, Card, ErrorNote, Field, MonthLog, Sheet, TextArea, TextInput, TotalTile } from "./ui";
import { DAY, HOUR, TZ_LABEL, dateInput, fmtClock, monthKey, monthStart, rangeFromInputs, shiftMonth, timeInput, totalsFor, weekStart } from "./time";

type State =
  | { kind: "loading" }
  | { kind: "off"; message: string }
  | { kind: "login" }
  | { kind: "ready"; data: OwnerData; skew: number }
  | { kind: "error"; message: string };

export default function Owner() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const s = await api.session();
      if (!s.configured) {
        setState({ kind: "off", message: "The hours log isn't switched on yet. Set WORK_PASSWORD in Vercel, then redeploy." });
        return;
      }
      if (!s.authed) {
        setState({ kind: "login" });
        return;
      }
      const data = await api.data();
      setState({ kind: "ready", data, skew: data.now - Date.now() });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setState({ kind: "login" });
      else setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't load your hours." });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; load() only sets state once the network answers
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {state.kind === "loading" && <p className="py-20 text-center text-fg-soft">Loading…</p>}
      {state.kind === "off" && <Card className="mt-10">{state.message}</Card>}
      {state.kind === "error" && (
        <Card className="mt-10 space-y-3">
          <ErrorNote>{state.message}</ErrorNote>
          <Button kind="primary" onClick={() => void load()}>
            Try again
          </Button>
        </Card>
      )}
      {state.kind === "login" && <Login onDone={() => void load()} />}
      {state.kind === "ready" && (
        <Log
          data={state.data}
          skew={state.skew}
          setData={(fn) => setState((s) => (s.kind === "ready" ? { ...s, data: fn(s.data) } : s))}
          onSignedOut={() => setState({ kind: "login" })}
          reload={load}
        />
      )}
    </main>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login(email, password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-10">
      <h1 className="font-display text-3xl font-bold text-fg">Work log</h1>
      <p className="mt-1 text-[0.98rem] text-fg-soft">Sign in to log your hours.</p>
      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <TextInput type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <TextInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <Button kind="primary" type="submit" disabled={busy} className="w-full">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

type Editing = { mode: "new" } | { mode: "edit"; entry: Entry } | null;

function Log({
  data,
  skew,
  setData,
  onSignedOut,
  reload,
}: {
  data: OwnerData;
  skew: number;
  setData: (fn: (d: OwnerData) => OwnerData) => void;
  onSignedOut: () => void;
  reload: () => Promise<void>;
}) {
  const now = () => Date.now() + skew;
  const [month, setMonth] = useState(() => monthKey(now()));
  const [editing, setEditing] = useState<Editing>(null);
  const [menu, setMenu] = useState(false);
  const [flash, setFlash] = useState("");

  const { entries, settings } = data;
  const week = weekStart(now());
  const thisMonth = monthKey(now());
  const weekMs = totalsFor(entries, week, week + 7 * DAY);
  const monthMs = totalsFor(entries, monthStart(thisMonth), monthStart(shiftMonth(thisMonth, 1)));

  const upsert = (entry: Entry, replacing?: string) =>
    setData((d) => ({ ...d, entries: [...d.entries.filter((e) => e.id !== entry.id && e.id !== replacing), entry] }));

  // A 401 anywhere means the session ended (password changed, or 30 days up).
  const guard = async <T,>(p: Promise<T>): Promise<T> => {
    try {
      return await p;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onSignedOut();
      throw err;
    }
  };

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-fg">Work log</h1>
          <p className="truncate text-[0.95rem] text-fg-soft">
            {settings.client} · {settings.rate.toFixed(2)} {settings.currency}/hr
          </p>
        </div>
        <Button onClick={() => setMenu(true)}>Share &amp; settings</Button>
      </header>

      <TimerCard
        key={data.timer?.start ?? "idle"}
        reload={reload}
        data={data}
        now={now}
        guard={guard}
        onChange={(timer) => setData((d) => ({ ...d, timer }))}
        onSaved={(entry, note) => {
          if (entry) {
            upsert(entry);
            setMonth(monthKey(entry.start));
          }
          setFlash(note ?? (entry ? "Saved to your log." : ""));
        }}
      />
      {flash && (
        <p role="status" className="mt-2 text-center text-[0.95rem] font-semibold text-accent-deep">
          {flash}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <TotalTile label="This week" ms={weekMs} settings={settings} />
        <TotalTile label="This month" ms={monthMs} settings={settings} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-fg-soft">Your log</h2>
        <Button kind="ghost" onClick={() => setEditing({ mode: "new" })}>
          + Add time
        </Button>
      </div>
      <div className="mt-3">
        <MonthLog
          entries={entries}
          settings={settings}
          month={month}
          setMonth={setMonth}
          current={thisMonth}
          onEdit={(entry) => setEditing({ mode: "edit", entry })}
          emptyText="Nothing logged yet. Press Start when you begin, or add time by hand."
        />
      </div>
      <p className="mt-6 text-center text-sm text-fg-faint">Times are in {TZ_LABEL}.</p>

      {editing && (
        <EntryEditor
          entry={editing.mode === "edit" ? editing.entry : null}
          now={now}
          onClose={() => setEditing(null)}
          onSave={async (fields) => {
            const res = await guard(
              editing.mode === "edit" ? api.updateEntry({ ...fields, id: editing.entry.id }) : api.addEntry(fields),
            );
            upsert(res.entry, editing.mode === "edit" ? editing.entry.id : undefined);
            setMonth(monthKey(res.entry.start));
            setEditing(null);
          }}
          onDelete={
            editing.mode === "edit"
              ? async () => {
                  await guard(api.deleteEntry(editing.entry.id));
                  setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== editing.entry.id) }));
                  setEditing(null);
                }
              : undefined
          }
        />
      )}

      {menu && (
        <SettingsSheet
          data={data}
          onClose={() => setMenu(false)}
          guard={guard}
          onSettings={(s) => setData((d) => ({ ...d, settings: s }))}
          onToken={(t) => setData((d) => ({ ...d, shareToken: t }))}
          onSignOut={async () => {
            await api.logout().catch(() => undefined);
            onSignedOut();
          }}
          onRefresh={reload}
        />
      )}
    </>
  );
}

const DRAFT = "xd-work-timer-draft";

function readDraft(start: number | undefined): { task: string; notes: string; link: string } | null {
  if (!start) return null;
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) ?? "null");
    return d && d.start === start ? d : null;
  } catch {
    return null;
  }
}

function TimerCard({
  reload,
  data,
  now,
  guard,
  onChange,
  onSaved,
}: {
  reload: () => Promise<void>;
  data: OwnerData;
  now: () => number;
  guard: <T>(p: Promise<T>) => Promise<T>;
  onChange: (t: OwnerData["timer"]) => void;
  onSaved: (entry: Entry | null, note?: string) => void;
}) {
  const timer = data.timer;
  // A draft kept on this device wins over the server copy: it holds whatever
  // was typed after the last successful save.
  const [draft] = useState(() => readDraft(timer?.start));
  const [task, setTask] = useState(draft?.task ?? timer?.task ?? "");
  const [notes, setNotes] = useState(draft?.notes ?? timer?.notes ?? "");
  const [link, setLink] = useState(draft?.link ?? timer?.link ?? "");
  const stopping = useRef(false);

  useEffect(() => {
    if (!timer) return;
    try {
      localStorage.setItem(DRAFT, JSON.stringify({ start: timer.start, task, notes, link }));
    } catch {
      /* private mode: the server copy still saves on blur */
    }
  }, [timer, task, notes, link]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, tick] = useState(0);

  useEffect(() => {
    if (!timer) return;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [timer]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      try {
        const res = await guard(api.timer("start", { task, notes, link }));
        onChange(res.timer);
        onSaved(null, "");
      } catch (err) {
        // Already running on another device: show that timer instead.
        if (err instanceof ApiError && err.status === 409) return void (await reload());
        throw err;
      }
    });

  // Saved as you leave each field, so a closed tab never loses the notes.
  const persist = () => {
    if (!timer) return;
    if (task === timer.task && notes === timer.notes && link === timer.link) return;
    const started = timer.start;
    void guard(api.timer("update", { task, notes, link }))
      .then((res) => {
        // A stop that finished first wins; don't bring the timer back.
        if (!stopping.current && res.timer?.start === started) onChange(res.timer);
      })
      .catch((err) => {
        if (!stopping.current) setError(`Notes not saved to the server yet (${err instanceof Error ? err.message : "error"}). They're kept on this phone.`);
      });
  };

  const stop = () =>
    run(async () => {
      if (!task.trim()) {
        setError("Say what you worked on before you stop.");
        return;
      }
      stopping.current = true;
      let res;
      try {
        res = await guard(api.timer("stop", { task, notes, link }));
      } catch (err) {
        stopping.current = false;
        throw err;
      }
      try {
        localStorage.removeItem(DRAFT);
      } catch {
        /* nothing kept */
      }
      onChange(null);
      setTask("");
      setNotes("");
      setLink("");
      onSaved(res.entry ?? null, res.note);
    });

  const discard = () =>
    run(async () => {
      if (!window.confirm("Throw away this running time? Nothing will be saved.")) return;
      stopping.current = true;
      await guard(api.timer("discard"));
      try {
        localStorage.removeItem(DRAFT);
      } catch {
        /* nothing kept */
      }
      onChange(null);
      setTask("");
      setNotes("");
      setLink("");
      onSaved(null, "Timer cleared.");
    });

  const elapsed = timer ? now() - timer.start : 0;

  return (
    <Card className="mt-5">
      {timer ? (
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-accent-deep">Working now</p>
          <p className="mt-1 font-display text-5xl font-bold tabular-nums text-fg" aria-live="off">
            {fmtClock(elapsed)}
          </p>
          {elapsed > 10 * HOUR && (
            <p className="mt-2 text-[0.95rem] text-fg-soft">
              Running a long time. If you forgot to stop, discard it and add the real time by hand.
            </p>
          )}
        </div>
      ) : (
        <p className="text-[0.98rem] font-bold text-fg">Start the timer when you begin.</p>
      )}

      <div className="mt-4 space-y-3">
        <Field label="What I'm working on">
          <TextInput value={task} onChange={(e) => setTask(e.target.value)} onBlur={persist} maxLength={120} placeholder="e.g. Directory page fixes" />
        </Field>
        {timer && (
          <>
            <Field label="Notes: what I did or built">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={persist} maxLength={2000} />
            </Field>
            <Field label="Link (optional)">
              <TextInput type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} onBlur={persist} placeholder="https://" />
            </Field>
          </>
        )}
        <ErrorNote>{error}</ErrorNote>
        {timer ? (
          <div className="flex gap-2">
            <Button kind="accent" onClick={() => void stop()} disabled={busy} className="flex-1 text-lg">
              Stop &amp; save
            </Button>
            <Button kind="ghost" onClick={() => void discard()} disabled={busy}>
              Discard
            </Button>
          </div>
        ) : (
          <Button kind="primary" onClick={() => void start()} disabled={busy} className="w-full text-lg">
            Start
          </Button>
        )}
      </div>
    </Card>
  );
}

function EntryEditor({
  entry,
  now,
  onClose,
  onSave,
  onDelete,
}: {
  entry: Entry | null;
  now: () => number;
  onClose: () => void;
  onSave: (fields: Omit<Entry, "id"> & { key?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [key] = useState(() => Math.random().toString(36).slice(2, 14).padEnd(12, "0"));
  const [date, setDate] = useState(dateInput(entry?.start ?? now()));
  const [start, setStart] = useState(entry ? timeInput(entry.start) : "");
  const [end, setEnd] = useState(entry ? timeInput(entry.end) : "");
  const [task, setTask] = useState(entry?.task ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [link, setLink] = useState(entry?.link ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const range = useMemo(() => (start && end ? rangeFromInputs(date, start, end) : null), [date, start, end]);
  const preview = range && typeof range !== "string" ? `${((range.end - range.start) / HOUR).toFixed(2)} h${end < start ? ", ends the next day" : ""}` : "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let r = rangeFromInputs(date, start, end);
    if (typeof r === "string") return setError(r);
    // Times untouched: keep the stored instants exactly.
    if (entry && date === dateInput(entry.start) && start === timeInput(entry.start) && end === timeInput(entry.end)) {
      r = { start: entry.start, end: entry.end };
    }
    if (!task.trim()) return setError("Say what you worked on.");
    setBusy(true);
    setError("");
    try {
      await onSave({ ...r, task: task.trim(), notes: notes.trim(), link: link.trim(), key });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!onDelete || !window.confirm("Delete this entry from your log?")) return;
    setBusy(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that.");
      setBusy(false);
    }
  };

  return (
    <Sheet title={entry ? "Edit time" : "Add time"} onClose={onClose} locked={busy}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </Field>
          <Field label="End">
            <TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </Field>
        </div>
        {preview && <p className="text-[0.95rem] font-semibold tabular-nums text-accent-deep">{preview}</p>}
        <Field label="What I worked on">
          <TextInput value={task} onChange={(e) => setTask(e.target.value)} maxLength={120} required placeholder="e.g. Directory page fixes" />
        </Field>
        <Field label="Notes: what I did or built">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </Field>
        <Field label="Link (optional)">
          <TextInput type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button kind="primary" type="submit" disabled={busy} className="flex-1">
            {busy ? "Saving…" : "Save"}
          </Button>
          {onDelete && (
            <Button kind="danger" onClick={() => void remove()} disabled={busy}>
              Delete
            </Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}

function SettingsSheet({
  data,
  onClose,
  guard,
  onSettings,
  onToken,
  onSignOut,
  onRefresh,
}: {
  data: OwnerData;
  onClose: () => void;
  guard: <T>(p: Promise<T>) => Promise<T>;
  onSettings: (s: Settings) => void;
  onToken: (t: string) => void;
  onSignOut: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const link = `${window.location.origin}/r/${data.shareToken}`;
  const [name, setName] = useState(data.settings.name);
  const [client, setClient] = useState(data.settings.client);
  const [rate, setRate] = useState(String(data.settings.rate));
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [mailed, setMailed] = useState("");

  const sendInvoice = async (period: "last" | "current") => {
    if (!window.confirm("Email this invoice to GCN (bb@gcn.live) now?")) return;
    setBusy(true);
    setError("");
    setMailed("");
    try {
      const res = await guard(api.emailInvoice(period));
      setMailed(`Sent ${res.sent} to ${res.to.join(", ")}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the invoice.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", link);
    }
  };

  const rotate = async () => {
    if (!window.confirm("Make a new link? The old one stops working right away, so you'll need to send the new one.")) return;
    setBusy(true);
    try {
      const res = await guard(api.rotateLink());
      onToken(res.shareToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't make a new link.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await guard(api.saveSettings({ name, client, rate: Number(rate) }));
      onSettings(res.settings);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Share & settings" onClose={onClose}>
      <div className="space-y-6">
        <section>
          <h3 className="font-bold text-fg">Link for {data.settings.client}</h3>
          <p className="mt-1 text-[0.95rem] text-fg-soft">
            Anyone with this link can see your hours, notes and totals. They can't change anything.
          </p>
          <p className="mt-2 break-all rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm text-fg">{link}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button kind="primary" onClick={() => void copy()}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[0.95rem] font-bold text-fg hover:bg-panel-alt">
              See what they see
            </a>
            <Button kind="ghost" onClick={() => void rotate()} disabled={busy}>
              Make a new link
            </Button>
          </div>
        </section>

        <section className="border-t border-line pt-5">
          <h3 className="font-bold text-fg">Invoices</h3>
          <p className="mt-1 text-[0.95rem] text-fg-soft">
            Emailed to bb@gcn.live automatically on the 15th and the 30th, at 23:00 Dubai time, for the hours since the last one.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href="/api/work/invoice?p=last" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[0.95rem] font-bold text-fg hover:bg-panel-alt">
              Last invoice
            </a>
            <a href="/api/work/invoice?p=current" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[0.95rem] font-bold text-fg hover:bg-panel-alt">
              Current period so far
            </a>
            <Button kind="ghost" onClick={() => void sendInvoice("last")} disabled={busy}>
              Email last invoice now
            </Button>
          </div>
          {mailed && <p className="mt-2 text-[0.95rem] font-semibold text-accent-deep">{mailed}</p>}
        </section>

        <form onSubmit={save} className="space-y-3 border-t border-line pt-5">
          <h3 className="font-bold text-fg">Details</h3>
          <Field label="Your name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          </Field>
          <Field label="Client">
            <TextInput value={client} onChange={(e) => setClient(e.target.value)} maxLength={80} required />
          </Field>
          <Field label={`Hourly rate (${data.settings.currency})`} hint="Changing it recalculates every total, past ones included.">
            <TextInput type="number" inputMode="decimal" min="0.01" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          {saved && <p className="text-[0.95rem] font-semibold text-accent-deep">Saved.</p>}
          <Button kind="primary" type="submit" disabled={busy}>
            Save details
          </Button>
        </form>

        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          <Button onClick={() => void onRefresh()}>Refresh</Button>
          <Button kind="danger" onClick={() => void onSignOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
