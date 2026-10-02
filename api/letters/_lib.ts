// Partner letters on ministry.xerxesduane.com: storage and sending.
//
// Storage is the site's Redis, under letters:v1:
//   settings             sender name, monthly send day, giving link, reply-to
//   partners             hash, partner id -> partner JSON
//   issue:<id>           a letter (draft, scheduled or sent)
//   issues               set of letter ids
//   img:<issue>:<img>    a draft photo (JPEG, base64), for the editor
//   send:<sendId>        what was sent: copy id -> partner id, and when
//   copy:<copyId>        one partner's encrypted copy          (30-day TTL)
//   eimg:<sendId>:<img>  an encrypted photo for that send      (30-day TTL)
//   opened:<sendId>      hash, copy id -> first-opened time    (30-day TTL)
//
// The writer signs in with the hours log's owner login (api/work/session);
// the cookie is per host, so this is the same password on this host.
import { errorResponse, handle, json, randomToken, readJson, redis, requireOwner } from "../work/_lib";
import { OWNER_EMAIL } from "../work/_lib";
import { LIFESPAN_DAYS, encrypt, newKey, renderLetter, toB64url, type Draft } from "../../src/letters/shared";

export { errorResponse, handle, json, randomToken, readJson, redis, requireOwner, OWNER_EMAIL };

export const K = "letters:v1:";
export const ORIGIN = "https://ministry.xerxesduane.com";
const TTL = LIFESPAN_DAYS * 24 * 60 * 60;
const DAY = 24 * 60 * 60 * 1000;
const OFFSET = 4 * 60 * 60 * 1000; // Dubai

export type Partner = { id: string; name: string; email: string; hello: string; active: boolean };

export type Settings = { sender: string; sendDay: number; givingUrl: string; givingLabel: string; replyTo: string };

export type Issue = {
  id: string;
  status: "draft" | "scheduled" | "sent";
  /** YYYY-MM-DD, Dubai, for a scheduled letter. */
  sendOn: string;
  draft: Draft;
  created: number;
  modified: number;
  sent?: { sendId: string; at: number; expiresAt: number; count: number };
};

const DEFAULTS: Settings = { sender: "Xerxes Duane", sendDay: 1, givingUrl: "", givingLabel: "Support the work", replyTo: "" };

function parse<T>(raw: unknown): T | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getSettings(): Promise<Settings> {
  const [raw] = await redis([["GET", `${K}settings`]]);
  return { ...DEFAULTS, ...(parse<Partial<Settings>>(raw) ?? {}) };
}

export async function saveSettings(s: Settings) {
  await redis([["SET", `${K}settings`, JSON.stringify(s)]]);
}

