/**
 * The letter editor's PDF: title, date, paragraphs, headings, quotes and
 * photos with captions, set on A4 in the browser with pdf-lib, so the owner
 * needs no other tool. The result goes through the same publish flow as an
 * uploaded PDF.
 *
 * The standard fonts cover Latin-1 only, so anything else becomes "?"; the
 * editor warns when it sees such characters. Photos are resized to at most
 * PHOTO_PX wide and saved as JPEG, which keeps a letter with eight photos
 * under a few megabytes.
 */
export type Block =
  | { id: string; kind: "paragraph"; text: string }
  | { id: string; kind: "heading"; text: string }
  | { id: string; kind: "quote"; text: string }
  | { id: string; kind: "photo"; dataUrl: string; caption: string };

export type Draft = {
  v: 1;
  title: string;
  /** The date line under the title, free text: "October 2026". */
  dateLine: string;
  greeting: string;
  blocks: Block[];
  closing: string;
  signature: string;
  updatedAt: number;
};

export const PHOTO_PX = 1400;
const A4: [number, number] = [595.28, 841.89];
const M = 56;
const BODY = 11.5;
const LEAD = 17;

export const newId = () => Math.random().toString(36).slice(2, 10);

export function emptyDraft(sender: string): Draft {
  const now = new Date();
  return {
    v: 1,
    title: "",
    dateLine: now.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Dubai" }),
    greeting: "Dear friends,",
    blocks: [{ id: newId(), kind: "paragraph", text: "" }],
    closing: "With gratitude,",
    signature: sender,
    updatedAt: Date.now(),
  };
}

const EXTRA = new Set("–—‘’“”•…€×");

/** Characters the standard fonts can't set. */
export function unsupported(text: string): string[] {
  const out = new Set<string>();
  for (const ch of text.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    if (ch === "\n" || ch === "\t" || (c >= 32 && c < 127) || (c >= 160 && c < 256) || EXTRA.has(ch)) continue;
    out.add(ch);
  }
  return [...out];
}

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

/** Shrink an image file to a JPEG data URL at most PHOTO_PX wide. */
export async function shrinkPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That image couldn't be opened."));
      i.src = url;
    });
    const scale = Math.min(1, PHOTO_PX / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bytesOf(dataUrl: string): Uint8Array {
  const b = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

/** Lay the draft out as a PDF. */
export async function composePdf(d: Draft, sender: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(clean(d.title || "Letter"));
  doc.setAuthor(clean(sender));
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const INK = rgb(0.17, 0.1, 0.08);
  const SOFT = rgb(0.42, 0.37, 0.33);
  const ACCENT = rgb(0.54, 0.42, 0.18);
  const [W, H] = A4;
  const width = W - 2 * M;

  type Font = typeof serif;
  const wrap = (text: string, font: Font, size: number, w: number): string[] => {
    const lines: string[] = [];
    for (const para of clean(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= w) line = next;
        else {
          if (line) lines.push(line);
          let rest = word;
          while (font.widthOfTextAtSize(rest, size) > w) {
            let n = rest.length;
            while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > w) n--;
            lines.push(rest.slice(0, n));
            rest = rest.slice(n);
          }
          line = rest;
        }
      }
      lines.push(line);
    }
    return lines;
  };

  let page = doc.addPage(A4);
  let y = H - M;
  let pageNo = 1;
  const footer = () => {
    const t = clean(`${d.title || "Letter"} · ${sender}`);
    page.drawText(t, { x: M, y: 30, size: 8, font: sans, color: SOFT });
    const n = String(pageNo);
    page.drawText(n, { x: W - M - sans.widthOfTextAtSize(n, 8), y: 30, size: 8, font: sans, color: SOFT });
  };
  const newPage = () => {
    footer();
    page = doc.addPage(A4);
    pageNo++;
    y = H - M;
  };
  const need = (h: number) => {
    if (y - h < M + 10) newPage();
  };
  const lines = (text: string, font: Font, size: number, lead: number, color = INK, x = M, w = width) => {
    for (const l of wrap(text, font, size, w)) {
      need(lead);
      page.drawText(l, { x, y: y - size, size, font, color });
      y -= lead;
    }
  };

  // Title block.
  page.drawText(clean(`A LETTER FROM ${sender.toUpperCase()}`), { x: M, y: y - 8, size: 8, font: sansBold, color: ACCENT });
  y -= 24;
  lines(d.title || "Untitled", serifBold, 26, 30);
  if (d.dateLine.trim()) {
    y -= 2;
    lines(d.dateLine, sans, 9.5, 14, SOFT);
  }
  y -= 14;
  page.drawLine({ start: { x: M, y }, end: { x: M + 60, y }, thickness: 1.2, color: ACCENT });
  y -= 22;

  if (d.greeting.trim()) {
    lines(d.greeting, serif, BODY, LEAD);
    y -= 8;
  }

  for (const b of d.blocks) {
    if (b.kind === "paragraph") {
      if (!b.text.trim()) continue;
      lines(b.text, serif, BODY, LEAD);
      y -= 9;
    } else if (b.kind === "heading") {
      if (!b.text.trim()) continue;
      need(40);
      y -= 6;
      lines(b.text, sansBold, 12.5, 17);
      y -= 4;
    } else if (b.kind === "quote") {
      if (!b.text.trim()) continue;
      const top = y;
      lines(b.text, serifItalic, BODY, LEAD, SOFT, M + 18, width - 18);
      page.drawLine({ start: { x: M + 4, y: top - 2 }, end: { x: M + 4, y: y + 4 }, thickness: 1.5, color: ACCENT });
      y -= 9;
    } else if (b.kind === "photo") {
      let img;
      try {
        img = await doc.embedJpg(bytesOf(b.dataUrl));
      } catch {
        continue;
      }
      const w = Math.min(width, img.width);
      let h = (img.height / img.width) * w;
      // A tall photo is capped at half a page, keeping its proportions.
      const maxH = (H - 2 * M) * 0.55;
      const drawW = h > maxH ? (maxH / h) * w : w;
      h = Math.min(h, maxH);
      const capLines = b.caption.trim() ? wrap(b.caption, serifItalic, 9.5, width) : [];
      need(h + capLines.length * 13 + 14);
      page.drawImage(img, { x: M + (width - drawW) / 2, y: y - h, width: drawW, height: h });
      y -= h + 6;
      for (const l of capLines) {
        page.drawText(l, { x: M + (width - serifItalic.widthOfTextAtSize(l, 9.5)) / 2, y: y - 9.5, size: 9.5, font: serifItalic, color: SOFT });
        y -= 13;
      }
      y -= 12;
    }
  }

  if (d.closing.trim() || d.signature.trim()) {
    need(LEAD * 3 + 10);
    y -= 6;
    if (d.closing.trim()) lines(d.closing, serif, BODY, LEAD);
    if (d.signature.trim()) lines(d.signature, serifBold, BODY, LEAD);
  }
  footer();
  return doc.save();
}

// ---------------------------------------------------------------------------
// The draft on this device
// ---------------------------------------------------------------------------

const DRAFT_KEY = "letters-desk:draft";

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const d = raw ? (JSON.parse(raw) as Draft) : null;
    return d && d.v === 1 && Array.isArray(d.blocks) ? d : null;
  } catch {
    return null;
  }
}

/** False when the browser wouldn't keep it (too many photos for its storage, private mode). */
export function saveDraft(d: Draft): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* fine */
  }
}
