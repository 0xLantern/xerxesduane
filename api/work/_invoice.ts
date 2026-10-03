// The twice-monthly invoice for the hours log: built from the same entries and rate
// the log shows, rendered as one self-contained HTML page that works both as
// the printable invoice (Save as PDF from the browser) and as the email body.
//
// The client is fixed, so the bill-to block is too. Totals follow the log's
// own rule (src/work/time.ts fmtMoney): hours rounded to two decimals, times
// the rate, rounded to the cent once at the end.
import {
  DEFAULT_CLIENT,
  GCN_BILL_TO,
  OWNER_EMAIL,
  allEntries,
  allPayments,
  entriesOf,
  gcnRecipients,
  getSettings,
  redis,
  scoped,
  settingsFor,
  type BillTo,
  type Client,
  type Entry,
  type Payment,
  type Settings,
} from "./_lib";
import { renderPdf, toBase64 } from "./_pdf";

/** GCN's billing block, which saved invoices from before clients were a list don't carry. */
export const BILL_TO: BillTo = GCN_BILL_TO;

/** The sender's address, under their name on every invoice. */
export const FROM_ADDRESS = [
  "1210, Al Mamzar Tower, Al Taawun St",
  "Al Khalidiya District, Sharjah",
  "United Arab Emirates",
] as const;

/**
 * Where GCN pays. The invoice is in USD, so the USD account comes first:
 * paying it needs no conversion on this side. The CHF account is there for
 * a transfer from GCN's Swiss franc account, which their bank can send in
 * CHF as the USD amount converted at the day's rate.
 */
export const PAYMENT = {
  holder: "XERXES DUANE IBANEZ MAGDALUYO",
  /** The holder's address as registered with the bank, which GCN's bank asks for. */
  holderAddress: "1210 Al Mamzar Tower, Al Taawun Street, Al Khalidiya, Sharjah, United Arab Emirates",
  bank: "Mashreq Bank, Dubai, UAE",
  swift: "BOMLAEAD",
  accounts: [
    { currency: "USD", number: "019010742613", iban: "AE450330000019010742613", note: "Preferred: the invoice is in USD." },
    { currency: "CHF", number: "019010742614", iban: "AE180330000019010742614", note: "If paying in CHF: the USD amount at the day's rate." },
  ],
} as const;

/** Where a client's invoice email goes: the client's list, or for GCN the old default (WORK_INVOICE_TO / their billing email). */
export function invoiceRecipients(client: Client): string[] {
  if (client.invoiceTo.length) return client.invoiceTo;
  return client.id === DEFAULT_CLIENT ? gcnRecipients() : [];
}

/** Same as WORK_ORIGIN in src/lib/host.ts, which is browser code and not importable here. */
export const WORK_ORIGIN = "https://work.xerxesduane.com";
const GCN_LOGO = "/brand/clients/gcn.png";
const OWN_LOGO_PATH = "/brand/mono/logo-black@2x.png";

/** The client's logo path on this site: the invoice's own, else GCN's for invoices saved before clients were a list. */
export function logoOf(inv: { logo?: string }): string {
  return inv.logo === undefined ? GCN_LOGO : inv.logo;
}

/** The invoice's bill-to block, falling back to GCN's for older saved copies. */
export function billToOf(inv: { billTo?: BillTo }): BillTo {
  return inv.billTo ?? BILL_TO;
}

// Dubai time, UTC+4 all year: the same days and months the log shows.
const OFFSET = 4 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n: number) => String(n).padStart(2, "0");

const DAY = 24 * HOUR;

/** The instant of a Dubai midnight. Month is 0-based and may overflow. */
function dubaiMidnight(y: number, m: number, d: number): number {
  return Date.UTC(y, m, d) - OFFSET;
}

/**
 * Invoices are monthly: one per calendar month in Dubai, id YYYY-MM, sent
 * just after the month ends. September 2026 was billed by hand as a
 * half-month, so its id (2026-09-B) is still understood for viewing.
 */
