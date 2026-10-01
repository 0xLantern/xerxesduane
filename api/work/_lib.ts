// Shared plumbing for work.xerxesduane.com, the hours log behind /api/work/*.
//
// One owner keeps a log of the hours they work for one client; the client
// reads it through a private link. Everything is stored in the same Redis the
// site already uses for its visitor counter and rate limits (see
// findRedisRest), under the work:v1: prefix, so there is nothing new to
// provision.
//
// Storage shape, chosen so a read never needs more than one round trip:
//   work:v1:m:YYYY-MM   hash, entry id -> entry JSON, bucketed by the UTC month
//                       of the entry's start
//   work:v1:months      set of the YYYY-MM buckets that have ever held an entry
//   work:v1:timer       the running timer, if any
//   work:v1:settings    name, client and hourly rate
//   work:v1:share       the token in the client's read-only link
//
// Auth is one email and one password, both from the environment. The session
// cookie is an expiry signed with HMAC under the password itself, so changing
// WORK_PASSWORD in Vercel signs every device out at once.
import { clientIp, errorResponse, findRedisRest, json } from "../_shared";

const K = "work:v1:";

/** The one account that can write. hi@xerxesduane.com unless overridden. */
export const OWNER_EMAIL = (process.env.WORK_OWNER_EMAIL || "hi@xerxesduane.com").trim().toLowerCase();

const COOKIE = "xdw_session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Redis
// ---------------------------------------------------------------------------

type Cmd = (string | number)[];

class StoreMissing extends Error {}

/** Run commands as one pipeline and return each result, throwing on any error. */
export async function redis(cmds: Cmd[]): Promise<unknown[]> {
  const store = findRedisRest();
  if (!store) throw new StoreMissing("no store");
  const res = await fetch(`${store.url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${store.token}`, "content-type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  return out.map((o) => {
    if (o.error) throw new Error(`redis: ${o.error}`);
    return o.result;
  });
}

/**
 * Wrap a handler so a missing store or an unexpected throw becomes a JSON
 * error the page can show, never a bare 500.
 */
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof StoreMissing) {
        return errorResponse("The hours log has no database connected. Connect the site's Redis store in Vercel.", 503);
      }
      console.error("[work]", String(err).slice(0, 300));
      return errorResponse("Something went wrong saving or reading your hours. Try again.", 500);
    }
  };
}

/** A fixed-window counter per key; true while under `max` hits in `windowSec`. */
export async function underLimit(name: string, req: Request, max: number, windowSec: number): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const key = `${K}rl:${name}:${clientIp(req)}:${bucket}`;
  const [n] = await redis([
    ["INCR", key],
    ["EXPIRE", key, windowSec],
  ]);
  return Number(n) <= max;
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

/**
 * Compare two secrets without leaking where they differ: both sides are
 * HMAC'd under a fresh random key first, so the comparison runs over equal
 * lengths whatever the inputs were.
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const key = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const [x, y] = await Promise.all([hmac(key, a), hmac(key, b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0 && x.length === y.length;
}

/** A random URL-safe token, 128 bits by default. */
export function randomToken(bytes = 16): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

function password(): string | null {
  const p = process.env.WORK_PASSWORD;
  return p && p.length >= 8 ? p : null;
}

export function configured(): boolean {
  return password() !== null && findRedisRest() !== null;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

async function sign(exp: number, pw: string): Promise<string> {
  return hmac(pw, `xdw|${OWNER_EMAIL}|${exp}`);
}

export async function isOwner(req: Request): Promise<boolean> {
  const pw = password();
  const raw = readCookie(req, COOKIE);
  if (!pw || !raw) return false;
  const [expStr, sig] = raw.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now() || !sig) return false;
  return safeEqual(sig, await sign(exp, pw));
}

/** Check a login attempt against the configured email and password. */
export async function checkLogin(email: string, pw: string): Promise<boolean> {
  const real = password();
  if (!real) return false;
  // Both compared every time, so a wrong email takes as long as a wrong password.
  const [okEmail, okPw] = await Promise.all([
    safeEqual(email.trim().toLowerCase(), OWNER_EMAIL),
    safeEqual(pw, real),
  ]);
  return okEmail && okPw;
}

