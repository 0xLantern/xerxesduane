// #HACK2026 Dubai team pages: storage, device lock and the Champions' access.
//
// Built on the partner page's pattern (api/hack-partners/_lib.ts), for the
// registered participants instead of the partners:
//
//   - Each participant gets one personal link, ministry.xerxesduane.com/ht/<code>,
//     made by a Champion on /ht. Before the team dinner it asks for their top
//     two challenges and what they bring. Once the Champions announce the
//     teams, the same link becomes their team page: the full challenge brief,
//     teammates and roles, the dates, and the weekly check-in.
//   - The detailed briefs live on the server (_briefs.ts) and are sent only to
//     a member of that team, on a device the link has let in. They are never
//     on the public /hack page or in any bundle.
//   - A link opens on at most MAX_DEVICES devices, can be revoked, and every
//     link expires on EXPIRES_AT.
//
// Storage is the site's Redis, under hackt:v1:
//   people             hash, code -> Person JSON
//   seen:<code>        Seen JSON: devices and countries it was opened from
//   published          "1" once the Champions have announced the teams
//   checkins:<n>       list, newest first: CheckIn JSON for challenge n's team
//   summary:<n>        Summary JSON: challenge n's one-page summary for showcase night
//   show               Show JSON: the 21 November running order and timings
//   links:<n>          TeamLink[] JSON: the links challenge n's team has pinned
//   safety:<n>         Safety JSON: the team's safety checklist and the reviewer's verdict
//   guests             hash, code -> Guest JSON: security reviewer, mentors and judges
//   gseen:<code>       Seen JSON for a guest link
//   scores             hash, judge code -> { [n]: Score } JSON
//   reminded:<date>    set once the check-in reminders for that date have gone out
//
// Guests open /ht/g/<code>. A security reviewer sees every team's checklist
// and marks it passed or needing fixes; a mentor sees only the teams they were
// given (brief, check-ins, links, one-pager); a judge scores every team on the
// four criteria. None of them ever sees a phone number or an email address.
//
// Who may run the panel: the owner (the /letters login), or a co-Champion by
// the same secret as their partner panel (HACKP_CHAMPIONS), at
// /ht/champion/<secret>. Unlike partner links, every Champion sees every
// participant: forming teams is shared work.
export { errorResponse, handle, isOwner, json, randomToken, readJson, redis, requireOwner, sameOrigin, underLimit } from "../work/_lib";
export { alertOwner, championFor, countryName, deviceHash, esc, parse, type Seen } from "../hack-partners/_lib";
import { deviceHash, parse, type Seen } from "../hack-partners/_lib";
import { redis } from "../work/_lib";
import { CHALLENGES } from "../../src/data/hack";

export const K = "hackt:v1:";
export const ORIGIN = "https://ministry.xerxesduane.com";
/** The footer of the owner's alert emails. */
export const PANEL = "ministry.xerxesduane.com/ht";

/** Every link stops working after this: three weeks after the presentations, for the follow-up. */
export const EXPIRES_AT = Date.parse("2026-12-12T23:59:59+04:00");

/** A phone and a laptop: participants build on a laptop and check in from a phone. */
export const MAX_DEVICES = 2;

export const CODE = /^[A-Za-z0-9_-]{20,32}$/;
export const DEVICE_ID = /^[A-Za-z0-9_-]{16,64}$/;

/** Challenge numbers, 1 to 7, as on the public page. */
export const CHALLENGE_NS = CHALLENGES.map((c) => c.n);
export const isChallenge = (n: unknown): n is number => typeof n === "number" && CHALLENGE_NS.includes(n);

export { HOURS, SKILLS, type Hours, type Skill } from "../../src/hackteams/shared";
import type { Hours, Skill } from "../../src/hackteams/shared";

export type Prefs = {
  first: number;
  second: number | null;
  skills: Skill[];
  /** Hours a week they can give between 17 October and 21 November. */
  hours: Hours;
  /** Will they be at the team dinner on 17 October? */
  dinner: "yes" | "no";
  note: string;
  at: number;
};

export type Person = {
  code: string;
  /** As the Champion wrote it. The page greets them by greetName(). */
  name: string;
  createdAt: number;
  openedAt: number | null;
  /** Which Champion made the link, by first name. */
  by: string;
  prefs?: Prefs;
  /** The challenge whose team they are in, once a Champion has placed them. */
  team?: number;
  /** Their role in the team, as a Champion wrote it, e.g. "Developer". */
  role?: string;
  /** For the Wednesday check-in reminder only. Never shown on any page but the panel. */
  email?: string;
};

export type TeamLink = { id: string; label: string; url: string; by: string; at: number };

export type Safety = {
  /** Item index -> who ticked it. */
  ticks: Record<string, { by: string; at: number }>;
  review?: { status: "passed" | "fixes"; note: string; by: string; at: number };
};

export const GUEST_KINDS = ["security", "mentor", "judge"] as const;
export type GuestKind = (typeof GUEST_KINDS)[number];
export type Guest = {
  code: string;
  name: string;
  kind: GuestKind;
  /** A mentor's teams. Empty means every team (the reviewer and judges). */
  teams: number[];
  createdAt: number;
  openedAt: number | null;
  by: string;
};

/** One judge's marks for one team: the four criteria, 1 to 5 each, and a comment. */
export type Score = { s: number[]; note: string; at: number };

export const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[A-Za-z]{2,24}$/;

/** A pinned link must be an ordinary web address. */
export function webUrl(v: unknown): string | null {
  try {
    const u = new URL(String(v ?? "").trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

/**
 * A device check for any private link: lets a new device in while there is
 * room, refuses the rest. Returns true when this device may open the link.
 */
export async function letDeviceIn(req: Request, seenKey: string, d: string, max: number): Promise<{ ok: boolean; first: boolean }> {
  if (!DEVICE_ID.test(d)) return { ok: false, first: false };
  const [raw] = await redis([["GET", seenKey]]);
  const seen: Seen = parse<Seen>(raw) ?? { devices: [], countries: [] };
  const h = await deviceHash(d);
  if (seen.devices.some((x) => x.h === h)) return { ok: true, first: false };
  if (req.method !== "GET" || seen.devices.length >= max) return { ok: false, first: false };
  const country = req.headers.get("x-vercel-ip-country") ?? "";
  seen.devices.push({ h, at: Date.now(), country });
  if (country && !seen.countries.includes(country)) seen.countries.push(country);
  await redis([["SET", seenKey, JSON.stringify(seen)]]);
  return { ok: true, first: seen.devices.length === 1 };
}

export type CheckIn = {
  /** Who posted it, by the name they're greeted by. */
  by: string;
  did: string;
  next: string;
  /** Empty when the team doesn't need a Champion. */
  help: string;
  at: number;
};

/**
 * A team's one-page summary for showcase night. Everything but `public` is
 * for the Champions and the partners; `public` is the one line the team
 * agrees could be shared beyond them, for example with Indigitous.
 */
export type Summary = { built: string; helps: string; works: string; next: string; public: string; by: string; at: number };

/** The 21 November running order: which teams, in what order, and for how long. */
export type Show = { order: number[]; present: number; qa: number; start: string };

/** As the public program has it: presentations from 6:40, five minutes and two for questions. */
export const SHOW_DEFAULT: Omit<Show, "order"> = { present: 5, qa: 2, start: "18:40" };

/** Plain text from a form field: one line or a few, trimmed and capped. */
export function clean(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
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
