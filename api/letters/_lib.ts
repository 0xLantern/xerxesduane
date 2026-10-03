// Partner letters on ministry.xerxesduane.com: storage, checks and email.
//
// The owner makes each month's newsletter as a PDF (with Claude) and
// publishes it from the desk at /letters. The PDF is encrypted in the owner's
// browser before anything is uploaded, and every partner's copy is wrapped
// there too (see src/letters/shared.ts), so this server only ever holds
// ciphertext and never sees a key. It stores, checks and deletes.
//
// Storage is the site's Redis, under letters:v1:
//   settings             sender name, reply-to, WhatsApp message, download default
//   partners             hash, partner id -> partner JSON
//   letters              set of letter ids (expired ones are dropped on listing)
//   letter:<id>          title, size, chunk count, status, when          (expires)
//   file:<id>:<n>        the encrypted PDF, piece n, base64url           (expires)
//   copies:<id>          hash, copy id -> partner id                     (expires)
//   copy:<copyId>        {letterId, wrapped}: one partner's copy         (expires)
//   opened:<id>          hash, copy id -> first-opened time              (expires)
//   mailed:<id>          hash, copy id -> when its email went            (expires)
//   react:<id>           hash, copy id -> {at, note}: "praying for you"  (expires)
//   prayer               hash, request id -> prayer request JSON
//   prayed               hash, request id -> how many times "I prayed" was tapped
//   prayer-token         the token in the prayer team's link
//
// Everything a letter has expires at the same moment, LIFESPAN_DAYS after it
// was published; a copy made later for a new partner expires with the rest.
// Withdrawing a copy deletes it; withdrawing the letter deletes every copy
// and the file, and keeps only the bare record (title, counts) until expiry.
//
// The copy index is its own hash rather than a field of letter:<id>, so two
// devices adding copies at once can't overwrite each other's additions.
//
// The writer signs in with the hours log's owner login (api/work/session);
// the cookie is per host, so this is the same password on this host.
import { OWNER_EMAIL, errorResponse, handle, json, randomToken, readJson, redis, requireOwner } from "../work/_lib";
import { COPY_ID, LETTER_ID, LIFESPAN_DAYS, LINK_KEY } from "../../src/letters/shared";

export { OWNER_EMAIL, errorResponse, handle, json, randomToken, readJson, redis, requireOwner };

export const K = "letters:v1:";
export const ORIGIN = "https://ministry.xerxesduane.com";
export const DAY = 24 * 60 * 60 * 1000;
const OFFSET = 4 * 60 * 60 * 1000; // Dubai

export type Partner = {
  id: string;
  name: string;
  /** Optional; lowercased. */
  email: string;
  /** Optional; E.164 digits without the +, e.g. 971501234567. */
  whatsapp: string;
  /** Optional; a Facebook username or profile number, reached at m.me/<messenger>. */
  messenger: string;
  /** The greeting name: "Dear <hello>". */
  hello: string;
  active: boolean;
  /** How they give, in a line: "Monthly through GCN", "Once a year". Optional. */
  giving: string;
  /** Birthday as MM-DD, or YYYY-MM-DD when the year is known. Optional. */
  birthday: string;
  /** Anything worth remembering about them. Optional. */
  notes: string;
  /** When they were last given a letter (set when their copy is made). */
  lastLetterAt: number | null;
};

export type Settings = {
  sender: string;
  replyTo: string;
  /** The WhatsApp message; {{hello}} {{name}} {{title}} {{link}} {{expires}}. */
  waTemplate: string;
  /** Whether new letters start with "Let partners download the PDF" on. */
  allowDownload: boolean;
};

export type Letter = {
  id: string;
  title: string;
  publishedAt: number;
  expiresAt: number;
  /** Bytes of the encrypted PDF (iv | ciphertext | tag). */
  size: number;
  chunks: number;
  allowDownload: boolean;
  /** uploading: pieces still coming; live: readable; withdrawn: copies and file deleted. */
  status: "uploading" | "live" | "withdrawn";
  withdrawnAt?: number;
};

