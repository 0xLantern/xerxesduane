// The twice-monthly invoice for the hours log: built from the same entries and rate
// the log shows, rendered as one self-contained HTML page that works both as
// the printable invoice (Save as PDF from the browser) and as the email body.
//
// The client is fixed, so the bill-to block is too. Totals follow the log's
// own rule (src/work/time.ts fmtMoney): hours rounded to two decimals, times
// the rate, rounded to the cent once at the end.
import { OWNER_EMAIL, type Entry, type Settings } from "./_lib";
import { renderPdf, toBase64 } from "./_pdf";

export const BILL_TO = {
  name: "GCN Great Commission Network",
  lines: ["Mattenstrasse 62", "3800 Matten – Switzerland"],
  phone: "+41 79 376 87 33",
  email: "bb@gcn.live",
  web: "www.gcn.live",
} as const;

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
  bank: "Mashreq Bank, Dubai, UAE",
  swift: "BOMLAEAD",
  accounts: [
    { currency: "USD", number: "019010742613", iban: "AE450330000019010742613", note: "Preferred: the invoice is in USD." },
    { currency: "CHF", number: "019010742614", iban: "AE180330000019010742614", note: "If paying in CHF: the USD amount at the day's rate." },
  ],
} as const;

/** Where the monthly email goes. WORK_INVOICE_TO overrides it (comma-separated). */
export function invoiceRecipients(): string[] {
  const raw = process.env.WORK_INVOICE_TO || BILL_TO.email;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Same as WORK_ORIGIN in src/lib/host.ts, which is browser code and not importable here. */
export const WORK_ORIGIN = "https://work.xerxesduane.com";
const LOGO = `${WORK_ORIGIN}/brand/clients/gcn.png`;
const OWN_LOGO_PATH = "/brand/mono/logo-black@2x.png";

// Dubai time, UTC+4 all year: the same days and months the log shows.
const OFFSET = 4 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n: number) => String(n).padStart(2, "0");

const DAY = 24 * HOUR;

