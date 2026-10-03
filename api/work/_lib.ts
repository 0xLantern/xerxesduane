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
//   work:v1:inv:<id>    the saved copy of a sent invoice (see _invoice.ts)
//   work:v1:paid        hash, invoice period id -> payment JSON
//   work:v1:summary     hash, YYYY-MM -> the month's note for the client
//   work:v1:trash       hash, entry id -> deleted entry JSON, kept 90 days
//   work:v1:clients     hash, client id -> client JSON (rate, billing, link)
//
// Clients. The log began with one client, GCN, and its keys above have no
// client in them. Other clients keep theirs under work:v1:c:<id>:… (see
// scoped), so GCN's data and links never had to move. An entry names its
// client; one without is GCN's.
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
 * Who is reading. "owner" is the signed-in owner; "private" is the client,
 * either through the long link token or through the easy address (/gcn)
 * after giving the client password. Both see everything, invoices and bank
 * details included.
 */
export type Scope = "owner" | "private";

/**
 * The easy address, work.xerxesduane.com/gcn. Its name is the "token" the
 * page sends, but on its own it opens nothing: the client password does.
 * WORK_PUBLIC_SLUG renames it; "off" closes it (the private link still works).
 */
export const PUBLIC_SLUG = (process.env.WORK_PUBLIC_SLUG ?? "gcn").trim().toLowerCase();

const CLIENT_COOKIE = "xdw_client";
const CLIENT_SECONDS = 365 * 24 * 60 * 60;

/** The password the client types at /gcn (WORK_CLIENT_PASSWORD). Unset, /gcn stays locked. */
function clientPassword(): string | null {
  const p = process.env.WORK_CLIENT_PASSWORD;
  return p && p.trim().length >= 4 ? p.trim() : null;
}

export function clientPasswordSet(): boolean {
  return clientPassword() !== null;
}

/** True when this browser has given the client password (and it hasn't changed since). */
async function hasClientCookie(req: Request): Promise<boolean> {
  const pw = clientPassword();
  const raw = readCookie(req, CLIENT_COOKIE);
  if (!pw || !raw) return false;
  const [expStr, sig] = raw.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now() || !sig) return false;
  return safeEqual(sig, await hmac(pw, `xdc|${exp}`));
}

/** Check the client password; case and surrounding spaces don't matter. */
export async function checkClientPassword(given: string): Promise<boolean> {
  const pw = clientPassword();
  if (!pw) return false;
  return safeEqual(given.trim().toLowerCase(), pw.toLowerCase());
}

/**
 * Remembered for a year. SameSite=Lax rather than Strict so a link to /gcn
 * from Beat's email opens straight into the page. Signed under the password,
 * so changing WORK_CLIENT_PASSWORD signs every browser out.
 */
export async function clientCookie(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + CLIENT_SECONDS;
  const value = `${exp}.${await hmac(clientPassword()!, `xdc|${exp}`)}`;
  return `${CLIENT_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${CLIENT_SECONDS}`;
}

/**
 * The scope a client token grants, and whose. "locked" is the easy address
 * without the password yet: the page should ask for it. null is a wrong token.
 */
export async function tokenScope(token: string, req: Request): Promise<{ scope: Scope; client: Client } | "locked" | null> {
  const clients = await getClients();
  if (PUBLIC_SLUG && PUBLIC_SLUG !== "off" && token.toLowerCase() === PUBLIC_SLUG) {
    const gcn = clients.find((c) => c.id === DEFAULT_CLIENT)!;
    return (await hasClientCookie(req)) ? { scope: "private", client: gcn } : "locked";
  }
  if (token.length < 16) return null;
  const tokens = await allShareTokens(clients);
  for (const c of clients) {
    if (await safeEqual(token, tokens.get(c.id) ?? "")) return { scope: "private", client: c };
  }
  return null;
}

/**
 * Who is reading, and which client's log: the owner (with ?c=<client id>,
 * GCN without), or a client token that has been let in.
 */
