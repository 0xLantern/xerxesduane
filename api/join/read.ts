// What a personal briefing link fetches: GET /api/join/read?c=<code>&d=<device>
//
// No login. The code finds the invite; the device id is checked against the
// devices the code has already opened on. The briefing's key comes back only
// when both pass, and the page then opens public/jb/brief.dat with it. A
// revoked code is a 404, any other device a 403. The signed-in owner can open
// any code to check it without using a device slot.
import { greetName } from "../../src/hackpartners/greet";
import {
  BRIEF_KEY,
  CODE,
  DEVICE_ID,
  K,
  MAX_DEVICES,
  OWNER_WHATSAPP,
  alertOwner,
  countryName,
  deviceHash,
  errorResponse,
  esc,
  handle,
  isOwner,
  parse,
  redis,
  reply,
  underLimit,
  type Invite,
  type Seen,
} from "./_lib";

export const config = { runtime: "edge" };

const GONE = "This link has expired or was withdrawn. If you think that's a mistake, message the person who sent it.";
const LOCKED =
  "This link is already open on another device, so it can't open here. If this is your new phone or computer, message the person who sent it and they'll let it in.";

export default handle(async (req) => {
  if (req.method !== "GET") return errorResponse("Method not allowed.", 405);
  if (!(await underLimit("join-read", req, 30, 60))) return reply({ error: "Too many tries. Wait a minute." }, 429);

  const key = (process.env.JOIN_BRIEF_KEY ?? "").trim();
  if (!BRIEF_KEY.test(key)) return reply({ error: "This page isn't ready yet. Please try again later." }, 503);

  const u = new URL(req.url);
  const c = u.searchParams.get("c") ?? "";
  const d = u.searchParams.get("d") ?? "";
  if (!CODE.test(c)) return reply({ error: GONE }, 404);

  const [rawInvite, rawSeen] = await redis([
    ["HGET", `${K}invites`, c],
    ["GET", `${K}seen:${c}`],
  ]);
  const invite = parse<Invite>(rawInvite);
  if (!invite) return reply({ error: GONE }, 404);

  const owner = await isOwner(req);
  if (!owner) {
    if (!DEVICE_ID.test(d)) return reply({ error: LOCKED, locked: true }, 403);
    const h = await deviceHash(d);
    const seen: Seen = parse<Seen>(rawSeen) ?? { devices: [], countries: [] };
    const country = req.headers.get("x-vercel-ip-country") ?? "";
    const known = seen.devices.some((x) => x.h === h);

    if (!known && seen.devices.length >= MAX_DEVICES) {
      await alertOwner(
        `locked:${c}`,
        12,
        `${invite.name}'s private briefing link was tried on another device`,
        `<p>Someone tried to open <strong>${esc(invite.name)}</strong>'s private briefing on another device${country ? ` in ${esc(countryName(country))}` : ""}. It didn't open.</p><p>If it was them on a new phone, let the device in from /join. If it wasn't, revoke their link.</p>`,
      );
      return reply({ error: LOCKED, locked: true }, 403);
    }

    if (!known) {
      seen.devices.push({ h, at: Date.now(), country });
      const newCountry = country && !seen.countries.includes(country);
      if (newCountry) seen.countries.push(country);
      const first = invite.openedAt === null;
      if (first) invite.openedAt = Date.now();
      await redis([
        ["SET", `${K}seen:${c}`, JSON.stringify(seen)],
        ["HSET", `${K}invites`, c, JSON.stringify(invite)],
      ]);
      if (first) {
        await alertOwner(`opened:${c}`, 24 * 60, `${invite.name} opened the private briefing`, `<p><strong>${esc(invite.name)}</strong> opened their private briefing${country ? ` from ${esc(countryName(country))}` : ""}.</p>`);
      } else if (newCountry && seen.countries.length > 1) {
        await alertOwner(
          `country:${c}:${country}`,
          24 * 60,
          `${invite.name}'s private briefing opened from ${countryName(country)}`,
          `<p><strong>${esc(invite.name)}</strong>'s private briefing was opened on a second device from <strong>${esc(countryName(country))}</strong>, a country it hadn't been opened from before.</p>`,
        );
      }
    }
  }

  return reply({
    name: greetName(invite.name),
    key,
    owner,
    whatsapp: OWNER_WHATSAPP,
    response: invite.response?.kind ?? null,
  });
});
