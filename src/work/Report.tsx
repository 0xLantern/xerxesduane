/**
 * The client's view, opened from the private link or the open address
 * (/gcn). Read-only, and meant to be read by the client: their logo on top,
 * the month's amount and hours at a glance, then each day's work as a short,
 * readable list. It always renders light, on the client's own colours, so it
 * looks the same however the reader's phone is set.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, api, type Entry, type InvoiceRow, type ReportData } from "./api";
import { notePoints } from "./notes";
import { byYear, fmtDate, invoiceState, money, yearTotals } from "./invoices";
import {
  DAY,
  TZ_LABEL,
  dayKey,
  fmtDay,
  fmtHours,
  fmtMoney,
  fmtMonth,
  fmtTime,
  monthKey,
  monthStart,
  shiftMonth,
  totalsFor,
  weekStart,
} from "./time";

// GCN's own palette, from their logo: the dark brown of "GCN", the bronze of
// "Great Commission" and the green of "Network". Each colour is a variable
// (see THEME) so the page has a night version that follows the phone's
// setting, with a switch that remembers the reader's choice on this device.
const INK = "var(--rp-ink)";
const BRONZE = "var(--rp-bronze)";
const GREEN = "var(--rp-green)";

const THEME = `
[data-rp]{--rp-bg:#f6f4ef;--rp-card:#ffffff;--rp-panel:#faf8f4;--rp-text:#2b2420;--rp-text2:#4a3f37;--rp-soft:#6b5f55;--rp-faint:#8a7f75;--rp-line:#ece7dd;--rp-ink:#2b1a14;--rp-bronze:#8a6a2e;--rp-green:#3b6b35;--rp-warnbg:#fdf0dc;--rp-warn:#8a5a0e;--rp-due:#a6410a;--rp-on-solid:#ffffff;--rp-shadow:0 1px 2px rgba(43,26,20,.05),0 12px 32px -18px rgba(43,26,20,.25)}
[data-rp="dark"]{--rp-bg:#15110f;--rp-card:#221b17;--rp-panel:#2b231e;--rp-text:#efe9e2;--rp-text2:#d9d1c8;--rp-soft:#b3a79b;--rp-faint:#8f847a;--rp-line:#3a3129;--rp-ink:#f3ebe3;--rp-bronze:#c9a35e;--rp-green:#8fc487;--rp-warnbg:#3b2d14;--rp-warn:#e0b25a;--rp-due:#e8945a;--rp-on-solid:#15110f;--rp-shadow:0 1px 2px rgba(0,0,0,.3),0 12px 32px -18px rgba(0,0,0,.6);color-scheme:dark}
`;

type Mode = "light" | "dark";
const MODE_KEY = "gcn-theme";

function initialMode(): Mode {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* fine */
  }
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function Report({ token }: { token: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  // The easy address asks for the client password first.
  const [locked, setLocked] = useState(false);
  const [month, setMonth] = useState(() => monthKey(Date.now()));
  const [mode, setMode] = useState<Mode>(initialMode);
  const flip = () => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* fine */
    }
  };

  const load = useCallback(() => {
    api
      .report(token)
      .then((d) => {
        setLocked(false);
        setData(d);
        setMonth(monthKey(d.now));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setLocked(true);
        else setError(err instanceof Error ? err.message : "Couldn't load the hours.");
      });
  }, [token]);

  useEffect(() => {
    // The site's own tokens stay light here; this page carries its own two palettes (THEME).
    document.documentElement.dataset.theme = "light";
    load();
  }, [load]);
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "dark" ? "#15110f" : "var(--rp-bg)");
  }, [mode]);

  const view = useMemo(() => {
    if (!data) return null;
    const week = weekStart(data.now);
    const from = monthStart(month);
    const to = monthStart(shiftMonth(month, 1));
    const inMonth = data.entries.filter((e) => e.start >= from && e.start < to).sort((a, b) => b.start - a.start);
    const days = new Map<string, Entry[]>();
    for (const e of inMonth) days.set(dayKey(e.start), [...(days.get(dayKey(e.start)) ?? []), e]);
    const earliest = data.entries.length ? monthKey(Math.min(...data.entries.map((e) => e.start))) : month;
    const invoice = data.invoices.find((r) => r.periodId === month) ?? null;
    const summary = data.summaries[month];
    const year = month.slice(0, 4);
    const yearRows = byYear(data.invoices).find(([y]) => y === year)?.[1] ?? [];
    return {
      invoice,
      summary: summary && (summary.delivered || summary.next || summary.decide) ? summary : null,
      year,
      yearRows,
      monthMs: totalsFor(data.entries, from, to),
      weekMs: totalsFor(data.entries, week, week + 7 * DAY),
      allMs: totalsFor(data.entries, 0, Number.MAX_SAFE_INTEGER),
      days: [...days.entries()],
      sessions: inMonth.length,
      canBack: month > earliest,
      canForward: month < monthKey(data.now),
    };
  }, [data, month]);

  const t = encodeURIComponent(token);

  return (
    <div data-rp={mode} className="min-h-screen bg-[var(--rp-bg)] text-[var(--rp-text)]">
      <style>{THEME}</style>
      <main className="relative mx-auto w-full max-w-2xl px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={flip}
          aria-label={mode === "dark" ? "Switch to the light page" : "Switch to the dark page"}
          title={mode === "dark" ? "Light" : "Dark"}
          className="absolute right-4 top-[max(1.5rem,env(safe-area-inset-top))] grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-line)] bg-[var(--rp-card)] text-lg shadow-sm"
          style={{ color: INK }}
        >
          <span aria-hidden="true">{mode === "dark" ? "☀" : "☾"}</span>
        </button>
        <header className="flex flex-col items-center text-center">
          {/* The client's logo is artwork on white, so it keeps a white card behind it at night. */}
          {!data || data.client.logo ? (
            <div className={mode === "dark" ? "rounded-2xl px-4 py-2" : ""} style={mode === "dark" ? { background: "#ffffff" } : undefined}>
              <img src={data?.client.logo || "/brand/clients/gcn.png"} alt={data?.client.name ?? "GCN Great Commission Network"} width={220} height={96} className="h-auto w-[200px] sm:w-[240px]" />
            </div>
          ) : (
            <h2 className="text-3xl font-extrabold" style={{ color: INK }}>
              {data.client.name}
            </h2>
          )}
          <p className="mt-3 text-[0.8rem] font-semibold uppercase tracking-[0.18em]" style={{ color: BRONZE }}>
            Work report
          </p>
          {data && (
            <p className="mt-1 text-[0.95rem] text-[var(--rp-soft)]">
              Prepared by <span className="font-semibold text-[var(--rp-text)]">{data.settings.name}</span>
            </p>
          )}
        </header>

        {error && <p className="mt-10 rounded-2xl border border-red-200 bg-[var(--rp-card)] px-5 py-4 text-center text-red-700">{error}</p>}
        {locked && <PasswordGate onIn={load} />}
        {!data && !error && !locked && <p className="py-24 text-center text-[var(--rp-faint)]">Loading…</p>}

        {data && view && (
          <>
            {data.working && (
              <p className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full bg-[var(--rp-card)] px-4 py-2 text-sm shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: GREEN }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: GREEN }} />
                </span>
                Working now, since {fmtTime(data.working.start)}
              </p>
            )}

            {/* Month summary */}
            <section className="mt-6 rounded-3xl bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow)] sm:p-7">
              <div className="flex items-center justify-between gap-2">
                <MonthButton dir="prev" disabled={!view.canBack} onClick={() => setMonth(shiftMonth(month, -1))} />
                <h1 className="text-center text-lg font-bold" style={{ color: INK }}>
                  {fmtMonth(month)}
                </h1>
                <MonthButton dir="next" disabled={!view.canForward} onClick={() => setMonth(shiftMonth(month, 1))} />
              </div>

              <div className="mt-5 text-center">
                <p className="text-[2.6rem] font-extrabold leading-none tabular-nums sm:text-5xl" style={{ color: INK }}>
                  {fmtHours(view.monthMs)}
                  <span className="ml-1 text-xl font-bold text-[var(--rp-faint)]">h</span>
                </p>
                <p className="mt-2 text-[0.95rem] text-[var(--rp-soft)]">
                  {view.sessions} {view.sessions === 1 ? "session" : "sessions"} ·{" "}
                  <span className="font-semibold" style={{ color: GREEN }}>
                    {fmtMoney(view.monthMs, data.settings.rate, data.settings.currency)}
                  </span>{" "}
                  at {fmtMoney(3600000, data.settings.rate, data.settings.currency)}/h
                </p>
              </div>

              <dl className="mt-6 grid grid-cols-2 divide-x divide-[var(--rp-line)] border-t border-[var(--rp-line)] pt-4 text-center">
                <Stat label="This week" value={`${fmtHours(view.weekMs)} h`} />
                <Stat label="All time" value={`${fmtHours(view.allMs)} h`} />
              </dl>

              {view.invoice && view.invoice.hours > 0 && <InvoiceLine row={view.invoice} token={t} />}
            </section>

            {/* The month in three lines, from the owner */}
            {view.summary && (
              <section className="mt-6 rounded-3xl bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow)] sm:p-7">
                <p className="text-[0.8rem] font-semibold uppercase tracking-[0.18em]" style={{ color: BRONZE }}>
                  {fmtMonth(month)} at a glance
                </p>
                <dl className="mt-3 space-y-3">
                  {view.summary.delivered && <Line label="Delivered" text={view.summary.delivered} />}
                  {view.summary.next && <Line label="Next" text={view.summary.next} />}
                  {view.summary.decide && <Line label="Needs your decision" text={view.summary.decide} accent />}
                </dl>
              </section>
            )}

            {/* The work, day by day */}
            <section className="mt-8">
              {view.days.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-[var(--rp-line)] px-5 py-10 text-center text-[var(--rp-faint)]">
                  No work logged in {fmtMonth(month)} yet.
                </p>
              ) : (
                <ol className="relative space-y-6 border-l-2 border-[var(--rp-line)] pl-5 sm:pl-7">
                  {view.days.map(([key, list]) => (
                    <li key={key} className="relative">
                      <span
                        className="absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full ring-4 ring-[var(--rp-bg)] sm:-left-[2.1rem]"
                        style={{ background: BRONZE }}
                        aria-hidden
                      />
                      <div className="flex items-baseline justify-between">
                        <h2 className="font-bold" style={{ color: INK }}>
                          {fmtDay(list[0].start)}
                        </h2>
                        <span className="text-sm font-semibold tabular-nums text-[var(--rp-faint)]">
                          {fmtHours(list.reduce((n, e) => n + e.end - e.start, 0))} h
                        </span>
                      </div>
                      <div className="mt-2 space-y-3">
                        {list.map((e) => (
                          <WorkCard key={e.id} entry={e} />
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* The year, month by month */}
            {view.yearRows.length > 0 && <YearTable year={view.year} rows={view.yearRows} currency={data.settings.currency} token={t} />}

            {/* Downloads */}
            <section className="mt-10 grid gap-2 sm:grid-cols-2">
              <a
                href={`/api/work/pdf?kind=log&m=${month}&t=${t}`}
                download
                className="flex min-h-12 items-center justify-center gap-2 rounded-full px-5 font-bold text-[var(--rp-on-solid)] transition hover:opacity-90"
                style={{ background: INK }}
              >
                <DownloadIcon /> {fmtMonth(month)} report (PDF)
              </a>
              <a
                href={`/api/work/pdf?kind=invoice&p=last&t=${t}`}
                download
                className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--rp-line)] bg-[var(--rp-card)] px-5 font-bold transition hover:bg-[var(--rp-panel)]"
                style={{ color: INK }}
              >
                <DownloadIcon /> Latest invoice (PDF)
              </a>
            </section>

            <footer className="mt-10 text-center text-sm leading-relaxed text-[var(--rp-faint)]">
              <p>
                Shared for stewardship and transparency.
                <br />
                Questions?{" "}
                <a href={`mailto:${data.email}`} className="font-semibold underline-offset-2 hover:underline" style={{ color: GREEN }}>
                  {data.email}
                </a>
              </p>
              <p className="mt-2 text-xs">Times are in {TZ_LABEL}.</p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

/** The client password, asked once; the browser then remembers it for a year. */
function PasswordGate({ onIn }: { onIn: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.clientLogin(pw);
      onIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check the password.");
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-8 max-w-sm rounded-3xl bg-[var(--rp-card)] p-6 text-center shadow-[var(--rp-shadow)]"
    >
      <h1 className="text-lg font-bold" style={{ color: INK }}>
        Welcome
      </h1>
      <p className="mt-1 text-[0.95rem] text-[var(--rp-soft)]">Please enter the password to see the work report.</p>
      <input
        type="password"
        autoComplete="current-password"
        autoFocus
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        aria-label="Password"
        placeholder="Password"
        className="mt-5 min-h-12 w-full rounded-full border border-[var(--rp-line)] bg-[var(--rp-panel)] px-5 text-center text-base text-[var(--rp-text)] outline-none focus:border-[var(--rp-bronze)] focus:ring-2 focus:ring-[var(--rp-bronze)]/20"
      />
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 min-h-12 w-full rounded-full font-bold text-[var(--rp-on-solid)] transition hover:opacity-90 disabled:opacity-60"
        style={{ background: INK }}
      >
        {busy ? "Opening…" : "Open report"}
      </button>
      <p className="mt-4 text-xs text-[var(--rp-faint)]">This browser will remember it, so you only need to enter it once.</p>
    </form>
  );
}

/** One session: what it was, when, how long, and what was done, as a list. */
function WorkCard({ entry: e }: { entry: Entry }) {
  // Notes are written as paragraphs; each one reads best as its own point.
  const points = useMemo(() => notePoints(e.notes), [e.notes]);
  const [open, setOpen] = useState(false);
  const shown = open ? points : points.slice(0, 4);
  const overnight = dayKey(e.start) !== dayKey(e.end);
  return (
    <article className="rounded-2xl bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words font-bold leading-snug" style={{ color: INK }}>
          {e.task}
        </h3>
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums text-[var(--rp-on-solid)]" style={{ background: GREEN }}>
          {fmtHours(e.end - e.start)} h
        </span>
      </div>
      <p className="mt-0.5 text-sm tabular-nums text-[var(--rp-faint)]">
        {fmtTime(e.start)} – {fmtTime(e.end)}
        {overnight && " (next day)"}
      </p>
      {points.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-[var(--rp-line)] pt-3">
          {shown.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-[0.95rem] leading-relaxed text-[var(--rp-text2)]">
              <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: BRONZE }} aria-hidden />
              <span className="min-w-0 break-words">{p}</span>
            </li>
          ))}
        </ul>
      )}
      {points.length > 4 && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-sm font-semibold" style={{ color: GREEN }}>
          {open ? "Show less" : `Show all ${points.length} points`}
        </button>
      )}
      {e.link && (
        <a
          href={e.link}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 inline-block break-all text-sm font-semibold underline-offset-2 hover:underline"
          style={{ color: GREEN }}
        >
          {e.link.replace(/^https?:\/\//, "")} ↗
        </a>
      )}
    </article>
  );
}