export async function readScope(req: Request): Promise<{ scope: Scope; client: Client } | null> {
  const url = new URL(req.url);
  if (await isOwner(req)) {
    const client = await getClient(url.searchParams.get("c") ?? DEFAULT_CLIENT);
    return client ? { scope: "owner", client } : null;
  }
  const s = await tokenScope(url.searchParams.get("t") ?? "", req);
  return s && s !== "locked" ? s : null;
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
  /** The client this time is for (a Client id). */
  client: string;
};

export type Timer = { start: number; task: string; notes: string; link: string; client: string };

/**
 * The invoice's view of who and how much: the owner's name, the client's
 * name, and the rate. It is what every saved invoice carries, so it stays
 * this shape; for a client other than GCN it is built from the Client.
 */
export type Settings = { name: string; client: string; rate: number; currency: string };

export const DEFAULT_CLIENT = "gcn";

/** A client's key, under its own prefix except for GCN, whose keys predate clients. */
export function scoped(client: string, key: string): string {
  return client === DEFAULT_CLIENT ? `${K}${key}` : `${K}c:${client}:${key}`;
}

export type BillTo = { name: string; lines: string[]; phone: string; email: string; web: string };

export type Client = {
  id: string;
  /** How the log and the client's page name them: "GCN". */
  name: string;
  /** The tag in invoice numbers: XD-<short>-<period>. */
  short: string;
  rate: number;
  currency: string;
  billTo: BillTo;
  /** Where the invoice email goes. Empty: invoices are made but not emailed. */
  invoiceTo: string[];
  /** Whether the cron sends the month's invoice the night the month ends. */
  autoInvoice: boolean;
  /** A logo on this site for the invoice and their page, e.g. /brand/clients/gcn.png. Empty: none. */
  logo: string;
  /** The easy address (/gcn). Only GCN's, from WORK_PUBLIC_SLUG; other clients use their private link. */
  slug: string;
  createdAt: number;
  archived: boolean;
};

/** GCN's billing details, as they were before clients were a list. */
export const GCN_BILL_TO: BillTo = {
  name: "GCN Great Commission Network",
  lines: ["Mattenstrasse 62", "3800 Matten – Switzerland"],
  phone: "+41 79 376 87 33",
  email: "bb@gcn.live",
  web: "www.gcn.live",
};

