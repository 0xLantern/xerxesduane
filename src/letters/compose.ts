/**
 * The letter editor's PDF: title, date, paragraphs, headings, quotes and
 * photos with captions, set on A4 in the browser with pdf-lib, so the owner
 * needs no other tool. The result goes through the same publish flow as an
 * uploaded PDF.
 *
 * Set in the site's own type: Noto Serif for the letter's body (Latin,
 * Vietnamese, Greek and Cyrillic) and Plus Jakarta Sans for headings and
 * labels, both embedded and subset, so a letter carries only the letters it
 * uses. The fonts are served from /fonts/letter and fetched only when a PDF
 * is made. Emoji and scripts neither font has (Korean, Arabic…) are left
 * out, and the editor says which. Photos are resized to at most
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

/** What the letter fonts can set: Latin (with Vietnamese), Greek, Cyrillic and common punctuation. */
function settable(c: number): boolean {
  return (
    (c >= 0x20 && c <= 0x24f) ||
    (c >= 0x370 && c <= 0x3ff) ||
    (c >= 0x400 && c <= 0x4ff) ||
    (c >= 0x1e00 && c <= 0x1eff) ||
    (c >= 0x2000 && c <= 0x206f && c !== 0x200d) ||
    (c >= 0x20a0 && c <= 0x20cf) ||
    c === 0x2122 ||
    c === 0x2116
  );
}

/** Characters the letter can't set (emoji, Korean, Arabic…): they're left out of the PDF. */
export function unsupported(text: string): string[] {
  const out = new Set<string>();
  for (const ch of text.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    if (ch === "\n" || ch === "\t" || settable(c) || c === 0xfe0f || (c >= 0x1f3fb && c <= 0x1f3ff)) continue;
    out.add(ch);
  }
  return [...out];
}

function clean(s: string): string {
  let out = "";
  let dropped = false;
  for (const ch of s.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    if (ch === "\n" || settable(c)) out += ch;
    else if (ch === "\t") out += " ";
    else dropped = true;
  }
  if (!dropped) return out;
  // Leaving out an emoji can leave a space where it stood: "Sharjah ." or two spaces.
  return out.replace(/ {2,}/g, " ").replace(/ +\n/g, "\n").replace(/ +([.,;:!?)])/g, "$1").trim();
}

const FONT_FILES = {
  serif: "NotoSerif_400Regular.ttf",
  serifBold: "NotoSerif_700Bold.ttf",
  serifItalic: "NotoSerif_400Regular_Italic.ttf",
  sans: "PlusJakartaSans_400Regular.ttf",
  sansBold: "PlusJakartaSans_700Bold.ttf",
} as const;

let fontBytes: Promise<Record<keyof typeof FONT_FILES, ArrayBuffer>> | null = null;

/** The five font files, fetched once per visit. */
function loadFonts() {
  fontBytes ??= Promise.all(
    Object.entries(FONT_FILES).map(async ([k, f]) => {
      const res = await fetch(`/fonts/letter/${f}`);
      if (!res.ok) throw new Error("The letter's fonts couldn't be loaded. Check your connection and try again.");
      return [k, await res.arrayBuffer()] as const;
    }),
  )
    .then((pairs) => Object.fromEntries(pairs) as Record<keyof typeof FONT_FILES, ArrayBuffer>)
    .catch((e) => {
      fontBytes = null;
      throw e;
    });
  return fontBytes;
}

/** Shrink an image file to a JPEG data URL at most PHOTO_PX wide. */
export async function shrinkPhoto(file: File, maxPx = PHOTO_PX): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That image couldn't be opened."));
      i.src = url;
    });
    const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
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
  const [{ PDFDocument, rgb }, { default: fontkit }, bytes] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit"), loadFonts()]);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(clean(d.title || "Letter"));
  doc.setAuthor(clean(sender));
  // Plus Jakarta is subset (only the letters used go in). Noto Serif is embedded
  // whole: pdf-lib's subsetter drops most of its glyphs. It adds about 1.5 MB.
  const embed = (k: keyof typeof FONT_FILES) => doc.embedFont(bytes[k], { subset: k === "sans" || k === "sansBold" });
  const [serif, serifBold, serifItalic, sansOnly, sansBoldOnly] = await Promise.all([embed("serif"), embed("serifBold"), embed("serifItalic"), embed("sans"), embed("sansBold")]);
  // Plus Jakarta has no Greek or Cyrillic: a heading in either is set in the serif instead.
  const latinOnly = (t: string) => !/[\u0370-\u04ff]/.test(t);
  const sansFor = (t: string) => (latinOnly(t) ? sansOnly : serif);
  const sansBoldFor = (t: string) => (latinOnly(t) ? sansBoldOnly : serifBold);
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
    page.drawText(t, { x: M, y: 30, size: 8, font: sansFor(t), color: SOFT });
    const n = String(pageNo);
    page.drawText(n, { x: W - M - sansOnly.widthOfTextAtSize(n, 8), y: 30, size: 8, font: sansOnly, color: SOFT });
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
  const kicker = clean(`A LETTER FROM ${sender.toUpperCase()}`);
  page.drawText(kicker, { x: M, y: y - 8, size: 8, font: sansBoldFor(kicker), color: ACCENT });
  y -= 24;
  lines(d.title || "Untitled", serifBold, 26, 30);
  if (d.dateLine.trim()) {
    y -= 8;
    lines(d.dateLine, sansFor(d.dateLine), 9.5, 14, SOFT);
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
      lines(b.text, sansBoldFor(b.text), 12.5, 17);
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
