/**
 * Shared by the partner-letter pages (src/letters) and their API
 * (api/letters): the letter's shape, a strict Markdown renderer, and the
 * encryption helpers. Imports nothing, so both sides can use it.
 *
 * The design follows Stello's (github.com/gracious-tech/stello, MIT-0):
 * every partner gets their own copy, encrypted with AES-GCM-256 under a key
 * that lives only in the fragment of their link (after the #). Browsers
 * never send the fragment to a server, so what is stored is ciphertext the
 * server cannot read, and each copy is deleted after 30 days.
 */

export const LIFESPAN_DAYS = 30;

export type Section = { heading: string; body: string };

/** A letter as written: Markdown bodies, plain prayer lines. */
export type Draft = {
  title: string;
  sections: Section[];
  prayer: string[];
  images: { id: string; caption: string }[];
  giving: { url: string; label: string };
};

/** What a partner's copy decrypts to: rendered, personalised, ready to show. */
export type Letter = {
  title: string;
  sender: string;
  sentAt: number;
  expiresAt: number;
  sections: { heading: string; html: string }[];
  prayer: string[];
  images: { id: string; caption: string }[];
  giving: { url: string; label: string } | null;
  /** The key for this send's images, base64url. Absent in previews. */
  imageKey?: string;
  sendId?: string;
};

// ---------------------------------------------------------------------------
// Markdown: a small, strict subset. Everything is escaped first, so no HTML a
// writer types can reach a partner's page; only these constructs come back.
//   ## heading   ### subheading   - bullets   1. numbers   > quote
//   **bold**   *italic*   [text](https://…)   blank line = new paragraph
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Only http(s) and mailto links survive. */
export function safeUrl(url: string): string | null {
  const u = url.trim();
  // eslint-disable-next-line no-control-regex -- control characters are exactly what this rejects
  if (/[\x00-\x1f\x7f\s]/.test(u)) return null;
  if (/^(https?:\/\/|mailto:)/i.test(u)) return u;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(u)) return `https://${u}`;
  return null;
}

function inline(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
    const url = safeUrl(href.replace(/&amp;/g, "&"));
    return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
  });
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");
  return s;
}

export function markdownToHtml(md: string): string {
  const out: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`);
    list = null;
  };
  for (const raw of md.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if (!line) {
      flushPara();
      flushList();
    } else if ((m = /^(#{2,3})\s+(.+)$/.exec(line))) {
      flushPara();
      flushList();
      out.push(m[1].length === 2 ? `<h3>${inline(m[2])}</h3>` : `<h4>${inline(m[2])}</h4>`);
    } else if ((m = /^[-*•]\s+(.+)$/.exec(line)) || (m = /^\d+[.)]\s+(.+)$/.exec(line))) {
      flushPara();
      const tag = /^\d/.test(line) ? "ol" : "ul";
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(m[1]);
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      flushPara();
      flushList();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out.join("\n");
}

/** {{hello}} and {{name}} become the partner's greeting name and full name. */
export function personalise(text: string, p: { name: string; hello: string }): string {
  return text.replace(/\{\{\s*(hello|name)\s*\}\}/gi, (_m, k: string) => (k.toLowerCase() === "name" ? p.name : p.hello || p.name));
}

export function renderLetter(
  d: Draft,
  p: { name: string; hello: string },
  meta: { sender: string; sentAt: number; expiresAt: number },
): Letter {
  const giving = d.giving.url && safeUrl(d.giving.url) ? { url: safeUrl(d.giving.url)!, label: d.giving.label || "Support the work" } : null;
  return {
    title: personalise(d.title, p),
    sender: meta.sender,
    sentAt: meta.sentAt,
    expiresAt: meta.expiresAt,
    sections: d.sections
      .filter((s) => s.heading.trim() || s.body.trim())
      .map((s) => ({ heading: personalise(s.heading, p), html: markdownToHtml(personalise(s.body, p)) })),
    prayer: d.prayer.map((x) => personalise(x, p).trim()).filter(Boolean),
    images: d.images,
    giving,
  };
}

/** A Web Crypto key, typed the same in the browser and in edge functions. */
type Key = Parameters<typeof crypto.subtle.encrypt>[1];
type Bytes = Parameters<typeof crypto.subtle.encrypt>[2];

// ---------------------------------------------------------------------------
// Crypto: AES-GCM, 256-bit keys, 96-bit IV prepended (iv | ciphertext | tag).
// ---------------------------------------------------------------------------

export function toB64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

export async function newKey(): Promise<{ key: Key; raw: string }> {
  const key = (await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])) as Key;
  return { key, raw: toB64url(new Uint8Array(await crypto.subtle.exportKey("raw", key))) };
}

export function importKey(raw: string): Promise<Key> {
  return crypto.subtle.importKey("raw", fromB64url(raw) as Bytes, "AES-GCM", false, ["decrypt"]);
}

export async function encrypt(data: Uint8Array, key: Key): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data as Bytes));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return out;
}

export async function decrypt(data: Uint8Array, key: Key): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.subarray(0, 12) as Bytes }, key, data.subarray(12) as Bytes));
}