export type Period = { id: string; from: number; to: number; label: string };

/** A whole calendar month in Dubai. id is YYYY-MM. */
export function monthPeriod(id: unknown): Period | null {
  const match = typeof id === "string" ? /^(20\d{2})-(0[1-9]|1[0-2])$/.exec(id) : null;
  if (!match) return null;
  const [y, m] = [Number(match[1]), Number(match[2]) - 1];
  return { id: match[0], from: dubaiMidnight(y, m, 1), to: dubaiMidnight(y, m + 1, 1), label: `${MONTHS[m]} ${y}` };
}

/** A month (YYYY-MM), or one of the old half-months (YYYY-MM-A / -B). */
export function periodFor(id: unknown): Period | null {
  const month = monthPeriod(id);
  if (month) return month;
  const match = typeof id === "string" ? /^(20\d{2})-(0[1-9]|1[0-2])-([AB])$/.exec(id) : null;
  if (!match) return null;
  const [y, m] = [Number(match[1]), Number(match[2]) - 1];
  const from = match[3] === "A" ? dubaiMidnight(y, m, 1) : dubaiMidnight(y, m, 16);
  const to = match[3] === "A" ? dubaiMidnight(y, m, 16) : dubaiMidnight(y, m + 1, 1);
  return { id: match[0], from, to, label: `${fmtDate(from)} – ${fmtDate(to - DAY)}` };
}

/** The month an instant falls in. */
export function periodContaining(ms: number): Period {
  return monthPeriod(new Date(ms + OFFSET).toISOString().slice(0, 7))!;
}

/** A period id, or "current" (still open) or "last" (the last one closed, the default). */
export function resolvePeriod(p: unknown): Period {
  const now = periodContaining(Date.now());
  if (p === "current") return now;
  return periodFor(p) ?? previousPeriod(now);
}

/** The period just before the given one. */
export function previousPeriod(p: Period): Period {
  return periodContaining(p.from - 1);
}

export function fmtDate(ms: number): string {
  const d = new Date(ms + OFFSET);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
}

function fmtTime(ms: number): string {
  const d = new Date(ms + OFFSET);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export type Invoice = {
  /** The half-month it covers, e.g. 2026-10-A. */
  periodId: string;
  /**
   * "issued" once it has been sent: from then on it is the saved copy, and
   * later edits to the log never change it. Until then it is a "draft",
   * rebuilt from the log each time it is opened.
   */
  status: "issued" | "draft";
  /** When it was sent, epoch ms. */
  sentAt?: number;
  number: string;
  period: string;
  issued: string;
  lines: { date: string; time: string; task: string; notes: string; hours: number }[];
  hours: number;
  total: number;
  settings: Settings;
  /** Which client (invoices saved before clients were a list have none: GCN's). */
  clientId?: string;
  billTo?: BillTo;
  /** Logo path on this site; "" for none. Missing means GCN's. */
  logo?: string;
};

/** The invoice for one client's month, from that client's entries. */
export function buildInvoice(entries: Entry[], client: Client, owner: Settings, period: Period, now = Date.now()): Invoice {
  const inMonth = entriesOf(entries, client.id)
    .filter((e) => e.start >= period.from && e.start < period.to)
    .sort((a, b) => a.start - b.start);
  const ms = inMonth.reduce((n, e) => n + (e.end - e.start), 0);
  const hours = Math.round((ms / HOUR) * 100) / 100;
  const settings = settingsFor(owner, client);
  return {
    periodId: period.id,
    // GCN's September 2026 went by hand before saved copies existed, so it counts as issued.
    status: client.id === DEFAULT_CLIENT && period.id < FIRST_SAVED ? "issued" : "draft",
    number: `XD-${client.short}-${period.id}`,
    period: period.label,
    issued: fmtDate(now),
    lines: inMonth.map((e) => ({
      date: fmtDate(e.start),
      time: `${fmtTime(e.start)}–${fmtTime(e.end)}`,
      task: e.task,
      notes: e.notes,
      hours: Math.round(((e.end - e.start) / HOUR) * 100) / 100,
    })),
    hours,
    total: Math.round(hours * settings.rate * 100) / 100,
    settings,
    clientId: client.id,
    billTo: client.billTo,
    logo: client.logo,
  };
}

/** GCN invoices before this period were sent before saved copies existed. */
export const FIRST_SAVED = "2026-10";

/** True when this period's invoice counts as sent without a saved copy (GCN, by hand, before FIRST_SAVED). */
export function sentByHand(client: Client, periodId: string): boolean {
  return client.id === DEFAULT_CLIENT && periodId < FIRST_SAVED;
}

const SNAP = (client: string, id: string) => scoped(client, `inv:${id}`);

/** The saved copy of an invoice that has been sent, if there is one. */
export async function savedInvoice(client: string, id: string): Promise<Invoice | null> {
  const [raw] = await redis([["GET", SNAP(client, id)]]);
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as Invoice;
  } catch {
    return null;
  }
}

