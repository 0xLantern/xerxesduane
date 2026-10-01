/**
 * The client's view, opened from the private link. Read-only: the month's
 * hours, what was done, and the totals at the agreed rate.
 */
import { useEffect, useMemo, useState } from "react";
import { api, type ReportData } from "./api";
import { Card, ErrorNote, MonthLog, TotalTile } from "./ui";
import { DAY, TZ_LABEL, fmtTime, monthKey, monthStart, shiftMonth, totalsFor, weekStart } from "./time";

export default function Report({ token }: { token: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => monthKey(Date.now()));

  useEffect(() => {
    api
      .report(token)
      .then((d) => {
        setData(d);
        setMonth(monthKey(d.now));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load the hours."));
  }, [token]);

  const totals = useMemo(() => {
    if (!data) return null;
    const week = weekStart(data.now);
    const thisMonth = monthKey(data.now);
    return {
      week: totalsFor(data.entries, week, week + 7 * DAY),
      month: totalsFor(data.entries, monthStart(thisMonth), monthStart(shiftMonth(thisMonth, 1))),
      all: totalsFor(data.entries, 0, Number.MAX_SAFE_INTEGER),
    };
  }, [data]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {error && (
        <Card className="mt-10">
          <ErrorNote>{error}</ErrorNote>
        </Card>
      )}
      {!data && !error && <p className="py-20 text-center text-fg-soft">Loading…</p>}
      {data && totals && (
        <>
          <header>
            <p className="text-sm font-bold uppercase tracking-wide text-accent-deep">Hours for {data.settings.client}</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-fg">{data.settings.name}</h1>
            <p className="text-[0.95rem] text-fg-soft">
              <a href={`mailto:${data.email}`} className="font-semibold text-accent-deep underline-offset-2 hover:underline">
                {data.email}
              </a>{" "}
              · {data.settings.rate.toFixed(2)} {data.settings.currency}/hr
            </p>
          </header>

          {data.working && (
            <p className="mt-4 rounded-2xl border border-accent/30 bg-accent/[0.06] px-4 py-3 text-[0.95rem] text-fg">
              <span className="font-bold text-accent-deep">Working now</span>, since {fmtTime(data.working.start)}.
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <TotalTile label="This week" ms={totals.week} settings={data.settings} />
            <TotalTile label="This month" ms={totals.month} settings={data.settings} />
          </div>
          <div className="mt-2">
            <TotalTile label="All time" ms={totals.all} settings={data.settings} />
          </div>

          <div className="mt-6">
            <MonthLog
              entries={data.entries}
              settings={data.settings}
              month={month}
              setMonth={setMonth}
              current={monthKey(data.now)}
              emptyText="No hours logged yet."
            />
          </div>
          <p className="mt-6 text-center">
            <a
              href={`/api/work/invoice?p=last&t=${encodeURIComponent(token)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[0.95rem] font-bold text-fg hover:bg-panel-alt"
            >
              Latest invoice (PDF)
            </a>
          </p>
          <p className="mt-4 text-center text-sm text-fg-faint">
            Times are in {TZ_LABEL}. Amounts are hours × the hourly rate.
          </p>
        </>
      )}
    </main>
  );
}
