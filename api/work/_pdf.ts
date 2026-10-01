// Real PDF files for the hours log: the invoice (see _invoice.ts) and a
// month's work log, for download and as the invoice email's attachment.
//
// pdf-lib is pure JavaScript, so this runs in the edge runtime with no
// browser. The standard Helvetica fonts only cover Latin-1 plus a few
// typographic marks, so anything else in a note is swapped for "?" rather
// than failing the whole file.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { OWNER_EMAIL } from "./_lib";
import { BILL_TO, FROM_ADDRESS, PAYMENT, type Invoice } from "./_invoice";

const INK = rgb(0.17, 0.14, 0.13);
const SOFT = rgb(0.42, 0.37, 0.33);
const FAINT = rgb(0.54, 0.5, 0.46);
const RULE = rgb(0.9, 0.89, 0.85);
const GREEN = rgb(0.23, 0.42, 0.21);

const W = 595.28;
const H = 841.89;
const M = 48;

const EXTRA = new Set("–—‘’“”•…€×");

function clean(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    if (ch === "\n" || (c >= 32 && c < 127) || (c >= 160 && c < 256) || EXTRA.has(ch)) out += ch;
    else if (ch === "\t") out += " ";
    else out += "?";
  }
  return out;
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of clean(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      // A single word longer than the column (a long URL) is cut to fit.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let n = rest.length;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > width) n--;
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

/** A logo, fetched from the site. Missing is fine: the PDF just goes without. */
async function loadLogo(doc: PDFDocument, origin: string, path: string): Promise<PDFImage | null> {
  try {
    const res = await fetch(`${origin}${path}`);
    if (!res.ok) return null;
    return await doc.embedPng(new Uint8Array(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * One document, two shapes. "invoice" carries the bill-to block and the
 * amount due; "log" is the client's record of the month's work.
 */
export async function renderPdf(inv: Invoice, kind: "invoice" | "log", origin: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const title = kind === "invoice" ? `Invoice ${inv.number}` : `Work log · ${inv.period}`;
  doc.setTitle(clean(title));
  doc.setAuthor(clean(inv.settings.name));
  doc.setSubject(clean(`${BILL_TO.name} · ${inv.period}`));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [logo, ownLogo] = await Promise.all([
    loadLogo(doc, origin, "/brand/clients/gcn.png"),
    loadLogo(doc, origin, "/brand/mono/logo-black@2x.png"),
  ]);
  const s = inv.settings;

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const text = (t: string, x: number, size: number, f = font, color = INK) => page.drawText(clean(t), { x, y, size, font: f, color });
  const right = (t: string, xr: number, size: number, f = font, color = INK) =>
    page.drawText(clean(t), { x: xr - f.widthOfTextAtSize(clean(t), size), y, size, font: f, color });

  // Header: logo left, title block right.
  if (logo) {
    const w = 170;
    const h = (logo.height / logo.width) * w;
    page.drawImage(logo, { x: M - 6, y: y - h + 6, width: w, height: h });
  }
  y -= 18;
  const draft = kind === "invoice" && inv.status === "draft";
  right(kind === "invoice" ? (draft ? "DRAFT" : "INVOICE") : "WORK LOG", W - M, 22, bold, draft ? rgb(0.65, 0.25, 0.04) : INK);
  y -= 18;
  if (kind === "invoice") {
    right(`No. ${inv.number}`, W - M, 10, bold);
    y -= 14;
    right(draft ? "Not issued yet: totals update as hours are logged" : `Issued ${inv.issued}`, W - M, 10, font, SOFT);
    y -= 14;
  }
  right(`Period: ${inv.period}`, W - M, 10, font, SOFT);
  y -= 44;

  // Parties.
  const colR = W - M;
  // The sender's own logo heads the From column.
  if (ownLogo) {
    const w = 120;
    const h = (ownLogo.height / ownLogo.width) * w;
    // The artwork has its own margin; nudge it so the mark lines up with the text edge.
    page.drawImage(ownLogo, { x: colR - w + 14, y: y - 4, width: w, height: h });
    y -= h - 4;
  }
  text(kind === "invoice" ? "BILL TO" : "CLIENT", M, 8, bold, FAINT);
  right("FROM", colR, 8, bold, FAINT);
  y -= 15;
  const leftLines = [BILL_TO.name, ...BILL_TO.lines, BILL_TO.phone, `${BILL_TO.email} · ${BILL_TO.web}`];
  const rightLines = [s.name, ...FROM_ADDRESS, OWNER_EMAIL, `Rate: ${money(s.rate, s.currency)} / hour`];
  for (let i = 0; i < Math.max(leftLines.length, rightLines.length); i++) {
    if (leftLines[i]) text(leftLines[i], M, 10, i === 0 ? bold : font, i === leftLines.length - 1 ? GREEN : INK);
    if (rightLines[i]) right(rightLines[i], colR, 10, i === 0 ? bold : font, rightLines[i] === OWNER_EMAIL ? GREEN : INK);
    y -= 14;
  }
  y -= 18;

  // Table.
  const cDate = M;
  const cWork = M + 92;
  const cHours = W - M;
  const workW = cHours - 60 - cWork;
  const head = () => {
    text("DATE", cDate, 8, bold, SOFT);
    text("WORK DONE", cWork, 8, bold, SOFT);
    right("HOURS", cHours, 8, bold, SOFT);
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.2, color: INK });
    y -= 16;
  };
  const newPage = () => {
    page = doc.addPage([W, H]);
    y = H - M;
    text(clean(title), M, 9, font, FAINT);
    y -= 24;
    head();
  };
  head();

  if (!inv.lines.length) {
    text("No hours logged in this period.", cWork, 10, font, FAINT);
    y -= 20;
  }
  for (const l of inv.lines) {
    const task = wrap(l.task, bold, 10, workW);
    const notes = l.notes ? wrap(l.notes, font, 9, workW) : [];
    const need = 12 * task.length + 11.5 * notes.length + 18;
    if (y - need < M + 40) newPage();
    const top = y;
    text(l.date, cDate, 10);
    y -= 12;
    text(l.time, cDate, 8.5, font, FAINT);
    y = top;
    right(l.hours.toFixed(2), cHours, 10);
    for (const t of task) {
      text(t, cWork, 10, bold);
      y -= 12;
    }
    for (const n of notes) {
      text(n, cWork, 9, font, SOFT);
      y -= 11.5;
    }
    y = Math.min(y, top - 24) - 4;
    page.drawLine({ start: { x: M, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.6, color: RULE });
    y -= 6;
  }

  // Totals.
  if (y < M + 90) newPage();
  y -= 6;
  const lx = W - M - 200;
  text("Total hours", lx, 10, font, SOFT);
  right(`${inv.hours.toFixed(2)} h`, W - M, 10);
  y -= 16;
  text("Rate", lx, 10, font, SOFT);
  right(`${money(s.rate, s.currency)} / h`, W - M, 10);
  y -= 10;
  page.drawLine({ start: { x: lx, y }, end: { x: W - M, y }, thickness: 1.2, color: INK });
  y -= 16;
  text(kind === "invoice" ? "Amount due" : "Amount", lx, 12, bold);
  right(money(inv.total, s.currency), W - M, 12, bold);
  y -= 34;

  if (kind === "invoice") {
    if (y < M + 130) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
    text("PAYMENT BY BANK TRANSFER", M, 8, bold, FAINT);
    y -= 14;
    text(`Account holder: ${PAYMENT.holder}`, M, 9.5);
    y -= 12.5;
    text(`Bank: ${PAYMENT.bank}  ·  SWIFT/BIC: ${PAYMENT.swift}`, M, 9.5);
    y -= 20;
    const colW = (W - 2 * M - 12) / 2;
    const top = y;
    PAYMENT.accounts.forEach((a, i) => {
      const x = M + i * (colW + 12);
      page.drawRectangle({ x, y: top - 62, width: colW, height: 74, borderColor: RULE, borderWidth: 0.8 });
      y = top;
      text(`${a.currency} account`, x + 10, 10, bold);
      y -= 13;
      text(`Account no. ${a.number}`, x + 10, 9.5);
      y -= 12.5;
      text(`IBAN ${a.iban}`, x + 10, 9.5, bold);
      y -= 12.5;
      text(a.note, x + 10, 8, font, FAINT);
    });
    y = top - 80;
    text(`Please use ${inv.number} as the payment reference.`, M, 8.5, font, SOFT);
    y -= 22;
  }
  text("Times are in Dubai time (UTC+4). Amount is total hours × the hourly rate.", M, 8, font, FAINT);

  return doc.save();
}

/** Bytes as base64, for a JSON email attachment. */
export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
