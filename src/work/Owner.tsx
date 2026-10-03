/**
 * The owner's screen: sign in, run the timer, add or fix entries, and manage
 * the client's link. Built for a phone held in one hand: the timer and its
 * button sit at the top, the month's log below.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ApiError, api, type Entry, type OwnerData, type Settings } from "./api";
import { Button, Card, DownloadLink, ErrorNote, Field, MonthLog, Sheet, TextArea, TextInput, TotalTile } from "./ui";
import { DAY, HOUR, TZ_LABEL, dateInput, fmtClock, fmtDay, fmtMonth, fmtTime, monthKey, monthStart, rangeFromInputs, shiftMonth, timeInput, totalsFor, weekStart } from "./time";
import { overlapIds, overlapping } from "./overlap";
import { InvoicesSheet, SummarySheet, TrashList } from "./Sheets";
import { money } from "./invoices";

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
  const [invoices, setInvoices] = useState(false);
  const [note, setNote] = useState(false);
  const [flash, setFlash] = useState("");
  // The entry just deleted, so one tap brings it back.
  const [undo, setUndo] = useState<Entry | null>(null);

  const { entries, settings } = data;
  const week = weekStart(now());
  const thisMonth = monthKey(now());
  const weekMs = totalsFor(entries, week, week + 7 * DAY);
  const monthMs = totalsFor(entries, monthStart(thisMonth), monthStart(shiftMonth(thisMonth, 1)));

  const upsert = (entry: Entry, replacing?: string) =>
    setData((d) => ({ ...d, entries: [...d.entries.filter((e) => e.id !== entry.id && e.id !== replacing), entry] }));
  const flagged = useMemo(() => overlapIds(entries), [entries]);
  const summary = data.summaries[month];

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
          {undo && (
            <>
              {" "}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => {
                  const e = undo;
                  setUndo(null);
                  setFlash("");
                  void guard(api.restore(e.id))
                    .then((res) => {
                      upsert(res.entry);
                      setData((d) => ({ ...d, trash: res.trash }));
                      setMonth(monthKey(res.entry.start));
                      setFlash("Put back.");
                    })
                    .catch((err) => setFlash(err instanceof Error ? err.message : "Couldn't put it back."));
                }}
              >
                Undo
              </button>
            </>
          )}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <TotalTile label="This week" ms={weekMs} settings={settings} />
        <TotalTile label="This month" ms={monthMs} settings={settings} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setInvoices(true)} className="min-w-0 rounded-2xl border border-line bg-panel px-4 py-3 text-left hover:bg-panel-alt">
          <p className="text-sm font-bold text-fg-soft">Owed by {settings.client}</p>
          <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-fg">{money(data.owed.total, settings.currency)}</p>
          <p className="text-[0.95rem] font-semibold text-accent-deep">
            {data.owed.count === 0 ? "All paid · Invoices" : `${data.owed.count} unpaid · Invoices`}
          </p>
        </button>
        <button type="button" onClick={() => setNote(true)} className="min-w-0 rounded-2xl border border-line bg-panel px-4 py-3 text-left hover:bg-panel-alt">
          <p className="text-sm font-bold text-fg-soft">Note for {settings.client}</p>
          <p className="mt-0.5 truncate font-display text-lg font-bold text-fg">{fmtMonth(month).split(" ")[0]}</p>
          <p className="truncate text-[0.95rem] font-semibold text-accent-deep">{summary ? "Written · edit" : "Delivered / next / decide"}</p>
        </button>
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
          flagged={flagged}
          onEdit={(entry) => setEditing({ mode: "edit", entry })}
          emptyText="Nothing logged yet. Press Start when you begin, or add time by hand."
        />
      </div>
      {flagged.size > 0 && entries.some((e) => flagged.has(e.id) && monthKey(e.start) === month) && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-[0.95rem] text-red-800">
          Some entries this month overlap each other, so the same minutes would be billed twice. Tap one marked Overlaps to fix it.
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <DownloadLink href={`/api/work/pdf?kind=log&m=${month}`}>Download {fmtMonth(month)} (PDF)</DownloadLink>
        <DownloadLink href={`/api/work/pdf?kind=year&y=${month.slice(0, 4)}`}>Year statement {month.slice(0, 4)} (PDF)</DownloadLink>
      </div>
      <p className="mt-4 text-center text-sm text-fg-faint">Times are in {TZ_LABEL}.</p>

      {editing && (
        <EntryEditor
          entry={editing.mode === "edit" ? editing.entry : null}
          entries={entries}
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
                  const gone = editing.entry;
                  await guard(api.deleteEntry(gone.id));
                  setData((d) => ({
                    ...d,
                    entries: d.entries.filter((e) => e.id !== gone.id),
                    trash: [{ entry: gone, deletedAt: Date.now() }, ...d.trash.filter((t) => t.entry.id !== gone.id)],
                  }));
                  setEditing(null);
                  setUndo(gone);
                  setFlash("Deleted. It waits in the trash for 90 days.");
                }
              : undefined
          }
        />
      )}

      {invoices && (
        <InvoicesSheet
          invoices={data.invoices}
          owed={data.owed}
          guard={guard}
          onChange={(inv, owed) => setData((d) => ({ ...d, invoices: inv, owed }))}
          onClose={() => setInvoices(false)}
        />
      )}

      {note && (
        <SummarySheet
          month={month}
          client={settings.client}
          summary={summary}
          guard={guard}
          onSaved={(summaries) => setData((d) => ({ ...d, summaries }))}
          onClose={() => setNote(false)}
        />
      )}

      {menu && (
        <SettingsSheet
          data={data}
          onClose={() => setMenu(false)}
          guard={guard}
          onSettings={(s) => setData((d) => ({ ...d, settings: s }))}
          onToken={(t) => setData((d) => ({ ...d, shareToken: t }))}
          onRestored={(entry) => {
            upsert(entry);
            setMonth(monthKey(entry.start));
          }}
          onTrash={(trash) => setData((d) => ({ ...d, trash }))}
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

  const stop = (end?: number) =>
    run(async () => {
      if (!task.trim()) {
        setError("Say what you worked on before you stop.");
        return;
      }
      stopping.current = true;
      let res;
      try {
        res = await guard(api.timer("stop", { task, notes, link, ...(end === undefined ? {} : { end }) }));
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
  // "I stopped earlier": the end time typed in, or null while closed.
  const [earlier, setEarlier] = useState<string | null>(null);

  // The most recent entry, to pick up where the last session left off.
  const last = useMemo(() => (data.entries.length ? data.entries.reduce((a, b) => (b.end > a.end ? b : a)) : null), [data.entries]);
  const continueLast = () =>
    run(async () => {
      if (!last) return;
      setTask(last.task);
      setLink(last.link);
      try {
        const res = await guard(api.timer("start", { task: last.task, notes: "", link: last.link }));
        onChange(res.timer);
        onSaved(null, "");
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) return void (await reload());
        throw err;
      }
    });

  return (
    <Card className="mt-5">
      {timer ? (
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-accent-deep">Working now</p>
          <p className="mt-1 font-display text-5xl font-bold tabular-nums text-fg" aria-live="off">
            {fmtClock(elapsed)}
          </p>
          {elapsed > 6 * HOUR && !earlier && (
            <p className="mt-2 text-[0.95rem] text-fg-soft">
              Running a long time. If you forgot to stop it, use <strong>I stopped earlier</strong> below.
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
            <Field label="Notes: what I did or built" hint="One point per line. Each line shows as its own bullet.">
              <TextArea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={persist} maxLength={2000} placeholder={"Revised the proposal with Beat's feedback\nWrote the workflow page\nStarted the post type review"} />
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
        ) : null}
        {timer && (
          <div className="text-center">
            {earlier === null ? (
              <button type="button" onClick={() => setEarlier("")} className="text-[0.95rem] font-semibold text-accent-deep underline-offset-2 hover:underline">
                I stopped earlier
              </button>
            ) : (
              <div className="rounded-2xl border border-line bg-canvas p-3 text-left">
                <Field label={`What time did you stop? (started ${timeInput(timer.start)})`}>
                  <TextInput type="time" value={earlier} onChange={(e) => setEarlier(e.target.value)} />
                </Field>
                <div className="mt-2 flex gap-2">
                  <Button
                    kind="primary"
                    disabled={busy || !earlier}
                    onClick={() => {
                      const r = rangeFromInputs(dateInput(timer.start), timeInput(timer.start), earlier);
                      if (typeof r === "string") return setError(r);
                      if (r.end > now()) return setError("That time is still to come. Pick when you actually stopped.");
                      void stop(r.end);
                    }}
                  >
                    Save with this end time
                  </Button>
                  <Button onClick={() => setEarlier(null)} disabled={busy}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {!timer && (
          <Button kind="primary" onClick={() => void start()} disabled={busy} className="w-full text-lg">
            Start
          </Button>
        )}
        {!timer && last && !task.trim() && (
          <button
            type="button"
            onClick={() => void continueLast()}
            disabled={busy}
            className="block w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-left hover:bg-panel-alt disabled:opacity-50"
          >
            <span className="block text-sm font-bold text-accent-deep">Continue last task</span>
            <span className="block truncate text-[0.95rem] font-semibold text-fg">{last.task}</span>
            <span className="block text-sm text-fg-soft">
              last worked {fmtDay(last.start)}, {fmtTime(last.start)}–{fmtTime(last.end)}
            </span>
          </button>
        )}
      </div>
    </Card>
  );
}

function EntryEditor({
  entry,
  entries,
  now,
  onClose,
  onSave,
  onDelete,
}: {
  entry: Entry | null;
  entries: Entry[];
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
  // Other entries these times would run into: the same minutes billed twice.
  const clashes = useMemo(
    () => (range && typeof range !== "string" ? overlapping({ id: entry?.id ?? "", ...range }, entries) : []),
    [range, entries, entry],
  );

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
        {clashes.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[0.95rem] text-red-800">
            <p className="font-bold">Overlaps {clashes.length === 1 ? "another entry" : `${clashes.length} other entries`}:</p>
            <ul className="mt-1 space-y-0.5">
              {clashes.slice(0, 4).map((c) => (
                <li key={c.id} className="truncate">
                  {fmtDay(c.start)} {fmtTime(c.start)}–{fmtTime(c.end)} · {c.task}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-sm">Change the times so the same minutes aren't billed twice, or save anyway if both are right.</p>
          </div>
        )}
        <Field label="What I worked on">
          <TextInput value={task} onChange={(e) => setTask(e.target.value)} maxLength={120} required placeholder="e.g. Directory page fixes" />
        </Field>
        <Field label="Notes: what I did or built" hint="One point per line. Each line shows as its own bullet.">
          <TextArea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder={"Revised the proposal with Beat's feedback\nWrote the workflow page\nStarted the post type review"} />
        </Field>
        <Field label="Link (optional)">
          <TextInput type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button kind="primary" type="submit" disabled={busy} className="flex-1">
            {busy ? "Saving…" : clashes.length ? "Save anyway" : "Save"}
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
  onRestored,
  onTrash,
  onSignOut,
  onRefresh,
}: {
  data: OwnerData;
  onClose: () => void;
  guard: <T>(p: Promise<T>) => Promise<T>;
  onSettings: (s: Settings) => void;
  onToken: (t: string) => void;
  onRestored: (e: Entry) => void;
  onTrash: (t: OwnerData["trash"]) => void;
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
      let res;
      try {
        res = await guard(api.emailInvoice(period));
      } catch (err) {
        // Already sent: say when, and only send the same copy again if asked.
        if (!(err instanceof ApiError && err.status === 409)) throw err;
        if (!window.confirm(`${err.message} Send the same invoice again?`)) return;
        res = await guard(api.emailInvoice(period, true));
      }
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
          <p className="mt-3 text-[0.95rem] text-fg-soft">
            Easy address, opened with the client password (WORK_CLIENT_PASSWORD in Vercel):{" "}
            <a href="/gcn" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-deep underline-offset-2 hover:underline">
              {window.location.host}/gcn
            </a>
            . Changing that password signs everyone out of it; making a new link doesn't.
          </p>
        </section>

        <section className="border-t border-line pt-5">
          <h3 className="font-bold text-fg">Invoices</h3>
          <p className="mt-1 text-[0.95rem] text-fg-soft">
            Emailed to bb@gcn.live automatically once a month, just after midnight (Dubai time) on the 1st, for the month before. A sent invoice is saved as sent and never changes; one not sent yet shows as a draft.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href="/api/work/invoice?p=last" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[0.95rem] font-bold text-fg hover:bg-panel-alt">
              Last invoice
            </a>
            <a href="/api/work/invoice?p=current" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[0.95rem] font-bold text-fg hover:bg-panel-alt">
              Current period so far
            </a>
            <DownloadLink href="/api/work/pdf?kind=invoice&p=last">Last invoice (PDF)</DownloadLink>
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

        <section className="border-t border-line pt-5">
          <h3 className="font-bold text-fg">Backups</h3>
          <p className="mt-1 text-[0.95rem] text-fg-soft">
            Every Monday morning you get an email with everything: hours, invoices paid, monthly notes, and the letters' partner list. Download the same any time.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <DownloadLink href="/api/work/export?format=json">Download all data (JSON)</DownloadLink>
            <DownloadLink href="/api/work/export?format=csv">Hours (spreadsheet)</DownloadLink>
          </div>
          <h4 className="mt-5 font-bold text-fg">Recently deleted</h4>
          <div className="mt-2">
            <TrashList trash={data.trash} guard={guard} onRestored={onRestored} onTrash={onTrash} />
          </div>
        </section>

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
