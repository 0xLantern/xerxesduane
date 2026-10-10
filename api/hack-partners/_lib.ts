// #HACK2026 Dubai partner page: storage, device lock and owner alerts.
//
// The page is for about ten friends in the UAE, and the document it comes
// from says "share in person, don't post or forward". So nothing is public:
//
//   - The words live on the server (_content.ts) and are sent only to a
//     browser holding a valid personal link: ministry.xerxesduane.com/hp/<code>.
//   - Each person gets their own code, made by the owner on /hp. A code can be
//     revoked at any time, and every code expires on EXPIRES_AT.
//   - A code opens on at most MAX_DEVICES devices, the first ones to open it.
//     A forwarded link fails on a third device, and the owner gets an email.
//   - Guessing is pointless (128-bit codes) and rate limited anyway.
//   - Responses are no-store and noindex; the page loads no analytics.
//
// Storage is the site's Redis, under hackp:v1:
//   invites            hash, code -> Invite JSON
//   seen:<code>        Seen JSON: devices and countries it was opened from
//   places             how many of the ten places are taken (set by hand, or
//                      worked out from recorded gifts: AED 300 a place)
//   updates            list, newest first: Update JSON the owner posts for every partner
//   spend              list, newest first: Spend JSON, what the money went on
//   statement          "1" while partners can see the money statement
//
// The owner signs in with the same login as /letters (api/work/session).
export { errorResponse, handle, isOwner, json, randomToken, readJson, redis, requireOwner, sameOrigin, underLimit } from "../work/_lib";
import { OWNER_EMAIL, redis, safeEqual } from "../work/_lib";

/**
 * Co-Champions: people other than the owner who may make partner links, each
 * through their own panel link, ministry.xerxesduane.com/hp/team/<secret>.
 *
 * Kept in the HACKP_CHAMPIONS environment variable as JSON, secret -> name,
 * e.g. {"Xq3…": "Abel Thomas"}, so no secret is ever in the repository.
 * Removing an entry (and redeploying) shuts that panel at once. A co-Champion
 * sees and manages only the links they made; the owner sees all of them.
 */
function champions(): Record<string, string> {
  try {
    const raw = JSON.parse(process.env.HACKP_CHAMPIONS || "{}") as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) if (/^[A-Za-z0-9_-]{24,64}$/.test(k) && typeof v === "string" && v.trim()) out[k] = v.trim();
    return out;
  } catch {
    return {};
  }
}

/** The co-Champion a panel secret belongs to, by first name, or null. Compared in constant time. */
export async function championFor(secret: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(secret)) return null;
  for (const [k, name] of Object.entries(champions())) {
    if (await safeEqual(k, secret)) return name.split(/\s+/)[0];
  }
  return null;
}

export const K = "hackp:v1:";
export const ORIGIN = "https://ministry.xerxesduane.com";

/** Every link stops working after this: a week after the presentations. */
export const EXPIRES_AT = Date.parse("2026-11-28T23:59:59+04:00");

/** A phone and a laptop, say. */
export const MAX_DEVICES = 2;

export const CODE = /^[A-Za-z0-9_-]{20,32}$/;
export const DEVICE_ID = /^[A-Za-z0-9_-]{16,64}$/;

export type Invite = {
  code: string;
  /** Who it is for, as the owner wrote it. The page greets them by the first word. */
  name: string;
  createdAt: number;
  /** First time the link opened on a device that was let in. */
  openedAt: number | null;
  /** Which Champion made it, by first name. Missing on links made before co-Champions existed: those are Xerxes's. */
  by?: string;
  /** What the partner tapped on their page, if anything. The latest tap wins. */
  response?: { kind: ResponseKind; at: number };
  /** A gift a Champion has recorded as received. Never shown to other partners. */
  gift?: Gift;
};

export type Gift = { amount: number; kind: "money" | "in-kind"; note: string; at: number };

/** A note for every partner, posted from the owner's panel. Shown newest first. */
export type Update = { id: string; title: string; body: string; at: number; by: string };

/** One thing the money went on, against a line of the budget. */
export type Spend = { id: string; item: string; amount: number; note: string; at: number };

/** One place is AED 300; two friends sharing give AED 150 each. */
export const PLACE_AED = 300;

/** Places taken, from the gifts received. */
export const placesFromGifts = (total: number, max: number) => Math.max(0, Math.min(max, Math.floor(total / PLACE_AED)));

/**
 * The money statement partners see once the owner switches it on: what came
 * in (as one total, never who gave), and what went out against each budget
 * line. Spending on anything not in the budget is shown as "Other".
 */
export function statement(gifts: Gift[], spend: Spend[], budget: { item: string; total: number }[]) {
  const received = gifts.reduce((s, g) => s + g.amount, 0);
  const lines = budget.map((b) => ({ item: b.item, planned: b.total, spent: 0 }));
  let other = 0;
  for (const x of spend) {
    const line = lines.find((l) => l.item === x.item);
    if (line) line.spent += x.amount;
    else other += x.amount;
  }
  if (other) lines.push({ item: "Other", planned: 0, spent: other });
  const spent = spend.reduce((s, x) => s + x.amount, 0);
  return { received, spent, left: received - spent, lines };
}

/** The four answers a partner can give on their page. */
export const RESPONSE_KINDS = ["in", "share", "pray", "notnow"] as const;
export type ResponseKind = (typeof RESPONSE_KINDS)[number];

export const RESPONSE_LABEL: Record<ResponseKind, string> = {
  in: "is in for a place",
  share: "would like to share a place",
  pray: "will pray with you",
  notnow: "said not this time",
};

/**
 * Where a partner's reply goes: the Champion who sent their link. Both numbers
 * are already public on the #HACK page. A co-Champion without a number here
 * falls back to Xerxes.
 */
const CHAMPION_WHATSAPP: Record<string, string> = {
  Xerxes: "971543281995",
  Abel: "971503454307",
};

export function championContact(by: string | undefined): { name: string; whatsapp: string } {
  const name = by && CHAMPION_WHATSAPP[by] ? by : "Xerxes";
  return { name, whatsapp: CHAMPION_WHATSAPP[name] };
}

export type Seen = { devices: { h: string; at: number; country: string }[]; countries: string[] };

export function parse<T>(raw: unknown): T | null {
  try {
    return typeof raw === "string" ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** A device id as the browser sends it, hashed so the stored value can't be replayed. */
export async function deviceHash(d: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`hackp-device|${d}`)));
  let s = "";
  for (const b of bytes.subarray(0, 16)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Email the owner, at most once per `key` per `hours`. The team pages
 * (api/hack-teams) use it too, with their own footer. Best effort: a page
 * view never fails because an alert could not be sent.
 */
export async function alertOwner(key: string, hours: number, subject: string, html: string, footer = "ministry.xerxesduane.com/hp") {
  const api = process.env.RESEND_API_KEY;
  if (!api) return;
  try {
    const [first] = await redis([["SET", `${K}alerted:${key}`, "1", "NX", "EX", hours * 3600]]);
    if (first !== "OK") return;
    const from = process.env.LETTERS_FROM || "Partner letters <letters@xerxesduane.com>";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${api}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [OWNER_EMAIL],
        subject,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">${html}<p style="color:#8a7f75;font-size:13px;">${footer}</p></div>`,
      }),
    });
  } catch {
    /* best effort */
  }
}

export { esc };