/** Where GCN's monthly email goes unless the client record says otherwise. WORK_INVOICE_TO overrides. */
export function gcnRecipients(): string[] {
  const raw = process.env.WORK_INVOICE_TO || GCN_BILL_TO.email;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export const CLIENT_LIMITS = { name: 80, short: 12, line: 120, lines: 6, emails: 5 } as const;

/** Every client, GCN first, then by name. GCN is made up from the old settings until it is saved as a client. */
export async function getClients(): Promise<Client[]> {
  const [flat, rawSettings] = await redis([
    ["HGETALL", `${K}clients`],
    ["GET", `${K}settings`],
  ]);
  const list = Array.isArray(flat) ? (flat as string[]) : [];
  const out: Client[] = [];
  for (let i = 0; i + 1 < list.length; i += 2) {
    const c = parse<Client>(list[i + 1]);
    if (c) out.push(normalizeClient(c));
  }
  if (!out.some((c) => c.id === DEFAULT_CLIENT)) {
    const s = { ...DEFAULT_SETTINGS, ...(parse<Partial<Settings>>(rawSettings) ?? {}) };
    out.push({
      id: DEFAULT_CLIENT,
      name: s.client,
      short: "GCN",
      rate: s.rate,
      currency: s.currency,
      billTo: GCN_BILL_TO,
      invoiceTo: gcnRecipients(),
      autoInvoice: true,
      logo: "/brand/clients/gcn.png",
      slug: PUBLIC_SLUG,
      createdAt: 0,
      archived: false,
    });
  }
  return out.sort((a, b) => (a.id === DEFAULT_CLIENT ? -1 : b.id === DEFAULT_CLIENT ? 1 : a.name.localeCompare(b.name)));
}

function normalizeClient(c: Client): Client {
  return {
    ...c,
    billTo: { name: c.billTo?.name ?? c.name, lines: c.billTo?.lines ?? [], phone: c.billTo?.phone ?? "", email: c.billTo?.email ?? "", web: c.billTo?.web ?? "" },
    invoiceTo: Array.isArray(c.invoiceTo) ? c.invoiceTo : [],
    autoInvoice: c.autoInvoice !== false,
    logo: c.logo ?? "",
    slug: c.id === DEFAULT_CLIENT ? PUBLIC_SLUG : "",
    archived: c.archived === true,
  };
}

export async function getClient(id: unknown): Promise<Client | null> {
  const key = typeof id === "string" && id ? id : DEFAULT_CLIENT;
  return (await getClients()).find((c) => c.id === key) ?? null;
}

/**
 * Save a client. GCN's rate and name are mirrored into the old settings key
 * too, so anything still reading it (and the saved-invoice shape) agrees.
 */
export async function saveClient(c: Client): Promise<void> {
  const cmds: Cmd[] = [["HSET", `${K}clients`, c.id, JSON.stringify(c)]];
  if (c.id === DEFAULT_CLIENT) {
    const s = await getSettings();
    cmds.push(["SET", `${K}settings`, JSON.stringify({ ...s, client: c.name, rate: c.rate, currency: c.currency })]);
  }
  await redis(cmds);
}

/** The invoice settings for a client: the owner's name with the client's rate. */
export function settingsFor(owner: Settings, c: Client): Settings {
  return { name: owner.name, client: c.name, rate: c.rate, currency: c.currency };
}

/** Validate a client as typed. Returns the clean client, or what to fix. */
export function cleanClient(body: Record<string, unknown>, existing: Client | null): Client | string {
  const name = String(body.name ?? existing?.name ?? "").replace(/\s+/g, " ").trim();
  if (!name || name.length > CLIENT_LIMITS.name) return "Give the client's name, up to 80 characters.";
  const short = String(body.short ?? existing?.short ?? name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, CLIENT_LIMITS.short);
  if (!short) return "Give a short tag for invoice numbers, letters and digits only.";
  const rate = Math.round(Number(body.rate ?? existing?.rate ?? 0) * 100) / 100;
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1000) return "The hourly rate has to be between 0 and 1,000.";
  const currency = String(body.currency ?? existing?.currency ?? "USD").toUpperCase().trim();
  if (!/^[A-Z]{3}$/.test(currency)) return "The currency is a three-letter code, like USD or CHF.";
  const bt = (body.billTo && typeof body.billTo === "object" ? body.billTo : {}) as Record<string, unknown>;
  const text = (v: unknown, fallback: string, max: number) => (v === undefined ? fallback : String(v)).replace(/\s+/g, " ").trim().slice(0, max);
  const linesRaw = Array.isArray(bt.lines) ? bt.lines : typeof bt.lines === "string" ? bt.lines.split("\n") : (existing?.billTo.lines ?? []);
  const lines = linesRaw.map((l) => String(l).replace(/\s+/g, " ").trim().slice(0, CLIENT_LIMITS.line)).filter(Boolean).slice(0, CLIENT_LIMITS.lines);
  const email = text(bt.email, existing?.billTo.email ?? "", 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "The billing email doesn't look like an email address.";
  const billTo: BillTo = {
    name: text(bt.name, existing?.billTo.name ?? name, CLIENT_LIMITS.line) || name,
    lines,
    phone: text(bt.phone, existing?.billTo.phone ?? "", 40),
    email,
    web: text(bt.web, existing?.billTo.web ?? "", 120).replace(/^https?:\/\//i, ""),
  };
  const toRaw = Array.isArray(body.invoiceTo) ? body.invoiceTo : typeof body.invoiceTo === "string" ? body.invoiceTo.split(/[,;\n]/) : (existing?.invoiceTo ?? []);
  const invoiceTo = toRaw.map((e) => String(e).trim().toLowerCase()).filter(Boolean).slice(0, CLIENT_LIMITS.emails);
  for (const e of invoiceTo) if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return `"${e}" doesn't look like an email address.`;
  return {
    id: existing?.id ?? randomToken(6).toLowerCase().replace(/[^a-z0-9]/g, "x"),
    name,
    short,
    rate,
    currency,
    billTo,
    invoiceTo,
    autoInvoice: typeof body.autoInvoice === "boolean" ? body.autoInvoice : (existing?.autoInvoice ?? true),
    logo: existing?.logo ?? "",
    slug: existing?.slug ?? "",
    createdAt: existing?.createdAt ?? Date.now(),
    archived: typeof body.archived === "boolean" ? body.archived : (existing?.archived ?? false),
  };
}

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

/** A client's link token, created on first use. SET NX keeps two first loads from racing. */
export async function getShareToken(client = DEFAULT_CLIENT): Promise<string> {
  const [, token] = await redis([
    ["SET", scoped(client, "share"), randomToken(), "NX"],
    ["GET", scoped(client, "share")],
  ]);
  return String(token);
}

export async function rotateShareToken(client = DEFAULT_CLIENT): Promise<string> {
  const token = randomToken();
  await redis([["SET", scoped(client, "share"), token]]);
  return token;
}

/** Every client's link token at once, by client id. */
export async function allShareTokens(clients: Client[]): Promise<Map<string, string>> {
  const res = await redis(clients.flatMap((c) => [["SET", scoped(c.id, "share"), randomToken(), "NX"], ["GET", scoped(c.id, "share")]]));
  return new Map(clients.map((c, i) => [c.id, String(res[i * 2 + 1])]));
}

export async function getTimer(): Promise<Timer | null> {
  const [raw] = await redis([["GET", `${K}timer`]]);
  const t = parse<Timer>(raw);
  return t ? { ...t, client: t.client || DEFAULT_CLIENT } : null;
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
      if (e) out.push({ ...e, client: e.client || DEFAULT_CLIENT });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** One client's entries, oldest first. */
export function entriesOf(entries: Entry[], client: string): Entry[] {
  return entries.filter((e) => (e.client || DEFAULT_CLIENT) === client);
}

async function findEntry(id: string): Promise<Entry | null> {
  const month = id.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [raw] = await redis([["HGET", `${K}m:${month}`, id]]);
  const e = parse<Entry>(raw);
  return e ? { ...e, client: e.client || DEFAULT_CLIENT } : null;
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

/**
 * Deleting moves the entry to the trash rather than losing it: one slip of
 * the thumb on a phone would otherwise cost real, billable work. The trash
 * keeps it for TRASH_DAYS, and Restore puts it back exactly as it was.
 */
export type Trashed = { entry: Entry; deletedAt: number };

export const TRASH_DAYS = 90;

export async function deleteEntry(e: Entry): Promise<void> {
  const month = e.id.slice(0, 7);
  const t: Trashed = { entry: e, deletedAt: Date.now() };
  await redis([
    ["HSET", `${K}trash`, e.id, JSON.stringify(t)],
    ["HDEL", `${K}m:${month}`, e.id],
  ]);
}

/** Everything in the trash, newest first. Anything older than TRASH_DAYS is dropped on the way. */
export async function trashList(): Promise<Trashed[]> {
  const [flat] = await redis([["HGETALL", `${K}trash`]]);
  const list = Array.isArray(flat) ? (flat as string[]) : [];
  const out: Trashed[] = [];
  const stale: string[] = [];
  const cutoff = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
  for (let i = 0; i + 1 < list.length; i += 2) {
    const t = parse<Trashed>(list[i + 1]);
    if (t && t.entry && t.deletedAt > cutoff) out.push(t);
    else stale.push(list[i]);
  }
  if (stale.length) await redis([["HDEL", `${K}trash`, ...stale]]);
  return out.sort((a, b) => b.deletedAt - a.deletedAt);
}

/** Put a trashed entry back in the log. Returns null when it isn't in the trash. */
export async function restoreEntry(id: string): Promise<Entry | null> {
  const [raw] = await redis([["HGET", `${K}trash`, id]]);
  const t = parse<Trashed>(raw);
  if (!t?.entry) return null;
  const entry = await saveEntry(t.entry);
  await redis([["HDEL", `${K}trash`, id]]);
  return entry;
}

export async function purgeTrashed(id: string): Promise<void> {
  await redis([["HDEL", `${K}trash`, id]]);
}

export { findEntry };

// ---------------------------------------------------------------------------
// Payments: whether each invoice has been paid
// ---------------------------------------------------------------------------

export type Payment = {
  /** When it was marked paid (the day the money arrived), epoch ms. */
  paidAt: number;
  /** The currency the transfer came in. The invoice itself is always in USD. */
  currency: "USD" | "CHF";
  /** The amount received in that currency, if known. */
  amount: number | null;
  note: string;
};

/** Every payment of one client, by invoice period id. */
export async function allPayments(client = DEFAULT_CLIENT): Promise<Record<string, Payment>> {
  const [flat] = await redis([["HGETALL", scoped(client, "paid")]]);
  const list = Array.isArray(flat) ? (flat as string[]) : [];
  const out: Record<string, Payment> = {};
  for (let i = 0; i + 1 < list.length; i += 2) {
    const p = parse<Payment>(list[i + 1]);
    if (p) out[list[i]] = p;
  }
  return out;
}

export async function setPayment(client: string, period: string, p: Payment | null): Promise<void> {
  await redis([p ? ["HSET", scoped(client, "paid"), period, JSON.stringify(p)] : ["HDEL", scoped(client, "paid"), period]]);
}

// ---------------------------------------------------------------------------
// Monthly summary: three short lines for the client, per month
// ---------------------------------------------------------------------------

export type Summary = {
  /** What was delivered this month. */
  delivered: string;
  /** What comes next. */
  next: string;
  /** What needs the client's decision. */
  decide: string;
  updatedAt: number;
};

export const SUMMARY_LIMIT = 400;

export async function allSummaries(client = DEFAULT_CLIENT): Promise<Record<string, Summary>> {
  const [flat] = await redis([["HGETALL", scoped(client, "summary")]]);
  const list = Array.isArray(flat) ? (flat as string[]) : [];
  const out: Record<string, Summary> = {};
  for (let i = 0; i + 1 < list.length; i += 2) {
    const s = parse<Summary>(list[i + 1]);
    if (s) out[list[i]] = s;
  }
  return out;
}

export async function setSummary(client: string, month: string, s: Summary | null): Promise<void> {
  await redis([s ? ["HSET", scoped(client, "summary"), month, JSON.stringify(s)] : ["HDEL", scoped(client, "summary"), month]]);
}

/** Every client's summaries, by client id then month. */
export async function allSummariesByClient(clients: Client[]): Promise<Record<string, Record<string, Summary>>> {
  const res = await redis(clients.map((c) => ["HGETALL", scoped(c.id, "summary")]));
  const out: Record<string, Record<string, Summary>> = {};
  clients.forEach((c, i) => {
    const list = Array.isArray(res[i]) ? (res[i] as string[]) : [];
    out[c.id] = {};
    for (let j = 0; j + 1 < list.length; j += 2) {
      const s = parse<Summary>(list[j + 1]);
      if (s) out[c.id][list[j]] = s;
    }
  });
  return out;
}

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
  const t = parse<Timer>(raw);
  return t ? { ...t, client: t.client || DEFAULT_CLIENT } : null;
}

/**
 * Validate the user-entered part of an entry. Returns the clean fields, or a
 * message that says what to fix.
 */
export function cleanEntry(body: Record<string, unknown>, clients: Client[]): Omit<Entry, "id"> | string {
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
  const client = typeof body.client === "string" && body.client ? body.client : DEFAULT_CLIENT;
  if (!clients.some((c) => c.id === client)) return "That client isn't on the list any more. Refresh the page.";
  return { start: Math.round(start), end: Math.round(end), task, notes, link, client };
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