/** Days in a month (0-based month), by UTC calendar. */
function daysIn(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** The instant of a Dubai midnight. Month is 0-based and may overflow. */
function dubaiMidnight(y: number, m: number, d: number): number {
  return Date.UTC(y, m, d) - OFFSET;
}

/**
 * Invoices go out twice a month, on the 15th and on the last day of the
 * month (the 30th, 31st, or 28th/29th in February). Each covers everything
 * since the one before, so no hour is billed twice or missed.
 * the next month's first invoice and no hour is billed twice or missed.
 *
 *   YYYY-MM-A  the 1st through the 15th
 *   YYYY-MM-B  the 16th through the last day of the month
 */
export type Period = { id: string; from: number; to: number; label: string };

/** The B period's last day: the month's last day. */
function cutDay(y: number, m: number): number {
  return daysIn(y, m);
}

export function periodFor(id: unknown): Period | null {
  const match = typeof id === "string" ? /^(20\d{2})-(0[1-9]|1[0-2])-([AB])$/.exec(id) : null;
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  if (match[3] === "A") {
    const from = dubaiMidnight(y, m - 1, cutDay(y, m - 1) + 1);
    const to = dubaiMidnight(y, m, 16);
    return { id: match[0], from, to, label: `${fmtDate(from)} – ${fmtDate(to - DAY)}` };
  }
  const from = dubaiMidnight(y, m, 16);
  const to = dubaiMidnight(y, m, cutDay(y, m) + 1);
  return { id: match[0], from, to, label: `${fmtDate(from)} – ${fmtDate(to - DAY)}` };
}

/** The period whose last day is today in Dubai, or null on any other day. */
export function periodEndingOn(ms: number): Period | null {
  const d = new Date(ms + OFFSET);
  const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
  const key = `${y}-${pad(m + 1)}`;
  if (day === 15) return periodFor(`${key}-A`);
  if (day === cutDay(y, m)) return periodFor(`${key}-B`);
  return null;
}

/** The period an instant falls in. */
export function periodContaining(ms: number): Period {
  const d = new Date(ms + OFFSET);
  const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
  if (day > cutDay(y, m)) return periodFor(`${y + (m === 11 ? 1 : 0)}-${pad(((m + 1) % 12) + 1)}-A`)!;
  return periodFor(`${y}-${pad(m + 1)}-${day <= 15 ? "A" : "B"}`)!;
}

/** A whole calendar month in Dubai, for the work log export. id is YYYY-MM. */
export function monthPeriod(id: unknown): Period | null {
  const match = typeof id === "string" ? /^(20\d{2})-(0[1-9]|1[0-2])$/.exec(id) : null;
  if (!match) return null;
  const [y, m] = [Number(match[1]), Number(match[2]) - 1];
  return { id: match[0], from: dubaiMidnight(y, m, 1), to: dubaiMidnight(y, m + 1, 1), label: `${MONTHS[m]} ${y}` };
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

function fmtDate(ms: number): string {
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
  number: string;
  period: string;
  issued: string;
  lines: { date: string; time: string; task: string; notes: string; hours: number }[];
  hours: number;
  total: number;
  settings: Settings;
};

export function buildInvoice(entries: Entry[], settings: Settings, period: Period, now = Date.now()): Invoice {
  const inMonth = entries.filter((e) => e.start >= period.from && e.start < period.to).sort((a, b) => a.start - b.start);
  const ms = inMonth.reduce((n, e) => n + (e.end - e.start), 0);
  const hours = Math.round((ms / HOUR) * 100) / 100;
  return {
    number: `XD-GCN-${period.id}`,
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
  };
}

/**
 * The invoice as a full HTML document. Inline styles only, table layout, so
 * the same markup survives Gmail and Outlook as well as the print dialog.
 * `printable` adds the Print / Save as PDF button, which the email leaves out.
 */
export function renderInvoice(inv: Invoice, opts: { printable?: boolean; viewUrl?: string; pdfUrl?: string } = {}): string {
  const { settings: s } = inv;
  // The page loads the logo from its own origin (the CSP allows only that);
  // an email needs the absolute address.
  const logo = opts.printable ? "/brand/clients/gcn.png" : LOGO;
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
<title>Invoice ${esc(inv.number)} · ${esc(BILL_TO.name)}</title>
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
      <td style="vertical-align:top;"><img src="${logo}" alt="GCN Great Commission Network" width="200" style="display:block;width:200px;max-width:100%;height:auto;"></td>
      <td style="vertical-align:top;text-align:right;">
        <div style="font-size:28px;font-weight:800;letter-spacing:.02em;color:#2b1a14;">INVOICE</div>
        <div style="font-size:14px;color:#6b5f55;margin-top:4px;">No. <strong style="color:#2b2420;">${esc(inv.number)}</strong></div>
        <div style="font-size:14px;color:#6b5f55;">Issued ${esc(inv.issued)}</div>
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
        <strong>${esc(BILL_TO.name)}</strong><br>
        ${BILL_TO.lines.map(esc).join("<br>")}<br>
        ${esc(BILL_TO.phone)}<br>
        <a href="mailto:${BILL_TO.email}" style="color:#3b6b35;">${BILL_TO.email}</a> · <a href="https://${BILL_TO.web}" style="color:#3b6b35;">${BILL_TO.web}</a>
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
  <div style="font-size:13px;line-height:1.5;color:#2b2420;">Account holder: <strong>${PAYMENT.holder}</strong><br>Bank: ${PAYMENT.bank} · SWIFT/BIC: <strong>${PAYMENT.swift}</strong></div>
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
export async function emailInvoice(inv: Invoice, viewUrl: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new MailMissing("no key");
  const from = process.env.WORK_INVOICE_FROM || `${inv.settings.name} <invoices@xerxesduane.com>`;
  const html = renderInvoice(inv, { viewUrl });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: invoiceRecipients(),
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