export const DEFAULT_WA_TEMPLATE =
  "Hi {{hello}}! Our new letter, {{title}}, is ready. It's private and just for you, and you can open it until {{expires}}:\n{{link}}\n\nThank you for praying with us and standing with us.";

const DEFAULTS: Settings = { sender: "Xerxes Duane", replyTo: "", waTemplate: DEFAULT_WA_TEMPLATE, allowDownload: false };

export function parse<T>(raw: unknown): T | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** A Redis flat [field, value, …] list as a map. */
export function pairs(flat: unknown): Map<string, string> {
  const list = Array.isArray(flat) ? (flat as string[]) : [];
  const out = new Map<string, string>();
  for (let i = 0; i + 1 < list.length; i += 2) out.set(String(list[i]), String(list[i + 1]));
  return out;
}

// ---------------------------------------------------------------------------
// Settings and partners
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const [raw] = await redis([["GET", `${K}settings`]]);
  const s = { ...DEFAULTS, ...(parse<Partial<Settings>>(raw) ?? {}) };
  // Only the fields this version knows (an older one kept a send day and a giving link).
  return { sender: s.sender, replyTo: s.replyTo, waTemplate: s.waTemplate || DEFAULT_WA_TEMPLATE, allowDownload: s.allowDownload === true };
}

export async function saveSettings(s: Settings) {
  await redis([["SET", `${K}settings`, JSON.stringify(s)]]);
}

export async function allPartners(): Promise<Partner[]> {
  const [flat] = await redis([["HGETALL", `${K}partners`]]);
  const out: Partner[] = [];
  for (const raw of pairs(flat).values()) {
    const p = parse<Partner>(raw);
    if (p) out.push({ ...p, email: p.email ?? "", whatsapp: p.whatsapp ?? "", messenger: p.messenger ?? "", giving: p.giving ?? "", birthday: p.birthday ?? "", notes: p.notes ?? "", lastLetterAt: p.lastLetterAt ?? null });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function savePartners(ps: Partner[]) {
  if (!ps.length) return;
  await redis([["HSET", `${K}partners`, ...ps.flatMap((p) => [p.id, JSON.stringify(p)])]]);
}

export async function deletePartner(id: string) {
  await redis([["HDEL", `${K}partners`, id]]);
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * A WhatsApp number as wa.me wants it: international digits, no +. Spaces,
 * dashes, dots and brackets are fine; so is a leading + or 00. A number
 * starting with a single 0 is a local number, which can't be dialled from
 * a link, so it is refused. Returns null when it isn't a number.
 */
export function cleanWhatsapp(raw: string): string | null {
  let d = raw.trim().replace(/[\s().-]/g, "");
  if (!d) return "";
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  return /^[1-9]\d{7,14}$/.test(d) ? d : null;
}

/** A birthday as typed: "14 March", "14/03", "2001-03-14", "03-14". Returns MM-DD or YYYY-MM-DD, "" for empty, null when it isn't a date. */
export function cleanBirthday(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const ok = (m: number, d: number) => m >= 1 && m <= 12 && d >= 1 && d <= 31;
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) return ok(+m[2], +m[3]) ? `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` : null;
  if ((m = /^(\d{1,2})-(\d{1,2})$/.exec(s))) return ok(+m[1], +m[2]) ? `${pad(+m[1])}-${pad(+m[2])}` : null;
  if ((m = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}))?$/.exec(s))) return ok(+m[2], +m[1]) ? `${m[3] ? `${m[3]}-` : ""}${pad(+m[2])}-${pad(+m[1])}` : null;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  if ((m = /^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/.exec(s)) || (m = /^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(s))) {
    const [day, mon] = /^\d/.test(m[1]) ? [+m[1], m[2]] : [+m[2], m[1]];
    const mi = months.indexOf(mon.slice(0, 3));
    return mi >= 0 && ok(mi + 1, day) ? `${m[3] ? `${m[3]}-` : ""}${pad(mi + 1)}-${pad(day)}` : null;
  }
  return null;
}

/**
 * A Messenger contact as pasted: a profile link (facebook.com/name,
 * facebook.com/profile.php?id=123, fb.com/name), a chat link (m.me/name,
 * messenger.com/t/name) or a bare username. Returns the username or profile
 * number, "" for empty, null when it isn't one.
 */