export async function allPartners(): Promise<Partner[]> {
  const [flat] = await redis([["HGETALL", `${K}partners`]]);
  const list = Array.isArray(flat) ? (flat as string[]) : [];
  const out: Partner[] = [];
  for (let i = 1; i < list.length; i += 2) {
    const p = parse<Partner>(list[i]);
    if (p) out.push(p);
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

export async function getIssue(id: string): Promise<Issue | null> {
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(id)) return null;
  const [raw] = await redis([["GET", `${K}issue:${id}`]]);
  return parse<Issue>(raw);
}

export async function saveIssue(i: Issue) {
  await redis([
    ["SET", `${K}issue:${i.id}`, JSON.stringify(i)],
    ["SADD", `${K}issues`, i.id],
  ]);
}

export async function allIssues(): Promise<Issue[]> {
  const [ids] = await redis([["SMEMBERS", `${K}issues`]]);
  const list = Array.isArray(ids) ? (ids as string[]) : [];
  if (!list.length) return [];
  const raws = await redis(list.map((id) => ["GET", `${K}issue:${id}`]));
  return raws.map((r) => parse<Issue>(r)).filter((x): x is Issue => !!x).sort((a, b) => b.created - a.created);
}

export async function deleteIssue(i: Issue) {
  await redis([
    ["DEL", `${K}issue:${i.id}`],
    ["SREM", `${K}issues`, i.id],
    ...i.draft.images.map((im) => ["DEL", `${K}img:${i.id}:${im.id}`]),
  ]);
}

/** Today in Dubai, YYYY-MM-DD. */
export function today(ms = Date.now()): string {
  return new Date(ms + OFFSET).toISOString().slice(0, 10);
}

/** The next monthly send date on or after today. */
export function nextSendDate(day: number, ms = Date.now()): string {
  const d = new Date(ms + OFFSET);
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth();
  if (d.getUTCDate() > day) m += 1;
  if (m > 11) {
    m = 0;
    y += 1;
  }
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fmtDate(ms: number): string {
  return new Date(ms + OFFSET).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export class MailMissing extends Error {}

async function resendBatch(emails: object[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new MailMissing("no key");
  for (let i = 0; i < emails.length; i += 100) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(emails.slice(i, i + 100)),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

function inviteEmail(to: string, p: { name: string; hello: string }, title: string, link: string, s: Settings, expiresAt: number) {
  const from = process.env.LETTERS_FROM || `${s.sender} <letters@xerxesduane.com>`;
  const hello = p.hello || p.name;
  const html = `<div style="font-family:Georgia,'Times New Roman',serif;max-width:520px;margin:0 auto;padding:24px;color:#2b2420;font-size:17px;line-height:1.6;">
<p>Dear ${esc(hello)},</p>
<p>My new letter, <strong>${esc(title)}</strong>, is ready for you.</p>
<p style="margin:28px 0;"><a href="${link}" style="display:inline-block;background:#2b1a14;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-weight:600;font-size:16px;">Read the letter</a></p>
<p style="font-size:14px;color:#6b5f55;">This link is just for you, and the letter is private: it opens only from this link, and it will be gone after ${esc(fmtDate(expiresAt))}. Please don't forward this email.</p>
<p>With gratitude,<br>${esc(s.sender)}</p>
</div>`;
  return {
    from,
    to: [to],
    ...(s.replyTo ? { reply_to: s.replyTo } : { reply_to: OWNER_EMAIL }),
    subject: title,
    html,
    text: `Dear ${hello},\n\nMy new letter, "${title}", is ready for you:\n${link}\n\nThis link is just for you and expires after ${fmtDate(expiresAt)}. Please don't forward it.\n\nWith gratitude,\n${s.sender}`,
  };
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Encrypt and send a letter. Photos are encrypted once per send under one
 * key, which travels inside each partner's own encrypted copy. Each copy has
 * its own key, which travels only in that partner's link.
 *
 * `testTo` sends one copy to that address (marked as a test) and leaves the
 * letter as it was.
 */
export async function sendIssue(issue: Issue, opts: { testTo?: string } = {}): Promise<{ count: number; expiresAt: number }> {
  const settings = await getSettings();
  const recipients: Partner[] = opts.testTo
    ? [{ id: "test", name: settings.sender, hello: settings.sender.split(" ")[0], email: opts.testTo, active: true }]
    : (await allPartners()).filter((p) => p.active && p.email);
  if (!recipients.length) throw new Error("no partners");

  // One send per letter at a time: a cron retry and a "Send now" can't both go out.
  const lock = `${K}sending:${issue.id}`;
  if (!opts.testTo) {
    const [claimed] = await redis([["SET", lock, "1", "NX", "EX", 600]]);
    if (claimed !== "OK") throw new Error("already sending");
  }
  try {
    return await deliver(issue, settings, recipients, opts);
  } finally {
    if (!opts.testTo) await redis([["DEL", lock]]).catch(() => undefined);
  }
}

async function deliver(issue: Issue, settings: Settings, recipients: Partner[], opts: { testTo?: string }): Promise<{ count: number; expiresAt: number }> {

  const now = Date.now();
  const expiresAt = now + LIFESPAN_DAYS * DAY;
  const sendId = randomToken(12);
  const draft: Draft = {
    ...issue.draft,
    giving: issue.draft.giving.url ? issue.draft.giving : { url: settings.givingUrl, label: settings.givingLabel },
  };

  // Photos: one key for this send.
  const img = await newKey();
  const imgCmds: (string | number)[][] = [];
  for (const im of draft.images) {
    const [b64] = await redis([["GET", `${K}img:${issue.id}:${im.id}`]]);
    if (typeof b64 !== "string") continue;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    imgCmds.push(["SET", `${K}eimg:${sendId}:${im.id}`, toB64url(await encrypt(bytes, img.key)), "EX", TTL]);
  }
  for (const c of imgCmds) await redis([c]);

  const enc = new TextEncoder();
  const copies: (string | number)[][] = [];
  const index: string[] = [];
  const emails: object[] = [];
  for (const p of recipients) {
    const letter = { ...renderLetter(draft, p, { sender: settings.sender, sentAt: now, expiresAt }), imageKey: img.raw, sendId };
    const k = await newKey();
    const copyId = randomToken(12);
    const ct = toB64url(await encrypt(enc.encode(JSON.stringify(letter)), k.key));
    copies.push(["SET", `${K}copy:${copyId}`, JSON.stringify({ ct, sendId, expiresAt }), "EX", TTL]);
    index.push(copyId, p.id);
    emails.push(inviteEmail(p.email, p, letter.title, `${ORIGIN}/l/${copyId}#${k.raw}`, settings, expiresAt));
  }
  for (let i = 0; i < copies.length; i += 50) await redis(copies.slice(i, i + 50));
  await redis([
    ["HSET", `${K}send:${sendId}`, "_at", String(now), "_issue", issue.id, ...index],
    ["EXPIRE", `${K}send:${sendId}`, TTL + 7 * 24 * 3600],
  ]);

  await resendBatch(emails);

  if (!opts.testTo) {
    const sent: Issue = { ...issue, status: "sent", sent: { sendId, at: now, expiresAt, count: recipients.length }, modified: now };
    // The letter's own text and photos go too, after the same 30 days, so
    // nothing readable is kept longer than the partners' copies.
    await redis([
      ["SET", `${K}issue:${issue.id}`, JSON.stringify(sent)],
      ["EXPIRE", `${K}issue:${issue.id}`, TTL],
      ...issue.draft.images.map((im) => ["EXPIRE", `${K}img:${issue.id}:${im.id}`, TTL]),
    ]);
  }
  return { count: recipients.length, expiresAt };
}