/** The invoice for a client's period as anyone should see it: the saved copy once sent, else a live draft. */
export async function invoiceFor(client: Client, period: Period): Promise<Invoice> {
  const saved = await savedInvoice(client.id, period.id);
  if (saved) return saved;
  const [entries, owner] = await Promise.all([allEntries(), getSettings()]);
  return buildInvoice(entries, client, owner, period);
}

/**
 * One row of the invoice list: a month, what it came to, whether it has gone
 * out and whether it has been paid. "open" is the month still running,
 * "pending" a closed month whose invoice hasn't been sent yet (the cron sends
 * it the night the month ends), "sent" one that has.
 */
export type InvoiceRow = {
  client: string;
  periodId: string;
  label: string;
  number: string;
  hours: number;
  total: number;
  currency: string;
  status: "open" | "pending" | "sent";
  sentAt: number | null;
  paid: Payment | null;
};

/**
 * Every month from the first logged hour to now, with its invoice. Sent
 * invoices come from their saved copies; the rest are built from the log.
 * `payments` is what the owner has marked paid, by period id.
 */
export async function listInvoices(entries: Entry[], client: Client, owner: Settings, payments: Record<string, Payment>, now = Date.now()): Promise<InvoiceRow[]> {
  const mine = entriesOf(entries, client.id);
  if (!mine.length) return [];
  const current = periodContaining(now);
  const first = periodContaining(Math.min(...mine.map((e) => e.start)));
  const months: Period[] = [];
  for (let p = first; p.id <= current.id && months.length < 240; p = periodContaining(p.to)) months.push(p);
  const saved = await redis(months.map((p) => ["GET", SNAP(client.id, p.id)]));
  return months.map((p, i) => {
    let inv: Invoice | null = null;
    if (typeof saved[i] === "string") {
      try {
        inv = JSON.parse(saved[i] as string) as Invoice;
      } catch {
        inv = null;
      }
    }
    const live = inv ?? buildInvoice(mine, client, owner, p, now);
    const sent = !!inv || sentByHand(client, p.id);
    return {
      client: client.id,
      periodId: p.id,
      label: p.label,
      number: live.number,
      hours: live.hours,
      total: live.total,
      currency: live.settings.currency,
      status: sent ? "sent" : p.id === current.id ? "open" : "pending",
      sentAt: inv?.sentAt ?? null,
      paid: payments[p.id] ?? null,
    };
  });
}

/** One client's invoice list with everything it needs read. */
export async function invoiceList(client: Client, now = Date.now()): Promise<InvoiceRow[]> {
  const [entries, owner, payments] = await Promise.all([allEntries(), getSettings(), allPayments(client.id)]);
  return listInvoices(entries, client, owner, payments, now);
}

/** Every client's invoice rows in one list (each row names its client). */
export async function allInvoiceRows(entries: Entry[], clients: Client[], owner: Settings, now = Date.now()): Promise<InvoiceRow[]> {
  const out: InvoiceRow[] = [];
  for (const c of clients) out.push(...(await listInvoices(entries, c, owner, await allPayments(c.id), now)));
  return out;
}

