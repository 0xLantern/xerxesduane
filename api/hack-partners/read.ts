// What a partner's link fetches: GET /api/hack-partners/read?c=<code>&d=<device>
//
// No login. The code finds the invite; the device id is checked against the
// devices the code has already opened on. The page's words come back only
// when both pass. A revoked or expired code is a 404, a third device a 403.
// The signed-in owner can open any code to check it without using a device slot.
import { CONTENT } from "./_content";
import {
  CODE,
  DEVICE_ID,
  EXPIRES_AT,
  K,
  MAX_DEVICES,
  alertOwner,
  countryName,
  deviceHash,
  errorResponse,
  esc,
  handle,
  isOwner,
  parse,
  redis,
  underLimit,
  type Invite,
  type Seen,
} from "./_lib";

export const config = { runtime: "edge" };

const GONE = "This link has expired or was withdrawn. If you think that's a mistake, message Xerxes.";
const LOCKED =
  "This link is already open on two other devices, so it can't open here. If this is your new phone or computer, message Xerxes and he'll let it in.";

/** Never cached anywhere, never indexed, never leaking the address on. */
function reply(body: unknown, status = 200): Response {
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

export default handle(async (req) => {
  if (req.method !== "GET") return errorResponse("Method not allowed.", 405);
  // Thirty opens a minute from one address is far more than a person needs.
  if (!(await underLimit("hackp-read", req, 30, 60))) return reply({ error: "Too many tries. Wait a minute." }, 429);

  const u = new URL(req.url);
  const c = u.searchParams.get("c") ?? "";
  const d = u.searchParams.get("d") ?? "";
  if (!CODE.test(c) || Date.now() > EXPIRES_AT) return reply({ error: GONE }, 404);

  const [rawInvite, rawSeen, rawPlaces] = await redis([
    ["HGET", `${K}invites`, c],
    ["GET", `${K}seen:${c}`],
    ["GET", `${K}places`],
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
        `${invite.name}'s #HACK partner link was tried on another device`,
        `<p>Someone tried to open <strong>${esc(invite.name)}</strong>'s partner page on a third device${country ? ` in ${esc(countryName(country))}` : ""}. It didn't open.</p><p>If it was them on a new phone, let the device in from /hp. If it wasn't, revoke their link.</p>`,
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
        await alertOwner(`opened:${c}`, 24 * 60, `${invite.name} opened the #HACK partner page`, `<p><strong>${esc(invite.name)}</strong> opened their partner page${country ? ` from ${esc(countryName(country))}` : ""}.</p>`);
      } else if (newCountry && seen.countries.length > 1) {
        await alertOwner(
          `country:${c}:${country}`,
          24 * 60,
          `${invite.name}'s #HACK partner link opened from ${countryName(country)}`,
          `<p><strong>${esc(invite.name)}</strong>'s partner page was opened on a second device from <strong>${esc(countryName(country))}</strong>, a country it hadn't been opened from before.</p>`,
        );
      }
    }
  }

  const taken = Math.max(0, Math.min(CONTENT.ask.places, Number(rawPlaces) || 0));
  return reply({
    // The first word only: it greets them and goes in the watermark.
    name: invite.name.trim().split(/\s+/)[0] || "friend",
    content: CONTENT,
    places: { taken, total: CONTENT.ask.places },
    expiresAt: EXPIRES_AT,
    owner,
  });
});