export function cleanMessenger(raw: string): string | null {
  let s = raw.trim();
  if (!s) return "";
  s = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/^(m\.|web\.|mobile\.)(?=facebook\.com)/i, "");
  const id = /^(?:facebook\.com|fb\.com)\/profile\.php\?(?:.*&)?id=(\d{5,20})/i.exec(s);
  if (id) return id[1];
  const path = /^(?:facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com\/t)\/([A-Za-z0-9.]{1,80})\/?(?:[?#].*)?$/i.exec(s);
  const name = path ? path[1] : s.replace(/^@/, "");
  if (["profile.php", "people", "groups", "pages", "share"].includes(name.toLowerCase())) return null;
  return /^[A-Za-z0-9.]{5,80}$/.test(name) && !/^\./.test(name) ? name : null;
}

/** Validate a partner as typed. Returns the clean partner, or what to fix. */
export function cleanPartner(p: Record<string, unknown>, id?: string, keep?: Partner): Partner | string {
  const name = String(p.name ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  const email = String(p.email ?? "").trim().toLowerCase().slice(0, 200);
  const wa = cleanWhatsapp(String(p.whatsapp ?? "").slice(0, 40));
  if (!name) return "Give the partner's name.";
  if (email && !isEmail(email)) return `"${email}" doesn't look like an email address.`;
  if (wa === null) return `${name}'s WhatsApp number needs the country code, like +971 50 123 4567.`;
  const messenger = cleanMessenger(String(p.messenger ?? "").slice(0, 200));
  if (messenger === null) return `${name}'s Messenger needs their Facebook profile link, like facebook.com/ramon.cruz.`;
  if (!email && !wa && !messenger) return `${name} needs an email address, a WhatsApp number or Messenger.`;
  const hello = String(p.hello ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || name.split(" ")[0];
  const birthday = cleanBirthday(String(p.birthday ?? "").slice(0, 40));
  if (birthday === null) return `${name}'s birthday needs a day and a month, like 14 March or 14/03.`;
  return {
    id: id ?? randomToken(8),
    name,
    email,
    whatsapp: wa,
    messenger,
    hello,
    active: p.active !== false,
    giving: String(p.giving ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
    birthday,
    notes: String(p.notes ?? "").replace(/\r/g, "").trim().slice(0, 1000),
    lastLetterAt: keep?.lastLetterAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Letters
// ---------------------------------------------------------------------------

/** Seconds until the letter expires: the TTL every one of its keys gets. */
export function ttl(l: Letter, now = Date.now()): number {
  return Math.max(1, Math.ceil((l.expiresAt - now) / 1000));
}

export const alive = (l: Letter, now = Date.now()) => l.expiresAt > now;

export async function getLetter(id: unknown): Promise<Letter | null> {
  if (typeof id !== "string" || !LETTER_ID.test(id)) return null;
  const [raw] = await redis([["GET", `${K}letter:${id}`]]);
  const l = parse<Letter>(raw);
  return l && alive(l) ? l : null;
}

export async function saveLetter(l: Letter) {
  await redis([
    ["SET", `${K}letter:${l.id}`, JSON.stringify(l), "EX", ttl(l)],
    ["SADD", `${K}letters`, l.id],
  ]);
}

export function newLetter(title: string, size: number, chunks: number, allowDownload: boolean, days = LIFESPAN_DAYS): Letter {
  const now = Date.now();
  return { id: randomToken(12), title, publishedAt: now, expiresAt: now + days * DAY, size, chunks, allowDownload, status: "uploading" };
}

/** Every letter that hasn't expired, newest first, with how many copies, opens and "praying" replies it has. */
export async function allLetters(): Promise<(Letter & { copies: number; opened: number; praying: number })[]> {
  const [ids] = await redis([["SMEMBERS", `${K}letters`]]);
  const list = Array.isArray(ids) ? (ids as string[]) : [];
  if (!list.length) return [];
  const raws = await redis(list.flatMap((id) => [["GET", `${K}letter:${id}`], ["HLEN", `${K}copies:${id}`], ["HLEN", `${K}opened:${id}`], ["HLEN", `${K}react:${id}`]]));
  const out: (Letter & { copies: number; opened: number; praying: number })[] = [];
  const gone: string[] = [];
  list.forEach((id, i) => {
    const l = parse<Letter>(raws[i * 4]);
    if (l && alive(l)) out.push({ ...l, copies: Number(raws[i * 4 + 1]) || 0, opened: Number(raws[i * 4 + 2]) || 0, praying: Number(raws[i * 4 + 3]) || 0 });
    else gone.push(id);
  });
  if (gone.length) await redis([["SREM", `${K}letters`, ...gone]]);
  return out.sort((a, b) => b.publishedAt - a.publishedAt);
}

/** The copy index of a letter: copy id -> partner id. */
export async function copiesOf(id: string): Promise<Map<string, string>> {
  const [flat] = await redis([["HGETALL", `${K}copies:${id}`]]);
  return pairs(flat);
}

const fileKeys = (l: Letter) => Array.from({ length: l.chunks }, (_, n) => `${K}file:${l.id}:${n}`);

/**
 * Withdraw every copy and delete the file. The bare record stays, marked
 * withdrawn, so the desk can still say what happened until it expires.
 */
export async function withdrawAll(l: Letter): Promise<number> {
  const ids = [...(await copiesOf(l.id)).keys()];
  const keys = [...ids.map((c) => `${K}copy:${c}`), ...fileKeys(l)];
  for (let i = 0; i < keys.length; i += 200) await redis([["DEL", ...keys.slice(i, i + 200)]]);
  if (l.status !== "withdrawn") await saveLetter({ ...l, status: "withdrawn", withdrawnAt: Date.now() });
  return ids.length;
}

/** Delete the letter and everything it has, record included. */
export async function removeLetter(l: Letter) {
  await withdrawAll(l);
  await redis([
    ["DEL", `${K}letter:${l.id}`, `${K}copies:${l.id}`, `${K}opened:${l.id}`, `${K}mailed:${l.id}`, `${K}react:${l.id}`, `${K}devices:${l.id}`, `${K}blocked:${l.id}`],
    ["SREM", `${K}letters`, l.id],
  ]);
}

// ---------------------------------------------------------------------------
// Prayer requests, for the prayer team page (/pray/<token>)
// ---------------------------------------------------------------------------

export type PrayerRequest = {
  id: string;
  text: string;
  createdAt: number;
  /** Set when answered. The request then stays on the page ANSWERED_DAYS more, with thanks, and is gone after. */
  answeredAt: number | null;
  /** How it was answered, in a line. */
  answer: string;
  /** A photo, as a small JPEG data URL (resized in the owner's browser), or "" for none. */
  photo: string;
};

export const ANSWERED_DAYS = 14;
/** A photo's data URL can be this long at most: about 220 KB of JPEG. */
export const PHOTO_LIMIT = 300_000;

/** A photo as sent by the desk: a JPEG or PNG data URL under the limit, "" to clear, null when it isn't one. */
export function cleanPhoto(v: unknown): string | null {
  if (v === "" || v === null) return "";
  if (typeof v !== "string" || v.length > PHOTO_LIMIT) return null;
  return /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(v) ? v : null;
}
export const PRAYER_LIMIT = 600;

/** Every request, newest first; answered ones that have had their ANSWERED_DAYS are dropped on the way. */
export async function allPrayer(now = Date.now()): Promise<(PrayerRequest & { prayed: number })[]> {
  const [flat, counts] = await redis([
    ["HGETALL", `${K}prayer`],
    ["HGETALL", `${K}prayed`],
  ]);
  const prayed = pairs(counts);
  const out: (PrayerRequest & { prayed: number })[] = [];
  const gone: string[] = [];
  for (const [id, raw] of pairs(flat)) {
    const r = parse<PrayerRequest>(raw);
    if (!r) gone.push(id);
    else if (r.answeredAt && now - r.answeredAt > ANSWERED_DAYS * DAY) gone.push(id);
    else out.push({ ...r, photo: r.photo ?? "", prayed: Number(prayed.get(id)) || 0 });
  }
  if (gone.length) await redis([["HDEL", `${K}prayer`, ...gone], ["HDEL", `${K}prayed`, ...gone]]);
  // Open ones first, newest first; then the answered, most recently answered first.
  return out.sort((a, b) => Number(!!a.answeredAt) - Number(!!b.answeredAt) || (b.answeredAt ?? b.createdAt) - (a.answeredAt ?? a.createdAt));
}

export async function savePrayer(r: PrayerRequest) {
  await redis([["HSET", `${K}prayer`, r.id, JSON.stringify(r)]]);
}

/** The prayer team's link token, made on first use. */
export async function prayerToken(): Promise<string> {
  const [, t] = await redis([
    ["SET", `${K}prayer-token`, randomToken(16), "NX"],
    ["GET", `${K}prayer-token`],
  ]);
  return String(t);
}

/** The token if one has been made, else null; never makes one (for public reads). */
export async function existingPrayerToken(): Promise<string | null> {
  const [t] = await redis([["GET", `${K}prayer-token`]]);
  return typeof t === "string" && t.length >= 16 ? t : null;
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export function fmtDate(ms: number): string {
  return new Date(ms + OFFSET).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export class MailMissing extends Error {}

/** True when `link` is exactly this copy's link: our origin, its id, and a whole key. */
export function isCopyLink(link: unknown, copyId: string): link is string {
  if (typeof link !== "string" || !COPY_ID.test(copyId)) return false;
  const prefix = `${ORIGIN}/l/${copyId}#`;
  return link.startsWith(prefix) && LINK_KEY.test(link.slice(prefix.length));
}

/**
 * Send through Resend's batch endpoint, 100 at a time. The idempotency key
 * names the copies in the batch, so a retried request can't mail twice.
 * Errors carry only the status: a message could echo an address or a link.
 */
export async function resendBatch(emails: { copyId: string; email: object }[], letterId: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new MailMissing("no key");
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(batch.map((e) => e.copyId).join(","))));
    const idem = `letters-${letterId}-${Array.from(digest.subarray(0, 12), (b) => b.toString(16).padStart(2, "0")).join("")}`;
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "idempotency-key": idem },
      body: JSON.stringify(batch.map((e) => e.email)),
    });
    if (!res.ok) throw new Error(`resend ${res.status}`);
  }
}

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** One partner's email: a greeting, the button, and what the link is. Nothing of the letter itself. */
export function letterEmail(p: Partner, title: string, link: string, s: Settings, expiresAt: number) {
  const from = process.env.LETTERS_FROM || `${s.sender} <letters@xerxesduane.com>`;
  const hello = p.hello || p.name;
  const until = fmtDate(expiresAt);
  const html = `<div style="font-family:Georgia,'Times New Roman',serif;max-width:520px;margin:0 auto;padding:24px;color:#2b2420;font-size:17px;line-height:1.6;">
<p>Dear ${esc(hello)},</p>
<p>Our new letter, <strong>${esc(title)}</strong>, is ready, and this copy is just for you.</p>
<p style="margin:28px 0;"><a href="${esc(link)}" style="display:inline-block;background:#2b1a14;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-weight:600;font-size:16px;">Read the letter</a></p>
<p style="font-size:14px;color:#6b5f55;">It's private: only this link opens it, it's just for you, and it's available until ${esc(until)}. Please don't forward this email.</p>
<p>Thank you for praying with us and standing with us.<br>With gratitude,<br>${esc(s.sender)}</p>
</div>`;
  const replyTo = s.replyTo || OWNER_EMAIL;
  return {
    from,
    to: [p.email],
    reply_to: replyTo,
    // Mail apps show an Unsubscribe button for this, which writes to the
    // owner (who pauses the partner) instead of the letter landing in spam.
    headers: { "List-Unsubscribe": `<mailto:${replyTo}?subject=${encodeURIComponent("Please stop sending me letters")}>` },
    subject: title,
    html,
    text: `Dear ${hello},\n\nOur new letter, "${title}", is ready, and this copy is just for you:\n${link}\n\nIt's private: only this link opens it, and it's available until ${until}. Please don't forward this email.\n\nThank you for praying with us and standing with us.\nWith gratitude,\n${s.sender}`,
  };
}