/** What is still owed: every sent invoice not yet marked paid. */
export function owed(rows: InvoiceRow[]): { total: number; count: number } {
  const due = rows.filter((r) => r.status === "sent" && !r.paid && r.total > 0);
  return { total: Math.round(due.reduce((n, r) => n + r.total, 0) * 100) / 100, count: due.length };
}

export class AlreadySent extends Error {
  constructor(public sentAt: number) {
    super("already sent");
  }
}
export class EmptyInvoice extends Error {}

/**
 * Issue and email an invoice. The first send saves the copy (SET NX, so two
 * sends can't both issue it) before the email goes, and removes it again if
 * the email fails, so a failed send leaves nothing issued. A later send of
 * the same period only happens with `resend`, and mails the saved copy.
 */
export async function sendInvoice(client: Client, period: Period, token: string, opts: { resend?: boolean } = {}): Promise<Invoice> {
  // GCN's September 2026 went out by hand before saved copies existed.
  if (sentByHand(client, period.id)) throw new AlreadySent(0);
  const to = invoiceRecipients(client);
  if (!to.length) throw new NoRecipient("no address");
  const saved = await savedInvoice(client.id, period.id);
  if (saved) {
    if (!opts.resend) throw new AlreadySent(saved.sentAt ?? 0);
    await emailInvoice(saved, invoiceUrl(token, period.id), to);
    return saved;
  }
  const [entries, owner] = await Promise.all([allEntries(), getSettings()]);
  const draft = buildInvoice(entries, client, owner, period);
  if (draft.lines.length === 0) throw new EmptyInvoice("no hours");
  const now = Date.now();
  const inv: Invoice = { ...draft, status: "issued", sentAt: now, issued: fmtDate(now) };
  const [claimed] = await redis([["SET", SNAP(client.id, period.id), JSON.stringify(inv), "NX"]]);
  if (claimed !== "OK") {
    const other = await savedInvoice(client.id, period.id);
    throw new AlreadySent(other?.sentAt ?? now);
  }
  try {
    await emailInvoice(inv, invoiceUrl(token, period.id), to);
  } catch (err) {
    await redis([["DEL", SNAP(client.id, period.id)]]).catch(() => undefined);
    throw err;
  }
  return inv;
}

/** The client has no email to send invoices to. */
export class NoRecipient extends Error {}

/** A short note to the owner: a failed send, a forgotten timer. Best effort. */
export async function notifyOwner(subject: string, body: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const from = process.env.WORK_INVOICE_FROM || "Work log <invoices@xerxesduane.com>";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [OWNER_EMAIL],
      subject,
      html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#2b2420;">${body}<p style="color:#8a7f75;font-size:13px;">work.xerxesduane.com</p></div>`,
    }),
  }).catch(() => undefined);
}

/**
 * The invoice as a full HTML document. Inline styles only, table layout, so
 * the same markup survives Gmail and Outlook as well as the print dialog.
 * `printable` adds the Print / Save as PDF button, which the email leaves out.
 */