export async function sessionCookie(): Promise<string> {
  const pw = password()!;
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const value = `${exp}.${await sign(exp, pw)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearedCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/**
 * Reject cross-site writes. The cookie is SameSite=Strict already; this is
 * the second lock, and it costs nothing for the page itself, which always
 * sends a same-origin JSON request.
 */
export function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(req.url).host) return false;
    } catch {
      return false;
    }
  }
  return (req.headers.get("content-type") ?? "").includes("application/json");
}

/** Owner-only gate for a request; returns the response to send if it fails. */
export async function requireOwner(req: Request, write: boolean): Promise<Response | null> {
  if (!password()) return errorResponse("Set WORK_PASSWORD in Vercel to turn the hours log on.", 503);
  if (write && !sameOrigin(req)) return errorResponse("Blocked: that request did not come from this page.", 403);
  if (!(await isOwner(req))) return errorResponse("Sign in first.", 401);
  return null;
}

/**
 * Read access to the log: the signed-in owner, or anyone holding the
 * client's link token as ?t=. The token is the credential, as in report.ts.
 */
export async function canRead(req: Request): Promise<boolean> {
  if (await isOwner(req)) return true;
  const token = new URL(req.url).searchParams.get("t") ?? "";
  return token.length >= 16 && safeEqual(token, await getShareToken());
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export type Entry = {
  id: string;
  /** Epoch milliseconds. */
  start: number;
  end: number;
  task: string;
  notes: string;
  link: string;
};

export type Timer = { start: number; task: string; notes: string; link: string };

export type Settings = { name: string; client: string; rate: number; currency: string };

const DEFAULT_SETTINGS: Settings = {
  name: "Xerxes Duane Magdaluyo",
  client: "GCN",
  rate: 20,
  currency: "USD",
};

/** Entries start no earlier than this, which keeps a mistyped year out. */
const EARLIEST = Date.UTC(2020, 0, 1);
const MAX_ENTRY_MS = 24 * 60 * 60 * 1000;

export const LIMITS = { task: 120, notes: 2000, link: 500, name: 80, client: 80 } as const;

function monthOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 7);
}

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
  return { ...DEFAULT_SETTINGS, ...(parse<Partial<Settings>>(raw) ?? {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await redis([["SET", `${K}settings`, JSON.stringify(s)]]);
}

/** The client link's token, created on first use. SET NX keeps two first loads from racing. */
export async function getShareToken(): Promise<string> {
  const [, token] = await redis([
    ["SET", `${K}share`, randomToken(), "NX"],
    ["GET", `${K}share`],
  ]);
  return String(token);
}

export async function rotateShareToken(): Promise<string> {
  const token = randomToken();
  await redis([["SET", `${K}share`, token]]);
  return token;
}

export async function getTimer(): Promise<Timer | null> {
  const [raw] = await redis([["GET", `${K}timer`]]);
  return parse<Timer>(raw);
}

export async function setTimer(t: Timer | null): Promise<void> {
  await redis([t ? ["SET", `${K}timer`, JSON.stringify(t)] : ["DEL", `${K}timer`]]);
}

/** Every entry, oldest first. One contractor's log stays small for years. */
export async function allEntries(): Promise<Entry[]> {
  const [months] = await redis([["SMEMBERS", `${K}months`]]);
  const list = Array.isArray(months) ? (months as string[]).sort() : [];
  if (!list.length) return [];
  const hashes = await redis(list.map((m) => ["HGETALL", `${K}m:${m}`]));
  const out: Entry[] = [];
  for (const h of hashes) {
    // Upstash returns HGETALL as a flat [field, value, field, value] list.
    const flat = Array.isArray(h) ? (h as string[]) : [];
    for (let i = 1; i < flat.length; i += 2) {
      const e = parse<Entry>(flat[i]);
      if (e) out.push(e);
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

async function findEntry(id: string): Promise<Entry | null> {
  const month = id.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [raw] = await redis([["HGET", `${K}m:${month}`, id]]);
  return parse<Entry>(raw);
}

export async function saveEntry(e: Entry, previous?: Entry | null): Promise<Entry> {
  const month = monthOf(e.start);
  const cmds: Cmd[] = [];
  // An edit that moves the start into another month moves the entry too,
  // under a new id, so the id always names the bucket it lives in.
  if (previous && previous.id.slice(0, 7) !== month) {
    cmds.push(["HDEL", `${K}m:${previous.id.slice(0, 7)}`, previous.id]);
    e = { ...e, id: `${month}.${randomToken(8)}` };
  }
  cmds.push(["HSET", `${K}m:${month}`, e.id, JSON.stringify(e)], ["SADD", `${K}months`, month]);
  await redis(cmds);
  return e;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const month = id.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return false;
  const [n] = await redis([["HDEL", `${K}m:${month}`, id]]);
  return Number(n) > 0;
}

export { findEntry };

/**
 * A new entry's id. The page sends a key made when the editor opened, so a
 * Save retried after a lost response overwrites itself instead of doubling.
 */
export function newId(start: number, key?: unknown): string {
  const k = typeof key === "string" && /^[A-Za-z0-9_-]{8,32}$/.test(key) ? key : randomToken(8);
  return `${monthOf(start)}.${k}`;
}

/** Take the running timer and clear it in one step, so two stops can't both win. */
export async function takeTimer(): Promise<Timer | null> {
  const [raw] = await redis([["GETDEL", `${K}timer`]]);
  return parse<Timer>(raw);
}

/**
 * Validate the user-entered part of an entry. Returns the clean fields, or a
 * message that says what to fix.
 */
export function cleanEntry(body: Record<string, unknown>): Omit<Entry, "id"> | string {
  // Whole minutes: what the editor can show is exactly what is billed, so an
  // edit that leaves the times alone never changes the duration.
  const MIN = 60 * 1000;
  const start = Math.round(Number(body.start) / MIN) * MIN;
  const end = Math.round(Number(body.end) / MIN) * MIN;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "Give a start and an end time.";
  if (start < EARLIEST) return "That date is too far back.";
  if (end > Date.now() + 5 * 60 * 1000) return "The end time is in the future.";
  if (end <= start) return "The end time has to be after the start.";
  if (end - start > MAX_ENTRY_MS) return "One entry can be 24 hours at most. Split longer work into days.";
  const task = String(body.task ?? "").trim();
  if (!task) return "Say what you worked on.";
  const notes = String(body.notes ?? "").trim();
  const link = String(body.link ?? "").trim();
  if (task.length > LIMITS.task) return `Keep "what I worked on" under ${LIMITS.task} characters.`;
  if (notes.length > LIMITS.notes) return `Keep the notes under ${LIMITS.notes} characters.`;
  if (link.length > LIMITS.link) return "That link is too long.";
  if (link && !/^https?:\/\/\S+$/i.test(link)) return "The link has to start with http:// or https://.";
  return { start: Math.round(start), end: Math.round(end), task, notes, link };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export { json, errorResponse };
