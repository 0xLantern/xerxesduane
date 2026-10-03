/**
 * The owner's numbers across every client: hours per client per month, and
 * income by year. Built from the invoice rows the page already has (one per
 * client per month), so it needs no request of its own. Amounts stay in each
 * client's own currency: USD and CHF are never added together.
 */
import { useMemo, useState } from "react";
import type { Client, InvoiceRow } from "./api";
import { money } from "./invoices";
import { Sheet } from "./ui";

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Sum amounts by currency, as "$1,200.00 + CHF 300.00". */
function byCurrency(rows: InvoiceRow[], pick: (r: InvoiceRow) => boolean): string {
  const sums = new Map<string, number>();
  for (const r of rows) if (pick(r)) sums.set(r.currency, r2((sums.get(r.currency) ?? 0) + r.total));
  const parts = [...sums].filter(([, v]) => v > 0).map(([c, v]) => money(v, c));
  return parts.length ? parts.join(" + ") : "—";
}

export default function NumbersSheet({ clients, invoices, now, onClose }: { clients: Client[]; invoices: InvoiceRow[]; now: number; onClose: () => void }) {
  const years = useMemo(() => [...new Set(invoices.map((r) => r.periodId.slice(0, 4)))].sort().reverse(), [invoices]);
  const thisYear = String(new Date(now + 4 * 3600e3).getUTCFullYear());
  const [year, setYear] = useState(years.includes(thisYear) ? thisYear : (years[0] ?? thisYear));
  const shown = clients.filter((c) => invoices.some((r) => r.client === c.id && r.periodId.startsWith(year) && r.hours > 0));
  const rows = invoices.filter((r) => r.periodId.startsWith(year) && /^\d{4}-\d{2}$/.test(r.periodId));
  const months = [...new Set(rows.map((r) => r.periodId))].sort();
  const hoursIn = (m: string, c?: string) => r2(rows.filter((r) => r.periodId === m && (!c || r.client === c)).reduce((n, r) => n + r.hours, 0));
  const peak = Math.max(1, ...months.map((m) => hoursIn(m)));
  const yearHours = r2(rows.reduce((n, r) => n + r.hours, 0));
  const COLORS = ["#1e3a5f", "#c2410c", "#3b6b35", "#8a6a2e", "#6b4c9a", "#0f766e"];
  const color = (id: string) => COLORS[Math.max(0, clients.findIndex((c) => c.id === id)) % COLORS.length];

  return (
    <Sheet title="Your numbers" onClose={onClose}>
      <div className="space-y-5">
        {years.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={`min-h-11 rounded-full px-4 text-[0.95rem] font-bold ${y === year ? "bg-navy text-fg-onSolid" : "border border-line bg-panel text-fg"}`}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        <section className="grid grid-cols-2 gap-2">
          <Tile label={`Hours in ${year}`} value={`${yearHours.toFixed(2)} h`} />
          <Tile label="Earned (all work)" value={byCurrency(rows, () => true)} />
          <Tile label="Invoiced" value={byCurrency(rows, (r) => r.status === "sent")} />
          <Tile label="Paid" value={byCurrency(rows, (r) => !!r.paid)} />
          <div className="col-span-2">
            <Tile label="Still owed" value={byCurrency(rows, (r) => r.status === "sent" && !r.paid)} />
          </div>
        </section>

        <section>
          <h3 className="font-bold text-fg">Hours by month</h3>
          {shown.length > 1 && (
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-fg-soft">
              {shown.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(c.id) }} aria-hidden />
                  {c.name}
                </span>
              ))}
            </p>
          )}
          {months.length === 0 && <p className="mt-2 text-[0.95rem] text-fg-soft">No hours in {year}.</p>}
          <ul className="mt-3 space-y-2">
            {months.map((m) => {
              const total = hoursIn(m);
              return (
                <li key={m} className="grid grid-cols-[2.5rem_1fr_3.75rem] items-center gap-2 text-sm">
                  <span className="font-bold text-fg">{SHORT[Number(m.slice(5)) - 1]}</span>
                  <span className="flex h-4 overflow-hidden rounded-full bg-panel-alt" role="img" aria-label={`${total.toFixed(2)} hours`}>
                    {shown.map((c) => {
                      const h = hoursIn(m, c.id);
                      return h > 0 ? <span key={c.id} style={{ width: `${(h / peak) * 100}%`, background: color(c.id) }} /> : null;
                    })}
                  </span>
                  <span className="text-right font-semibold tabular-nums text-fg">{total.toFixed(2)} h</span>
                </li>
              );
            })}
          </ul>
        </section>

        {shown.length > 0 && (
          <section>
            <h3 className="font-bold text-fg">By client</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-line text-left text-fg-soft">
                    <th className="py-2 pr-2 font-bold">Month</th>
                    {shown.map((c) => (
                      <th key={c.id} className="py-2 pl-2 text-right font-bold">
                        {c.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m} className="border-b border-line">
                      <td className="py-2 pr-2 font-semibold text-fg">{SHORT[Number(m.slice(5)) - 1]}</td>
                      {shown.map((c) => {
                        const r = rows.find((x) => x.periodId === m && x.client === c.id);
                        return (
                          <td key={c.id} className="py-2 pl-2 text-right">
                            {r && r.hours > 0 ? (
                              <>
                                <span className="block text-fg">{r.hours.toFixed(2)} h</span>
                                <span className="block text-xs text-fg-soft">{money(r.total, r.currency)}</span>
                              </>
                            ) : (
                              <span className="text-fg-faint">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2 pr-2 text-fg">{year}</td>
                    {shown.map((c) => {
                      const mine = rows.filter((r) => r.client === c.id);
                      return (
                        <td key={c.id} className="py-2 pl-2 text-right">
                          <span className="block text-fg">{r2(mine.reduce((n, r) => n + r.hours, 0)).toFixed(2)} h</span>
                          <span className="block text-xs text-accent-deep">{money(r2(mine.reduce((n, r) => n + r.total, 0)), c.currency)}</span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
        <p className="text-sm text-fg-soft">Earned counts every logged hour at its client's rate, this month's included. Currencies are kept apart.</p>
      </div>
    </Sheet>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-panel px-4 py-3">
      <p className="text-sm font-bold text-fg-soft">{label}</p>
      <p className="mt-0.5 break-words font-display text-lg font-bold tabular-nums text-fg">{value}</p>
    </div>
  );
}
