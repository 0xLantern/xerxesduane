// Private ministry briefing: storage, device lock and owner alerts.
//
// One personal link per person the owner invites to consider joining the
// ministry team, in the same shape as the #HACK partner page (/hp):
//
//   - The briefing is never in this public repository in readable form. It is
//     sealed (AES-256-GCM) outside the repo and shipped as public/jb/brief.dat.
//     Its key lives only in the JOIN_BRIEF_KEY environment variable, and
//     read.ts hands it out only for a valid personal link on a device it has
//     let in.
//   - Each person gets their own code, made by the owner on /join. A code
//     can be revoked at any time.
//   - A code opens on one device only (MAX_DEVICES), the first to open it.
//     A forwarded link fails anywhere else, and the owner gets an email.
//   - Guessing is pointless (144-bit codes) and rate limited anyway.
//
// Storage is the site's Redis, under join:v1:
//   invites            hash, code -> Invite JSON
//   seen:<code>        Seen JSON: devices and countries it was opened from
//
// The owner signs in with the same login as /letters (api/work/session).
export { errorResponse, handle, isOwner, json, randomToken, readJson, redis, requireOwner, sameOrigin, underLimit } from "../work/_lib";
import { OWNER_EMAIL, redis } from "../work/_lib";

export const K = "join:v1:";
export const ORIGIN = "https://ministry.xerxesduane.com";

/** One device per person: a forwarded link opens nowhere else. */
export const MAX_DEVICES = 1;

export const CODE = /^[A-Za-z0-9_-]{20,32}$/;
export const DEVICE_ID = /^[A-Za-z0-9_-]{16,64}$/;
/** The briefing's key, base64url (see the sealing script's README). */
export const BRIEF_KEY = /^[A-Za-z0-9_-]{43}$/;

/** Where replies go. The number is already public on the #HACK page. */
export const OWNER_WHATSAPP = "971543281995";

export type Invite = {
  code: string;
  /** Who it is for, as the owner wrote it. The page greets them by the first word. */
  name: string;
  createdAt: number;
  /** First time the link opened on a device that was let in. */
  openedAt: number | null;
  /** What they tapped on their page, if anything. The latest tap wins. */
  response?: { kind: ResponseKind; at: number };
};

/** The answers a person can give at the foot of their page. */
export const RESPONSE_KINDS = ["join", "talk", "pray", "notnow"] as const;
export type ResponseKind = (typeof RESPONSE_KINDS)[number];

export const RESPONSE_LABEL: Record<ResponseKind, string> = {
  join: "would like to join the team",
  talk: "would like to talk first",
  pray: "will pray with you",
  notnow: "said not right now",
};

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
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`join-device|${d}`)));
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

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Never cached anywhere, never indexed, never leaking the address on. */
export function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow, noarchive",
      "referrer-policy": "no-referrer",
    },
  });
}

/**
 * Email the owner, at most once per `key` per `hours`. Best effort: a page
 * view never fails because an alert could not be sent. Subjects stay plain
 * ("private briefing"): an inbox preview should say nothing about the work.
 */
export async function alertOwner(key: string, hours: number, subject: string, html: string) {
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
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">${html}<p style="color:#8a7f75;font-size:13px;">ministry.xerxesduane.com/join</p></div>`,
      }),
    });
  } catch {
    /* best effort */
  }
}