/** The month's invoice: its number, and whether it has been paid. */
function InvoiceLine({ row, token }: { row: InvoiceRow; token: string }) {
  const st = invoiceState(row);
  const color = st.tone === "paid" ? GREEN : st.tone === "due" ? "var(--rp-due)" : "var(--rp-faint)";
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--rp-line)] pt-4 text-sm">
      <span className="text-[var(--rp-soft)]">
        Invoice <span className="font-semibold text-[var(--rp-text)]">{row.number}</span> · {money(row.total, row.currency)}
      </span>
      <span className="flex items-center gap-2">
        <span className="font-bold" style={{ color }}>
          {st.tone === "paid" ? "Paid" : st.tone === "due" ? "Awaiting payment" : st.tone === "soon" ? "Coming tonight" : "In progress"}
        </span>
        {row.status === "sent" && (
          <a href={`/api/work/invoice?p=${row.periodId}&t=${token}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-2 hover:underline" style={{ color: GREEN }}>
            View
          </a>
        )}
      </span>
      {row.paid && (
        <span className="w-full text-xs text-[var(--rp-faint)]">
          Received {fmtDate(row.paid.paidAt)}
          {row.paid.currency !== row.currency ? ` in ${row.paid.currency}` : ""}. Thank you.
        </span>
      )}
    </div>
  );
}

function Line({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: accent ? "var(--rp-warnbg)" : "var(--rp-panel)" }}>
      <dt className="text-xs font-bold uppercase tracking-wider" style={{ color: accent ? "var(--rp-warn)" : "var(--rp-faint)" }}>
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-line text-[0.98rem] leading-relaxed text-[var(--rp-text)]">{text}</dd>
    </div>
  );
}

/** Every month of the year: hours, amount, and where its invoice stands. */
function YearTable({ year, rows, currency, token }: { year: string; rows: InvoiceRow[]; currency: string; token: string }) {
  const t = yearTotals(rows);
  const ordered = [...rows].sort((a, b) => (a.periodId < b.periodId ? -1 : 1));
  return (
    <section className="mt-10 rounded-3xl bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow)] sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold" style={{ color: INK }}>
          {year} so far
        </h2>
        <p className="text-sm tabular-nums text-[var(--rp-soft)]">
          {t.hours.toFixed(2)} h · <span className="font-semibold" style={{ color: GREEN }}>{money(t.amount, currency)}</span>
        </p>
      </div>
      <ul className="mt-4 divide-y divide-[var(--rp-line)]">
        {ordered.map((r) => {
          const st = invoiceState(r);
          return (
            <li key={r.periodId} className="flex items-center justify-between gap-3 py-2.5 text-[0.95rem]">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--rp-text)]">{r.label.split(" ")[0]}</p>
                <p className="truncate text-xs" style={{ color: st.tone === "paid" ? GREEN : st.tone === "due" ? "var(--rp-due)" : "var(--rp-faint)" }}>
                  {st.label}
                </p>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="font-bold" style={{ color: INK }}>
                  {money(r.total, currency)}
                </p>
                <p className="text-xs text-[var(--rp-faint)]">{r.hours.toFixed(2)} h</p>
              </div>
            </li>
          );
        })}
      </ul>
      <dl className="mt-4 grid grid-cols-3 divide-x divide-[var(--rp-line)] border-t border-[var(--rp-line)] pt-4 text-center">
        <Stat label="Invoiced" value={money(t.invoiced, currency)} />
        <Stat label="Paid" value={money(t.paid, currency)} />
        <Stat label="Still due" value={money(t.due, currency)} />
      </dl>
      <a
        href={`/api/work/pdf?kind=year&y=${year}&t=${token}`}
        download
        className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--rp-line)] bg-[var(--rp-card)] px-5 font-bold transition hover:bg-[var(--rp-panel)]"
        style={{ color: INK }}
      >
        <DownloadIcon /> {year} statement (PDF)
      </a>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[var(--rp-faint)]">{label}</dt>
      <dd className="mt-1 text-lg font-bold tabular-nums" style={{ color: INK }}>
        {value}
      </dd>
    </div>
  );
}

function MonthButton({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous month" : "Next month"}
      className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-line)] text-xl transition hover:bg-[var(--rp-panel)] disabled:opacity-25"
      style={{ color: INK }}
    >
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" />
    </svg>
  );
}
