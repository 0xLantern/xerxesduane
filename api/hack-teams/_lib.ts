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
//
// Who may run the panel: the owner (the /letters login), or a co-Champion by
// the same secret as their partner panel (HACKP_CHAMPIONS), at
// /ht/champion/<secret>. Unlike partner links, every Champion sees every
// participant: forming teams is shared work.
export { errorResponse, handle, isOwner, json, randomToken, readJson, redis, requireOwner, sameOrigin, underLimit } from "../work/_lib";
export { alertOwner, championFor, countryName, deviceHash, esc, parse, type Seen } from "../hack-partners/_lib";
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
};

export type CheckIn = {
  /** Who posted it, by the name they're greeted by. */
  by: string;
  did: string;
  next: string;
  /** Empty when the team doesn't need a Champion. */
  help: string;
  at: number;
};

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