export function renderInvoice(inv: Invoice, opts: { printable?: boolean; viewUrl?: string; pdfUrl?: string } = {}): string {
  const { settings: s } = inv;
  const BILL = billToOf(inv);
  // The page loads the logo from its own origin (the CSP allows only that);
  // an email needs the absolute address.
  const logoPath = logoOf(inv);
  const logo = logoPath ? (opts.printable ? logoPath : `${WORK_ORIGIN}${logoPath}`) : "";
  const ownLogo = opts.printable ? OWN_LOGO_PATH : `${WORK_ORIGIN}${OWN_LOGO_PATH}`;
  const cur = s.currency;
  const td = "padding:10px 8px;border-bottom:1px solid #e6e2d8;vertical-align:top;font-size:14px;color:#2b2420;";
  const th = "padding:8px;border-bottom:2px solid #2b1a14;text-align:left;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#6b5f55;";
  const rows = inv.lines.length
    ? inv.lines
        .map(
          (l) => `<tr>
  <td style="${td}white-space:nowrap;">${esc(l.date)}<br><span style="color:#8a7f75;font-size:12px;">${esc(l.time)}</span></td>
  <td style="${td}"><strong>${esc(l.task)}</strong>${l.notes ? `<br><span style="color:#6b5f55;font-size:13px;white-space:pre-line;">${esc(l.notes)}</span>` : ""}</td>
  <td style="${td}text-align:right;white-space:nowrap;">${l.hours.toFixed(2)}</td>
</tr>`,
        )
        .join("\n")
    : `<tr><td colspan="3" style="${td}text-align:center;color:#8a7f75;">No hours logged in this period.</td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Invoice ${esc(inv.number)} · ${esc(BILL.name)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  @media print { .no-print { display: none !important; } body { background: #fff !important; } .sheet { box-shadow: none !important; margin: 0 !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2b2420;">
${
  opts.printable
    ? `<div class="no-print" style="max-width:760px;margin:16px auto 0;padding:0 16px;text-align:right;">
  ${opts.pdfUrl ? `<a href="${esc(opts.pdfUrl)}" style="display:inline-block;font:600 15px/1 inherit;padding:12px 20px;margin-right:8px;border-radius:999px;border:1px solid #2b1a14;color:#2b1a14;text-decoration:none;">Download PDF</a>` : ""}
  <button onclick="window.print()" style="font:600 15px/1 inherit;padding:12px 20px;border-radius:999px;border:0;background:#2b1a14;color:#fff;cursor:pointer;">Print</button>
</div>`
    : ""
}
<table role="presentation" class="sheet" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;margin:16px auto;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
<tr><td style="padding:32px 32px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="vertical-align:top;">${logo ? `<img src="${esc(logo)}" alt="${esc(BILL.name)}" width="200" style="display:block;width:200px;max-width:100%;height:auto;">` : `<div style="font-size:22px;font-weight:800;color:#2b1a14;">${esc(s.client)}</div>`}</td>
      <td style="vertical-align:top;text-align:right;">
        <div style="font-size:28px;font-weight:800;letter-spacing:.02em;color:${inv.status === "draft" ? "#a6410a" : "#2b1a14"};">${inv.status === "draft" ? "DRAFT" : "INVOICE"}</div>
        <div style="font-size:14px;color:#6b5f55;margin-top:4px;">No. <strong style="color:#2b2420;">${esc(inv.number)}</strong></div>
        <div style="font-size:14px;color:#6b5f55;">${inv.status === "draft" ? "Not issued yet: totals update as hours are logged" : `Issued ${esc(inv.issued)}`}</div>
        <div style="font-size:14px;color:#6b5f55;">Period: ${esc(inv.period)}</div>
      </td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding:16px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="vertical-align:top;width:50%;padding-right:12px;font-size:14px;line-height:1.5;">
        <div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#8a7f75;margin-bottom:4px;">Bill to</div>
        <strong>${esc(BILL.name)}</strong><br>
        ${[...BILL.lines, BILL.phone].filter(Boolean).map(esc).join("<br>")}${BILL.lines.length || BILL.phone ? "<br>" : ""}
        ${[BILL.email && `<a href="mailto:${esc(BILL.email)}" style="color:#3b6b35;">${esc(BILL.email)}</a>`, BILL.web && `<a href="https://${esc(BILL.web)}" style="color:#3b6b35;">${esc(BILL.web)}</a>`].filter(Boolean).join(" · ")}
      </td>
      <td style="vertical-align:top;width:50%;padding-left:12px;font-size:14px;line-height:1.5;text-align:right;">
        <img src="${ownLogo}" alt="Xerxes Duane" width="140" style="display:inline-block;width:140px;max-width:100%;height:auto;margin:0 -12px 6px 0;">
        <div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#8a7f75;margin-bottom:4px;">From</div>
        <strong>${esc(s.name)}</strong><br>
        ${FROM_ADDRESS.join("<br>")}<br>
        <a href="mailto:${esc(OWNER_EMAIL)}" style="color:#3b6b35;">${esc(OWNER_EMAIL)}</a><br>
        Rate: ${money(s.rate, cur)} / hour
      </td>
    </tr>
  </table>
</td></tr>
<tr><td style="padding:8px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <thead><tr><th style="${th}">Date</th><th style="${th}">Work done</th><th style="${th}text-align:right;">Hours</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</td></tr>
<tr><td style="padding:8px 32px 28px;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-left:auto;font-size:14px;">
    <tr><td style="padding:4px 16px 4px 0;color:#6b5f55;">Total hours</td><td style="padding:4px 0;text-align:right;">${inv.hours.toFixed(2)} h</td></tr>
    <tr><td style="padding:4px 16px 4px 0;color:#6b5f55;">Rate</td><td style="padding:4px 0;text-align:right;">${money(s.rate, cur)} / h</td></tr>
    <tr><td style="padding:10px 16px 4px 0;border-top:2px solid #2b1a14;font-weight:800;font-size:16px;">Amount due</td><td style="padding:10px 0 4px;border-top:2px solid #2b1a14;text-align:right;font-weight:800;font-size:16px;color:#2b1a14;">${money(inv.total, cur)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 32px 20px;">
  <div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#8a7f75;margin-bottom:6px;">Payment by bank transfer</div>
  <div style="font-size:13px;line-height:1.5;color:#2b2420;">Account holder: <strong>${PAYMENT.holder}</strong><br>Holder address: ${PAYMENT.holderAddress}<br>Bank: ${PAYMENT.bank} · SWIFT/BIC: <strong>${PAYMENT.swift}</strong></div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;font-size:13px;line-height:1.5;">
    <tr>${PAYMENT.accounts
      .map(
        (a) => `<td style="vertical-align:top;width:50%;padding:10px 12px;border:1px solid #e6e2d8;border-radius:8px;">
      <strong>${a.currency} account</strong><br>Account no. ${a.number}<br>IBAN <strong>${a.iban}</strong><br><span style="color:#8a7f75;font-size:12px;">${a.note}</span></td>`,
      )
      .join('<td style="width:12px;"></td>')}</tr>
  </table>
  <div style="font-size:12px;color:#8a7f75;margin-top:6px;">Please use ${esc(inv.number)} as the payment reference.</div>
</td></tr>
<tr><td style="padding:0 32px 32px;font-size:12px;color:#8a7f75;line-height:1.5;">
  Times are in Dubai time (UTC+4). Amount is total hours × the hourly rate.${
    opts.viewUrl ? `<br>View this invoice online: <a href="${esc(opts.viewUrl)}" style="color:#3b6b35;">${esc(opts.viewUrl)}</a>` : ""
  }
</td></tr>
</table>
</body>
</html>`;
}

/** The address of the printable invoice, behind the client's link token. */
export function invoiceUrl(token: string, period: string): string {
  return `${WORK_ORIGIN}/api/work/invoice?t=${encodeURIComponent(token)}&p=${period}`;
}

/**
 * Send the invoice by email through Resend (RESEND_API_KEY). The owner is
 * copied and set as reply-to, so GCN's answer comes straight back.
 */
export async function emailInvoice(inv: Invoice, viewUrl: string, to: string[]): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new MailMissing("no key");
  const from = process.env.WORK_INVOICE_FROM || `${inv.settings.name} <invoices@xerxesduane.com>`;
  const html = renderInvoice(inv, { viewUrl });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      cc: [OWNER_EMAIL],
      reply_to: OWNER_EMAIL,
      subject: `Invoice ${inv.number} · ${inv.period} · ${money(inv.total, inv.settings.currency)}`,
      html,
      attachments: [{ filename: `Invoice-${inv.number}.pdf`, content: toBase64(await renderPdf(inv, "invoice", WORK_ORIGIN)) }],
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export class MailMissing extends Error {}
