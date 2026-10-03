/**
 * Shared by the partner-letter pages (src/letters) and their API
 * (api/letters): the sizes and id shapes both sides check, what a partner's
 * copy holds, and the encryption helpers. Imports nothing, so both sides can
 * use it.
 *
 * The design follows Stello's (github.com/gracious-tech/stello, MIT-0): the
 * letter is encrypted before it leaves the writer's device, and each partner
 * gets their own copy whose key lives only in the fragment of their link
 * (after the #). Browsers never send the fragment to a server, so what is
 * stored is ciphertext the server cannot read, and all of it is deleted
 * after 30 days.
 *
 * Here the letter is a PDF the owner made elsewhere. In the owner's browser:
 *   1. a random file key encrypts the whole PDF once (iv | ciphertext | tag),
 *      and the result is uploaded in CHUNK_BYTES pieces;
 *   2. for each partner, a random link key encrypts a small Wrapped record
 *      (the file key, the title, the partner's greeting, the expiry), which is
 *      uploaded as that partner's copy under a random copy id;
 *   3. the partner's link is ministry.xerxesduane.com/l/<copyId>#<linkKey>.
 * The reader reverses it: copy -> link key -> Wrapped -> file key -> PDF.
 */

export const LIFESPAN_DAYS = 30;

/** How long a letter can stay open, chosen when publishing: a week for a sensitive one. */
export const LIFESPAN_CHOICES = [7, 14, 30];

/** Binary bytes per uploaded piece of the encrypted PDF (base64url on the wire). */
export const CHUNK_BYTES = 512 * 1024;

/** The largest PDF that can be published. */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** What AES-GCM adds to a plaintext: the 12-byte IV in front, the 16-byte tag behind. */
export const SEAL_OVERHEAD = 28;

/** A letter id: 12 random bytes, base64url. */
export const LETTER_ID = /^[A-Za-z0-9_-]{16}$/;
/** A copy id: 16 random bytes, base64url, made in the owner's browser. */
export const COPY_ID = /^[A-Za-z0-9_-]{22}$/;
/** A link key: a raw 256-bit AES key, base64url. */
export const LINK_KEY = /^[A-Za-z0-9_-]{43}$/;

/** What a partner's copy decrypts to. */
export type Wrapped = {
  /** The PDF's AES key, base64url. */
  fileKey: string;
  title: string;
  /** The partner's greeting name. */
  hello: string;
  sender: string;
  expiresAt: number;
  allowDownload: boolean;
  /** The partner's full name, for the watermark. Letters made before it was added lack it. */
  who?: string;
  /** Spotlight reading on computers: only the band under the mouse is sharp. Missing means on. */
  spotlight?: boolean;
  /** Hold-to-read on phones: the letter shows only while a finger is on the screen. Missing means off. */
  holdToRead?: boolean;
};

/** The base64url length (no padding) of `bytes` bytes. */
export function b64urlLength(bytes: number): number {
  return Math.ceil((bytes * 4) / 3);
}

/** How many chunks an encrypted PDF of `size` bytes is cut into. */
export function chunkCount(size: number): number {
  return Math.ceil(size / CHUNK_BYTES);
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

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

/** `bytes` random bytes, base64url: copy ids and the like. */
export function randomId(bytes: number): string {
  return toB64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function newKey(): Promise<{ key: Key; raw: string }> {
  const key = (await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])) as Key;
  return { key, raw: toB64url(new Uint8Array(await crypto.subtle.exportKey("raw", key))) };
}

export function importKey(raw: string): Promise<Key> {
  return crypto.subtle.importKey("raw", fromB64url(raw) as Bytes, "AES-GCM", false, ["decrypt"]);
}

export async function encrypt(data: Uint8Array, key: Key): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data as Bytes));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return out;
}

export async function decrypt(data: Uint8Array, key: Key): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.subarray(0, 12) as Bytes }, key, data.subarray(12) as Bytes));
}

/**
 * The sender as named mid-sentence ("Let … know you're praying"): the first
 * name, and both first names for a couple. "Xerxes Duane" -> "Xerxes",
 * "Xerxes & Loraine Duane" -> "Xerxes & Loraine". "The Duane family" stays whole.
 */
export function shortName(sender: string): string {
  const s = sender.replace(/\s+/g, " ").trim();
  if (/^the\s/i.test(s)) return s;
  const couple = /^(\S+)(?:\s.*?)?\s(&|and|\+)\s(\S+)/i.exec(s);
  if (couple) return `${couple[1]} ${couple[2]} ${couple[3]}`;
  return s.split(" ")[0] || s;
}

/** The one date format for letters (desk, reader, WhatsApp, email): "1 November 2026", Dubai time. */
export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai" });
}
