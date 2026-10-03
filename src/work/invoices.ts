/**
 * Reading the invoice list (see api/work/_invoice.ts listInvoices): what each
 * row's status says, totals for a year, and the rows grouped by year. Shared
 * by the owner's panels and the client's page.
 */
import type { InvoiceRow, Owed } from "./api";

/** What is still owed in these rows: every sent invoice not yet marked paid. */
export function owedOf(rows: InvoiceRow[]): Owed {
  const due = rows.filter((r) => r.status === "sent" && !r.paid && r.total > 0);
  return { total: Math.round(due.reduce((n, r) => n + r.total, 0) * 100) / 100, count: due.length };
}

/** Whole days since an instant. */
export function daysSince(ms: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - ms) / 864e5));
}

export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** "3 Oct 2026" from an instant, in Dubai. */
export function fmtDate(ms: number): string {
  return new Date(ms + 4 * 3600e3).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** What an invoice row's status says, in words. */
export function invoiceState(r: InvoiceRow): { label: string; tone: "paid" | "due" | "soon" | "open" | "none" } {
  if (r.hours <= 0) return { label: "No hours", tone: "none" };
  if (r.paid) return { label: `Paid ${fmtDate(r.paid.paidAt)}${r.paid.currency !== r.currency ? ` in ${r.paid.currency}` : ""}`, tone: "paid" };
  if (r.status === "sent") return { label: `Sent${r.sentAt ? ` ${fmtDate(r.sentAt)}` : ""} · awaiting payment${r.sentAt ? ` ${daysSince(r.sentAt)} days` : ""}`, tone: "due" };
  if (r.status === "pending") return { label: "Invoice goes out tonight", tone: "soon" };
  return { label: "Month in progress", tone: "open" };
}

export const TONE = {
  paid: "bg-emerald-50 text-emerald-800",
  due: "bg-amber-50 text-amber-800",
  soon: "bg-panel-alt text-fg-soft",
  open: "bg-panel-alt text-fg-soft",
  none: "bg-panel-alt text-fg-faint",
} as const;

/** Totals for one year of invoice rows. */
export function yearTotals(rows: InvoiceRow[]) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const hours = r2(rows.reduce((n, r) => n + r.hours, 0));
  const amount = r2(rows.reduce((n, r) => n + r.total, 0));
  const invoiced = r2(rows.filter((r) => r.status === "sent").reduce((n, r) => n + r.total, 0));
  const paid = r2(rows.filter((r) => r.paid).reduce((n, r) => n + r.total, 0));
  return { hours, amount, invoiced, paid, due: r2(invoiced - paid) };
}

/** Rows grouped by year, newest year first, newest month first. */
export function byYear(rows: InvoiceRow[]): [string, InvoiceRow[]][] {
  const map = new Map<string, InvoiceRow[]>();
  for (const r of [...rows].sort((a, b) => (a.periodId < b.periodId ? 1 : -1))) {
    const y = r.periodId.slice(0, 4);
    map.set(y, [...(map.get(y) ?? []), r]);
  }
  return [...map.entries()];
}

