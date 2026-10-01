/**
 * The client's view, opened from the private link or the open address
 * (/gcn). Read-only, and meant to be read by the client: their logo on top,
 * the month's amount and hours at a glance, then each day's work as a short,
 * readable list. It always renders light, on the client's own colours, so it
 * looks the same however the reader's phone is set.
 */
import { useEffect, useMemo, useState } from "react";
import { api, type Entry, type ReportData } from "./api";
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
// "Great Commission" and the green of "Network".
const INK = "#2b1a14";
const BRONZE = "#8a6a2e";
const GREEN = "#3b6b35";

export default function Report({ token }: { token: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => monthKey(Date.now()));

  useEffect(() => {
    // This page is always light: the logo is artwork on white.
    document.documentElement.dataset.theme = "light";
    api
      .report(token)
      .then((d) => {
        setData(d);
        setMonth(monthKey(d.now));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the hours."));
  }, [token]);

  const view = useMemo(() => {
    if (!data) return null;
    const week = weekStart(data.now);
    const from = monthStart(month);
    const to = monthStart(shiftMonth(month, 1));
    const inMonth = data.entries.filter((e) => e.start >= from && e.start < to).sort((a, b) => b.start - a.start);
    const days = new Map<string, Entry[]>();
    for (const e of inMonth) days.set(dayKey(e.start), [...(days.get(dayKey(e.start)) ?? []), e]);
    const earliest = data.entries.length ? monthKey(Math.min(...data.entries.map((e) => e.start))) : month;
    return {
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
    <div className="min-h-screen bg-[#f6f4ef] text-[#2b2420]">
      <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="flex flex-col items-center text-center">
          <img src="/brand/clients/gcn.png" alt="GCN Great Commission Network" width={220} height={96} className="h-auto w-[200px] sm:w-[240px]" />
          <p className="mt-3 text-[0.8rem] font-semibold uppercase tracking-[0.18em]" style={{ color: BRONZE }}>
            Work report
          </p>
          {data && (
            <p className="mt-1 text-[0.95rem] text-[#6b5f55]">
              Prepared by <span className="font-semibold text-[#2b2420]">{data.settings.name}</span>
            </p>
          )}
        </header>

        {error && <p className="mt-10 rounded-2xl border border-red-200 bg-white px-5 py-4 text-center text-red-700">{error}</p>}
        {!data && !error && <p className="py-24 text-center text-[#8a7f75]">Loading…</p>}

        {data && view && (
          <>
            {data.working && (
              <p className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: GREEN }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: GREEN }} />
                </span>
                Working now, since {fmtTime(data.working.start)}
              </p>
            )}

            {/* Month summary */}
            <section className="mt-6 rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(43,26,20,.05),0_12px_32px_-18px_rgba(43,26,20,.25)] sm:p-7">
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
                  <span className="ml-1 text-xl font-bold text-[#8a7f75]">h</span>
                </p>
                <p className="mt-2 text-[0.95rem] text-[#6b5f55]">
                  {view.sessions} {view.sessions === 1 ? "session" : "sessions"} ·{" "}
                  <span className="font-semibold" style={{ color: GREEN }}>
                    {fmtMoney(view.monthMs, data.settings.rate, data.settings.currency)}
                  </span>{" "}
                  at {fmtMoney(3600000, data.settings.rate, data.settings.currency)}/h
                </p>
              </div>

              <dl className="mt-6 grid grid-cols-2 divide-x divide-[#ece7dd] border-t border-[#ece7dd] pt-4 text-center">
                <Stat label="This week" value={`${fmtHours(view.weekMs)} h`} />
                <Stat label="All time" value={`${fmtHours(view.allMs)} h`} />
              </dl>
            </section>

            {/* The work, day by day */}
            <section className="mt-8">
              {view.days.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-[#ddd5c7] px-5 py-10 text-center text-[#8a7f75]">
                  No work logged in {fmtMonth(month)} yet.
                </p>
              ) : (
                <ol className="relative space-y-6 border-l-2 border-[#e6dfd2] pl-5 sm:pl-7">
                  {view.days.map(([key, list]) => (
                    <li key={key} className="relative">
                      <span
                        className="absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full ring-4 ring-[#f6f4ef] sm:-left-[2.1rem]"
                        style={{ background: BRONZE }}
                        aria-hidden
                      />
                      <div className="flex items-baseline justify-between">
                        <h2 className="font-bold" style={{ color: INK }}>
                          {fmtDay(list[0].start)}
                        </h2>
                        <span className="text-sm font-semibold tabular-nums text-[#8a7f75]">
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

            {/* Downloads */}
            <section className={`mt-10 grid gap-2 ${data.scope === "private" ? "sm:grid-cols-2" : ""}`}>
              <a
                href={`/api/work/pdf?kind=log&m=${month}&t=${t}`}
                download
                className="flex min-h-12 items-center justify-center gap-2 rounded-full px-5 font-bold text-white transition hover:opacity-90"
                style={{ background: INK }}
              >
                <DownloadIcon /> {fmtMonth(month)} report (PDF)
              </a>
              {data.scope === "private" && (
              <a
                href={`/api/work/pdf?kind=invoice&p=last&t=${t}`}
                download
                className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#ddd5c7] bg-white px-5 font-bold transition hover:bg-[#faf8f4]"
                style={{ color: INK }}
              >
                <DownloadIcon /> Latest invoice (PDF)
              </a>
              )}
            </section>

            <footer className="mt-10 text-center text-sm leading-relaxed text-[#8a7f75]">
              <p>
                Shared for stewardship and transparency.
                <br />
                Questions?{" "}
                <a href={`mailto:${data.email}`} className="font-semibold underline-offset-2 hover:underline" style={{ color: GREEN }}>
                  {data.email}
                </a>
              </p>
              <p className="mt-2 text-xs">
                Times are in {TZ_LABEL}.
                {data.scope === "public" && " This page is open to anyone with its address; invoices are sent by email."}
              </p>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

/** One session: what it was, when, how long, and what was done, as a list. */
function WorkCard({ entry: e }: { entry: Entry }) {
  // Notes are written as paragraphs; each one reads best as its own point.
  const points = e.notes
    .split(/\n\s*\n|\n(?=\s*[-•*]\s)/)
    .map((p) => p.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
  const overnight = dayKey(e.start) !== dayKey(e.end);
  return (
    <article className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(43,26,20,.05)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words font-bold leading-snug" style={{ color: INK }}>
          {e.task}
        </h3>
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums text-white" style={{ background: GREEN }}>
          {fmtHours(e.end - e.start)} h
        </span>
      </div>
      <p className="mt-0.5 text-sm tabular-nums text-[#8a7f75]">
        {fmtTime(e.start)} – {fmtTime(e.end)}
        {overnight && " (next day)"}
      </p>
      {points.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-[#f0ebe2] pt-3">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-[0.95rem] leading-relaxed text-[#4a3f37]">
              <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: BRONZE }} aria-hidden />
              <span className="min-w-0 whitespace-pre-line break-words">{p}</span>
            </li>
          ))}
        </ul>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#8a7f75]">{label}</dt>
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
      className="grid h-11 w-11 place-items-center rounded-full border border-[#ece7dd] text-xl transition hover:bg-[#faf8f4] disabled:opacity-25"
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
