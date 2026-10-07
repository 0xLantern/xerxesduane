// The owner's side of the partner page: make, list and revoke personal links.
//
//   GET                                   every invite, with devices and countries, and places taken
//   POST {action:"create", name}          a new personal link for one person
//   POST {action:"revoke", code}          the link stops working at once
//   POST {action:"reset", code}           clear its devices, so a new phone can open it
//   POST {action:"places", taken}         how many of the ten places are taken
//
// Owner only, signed in with the /letters login. Writes must come from the page itself.
import { CONTENT } from "./_content";
import { CODE, EXPIRES_AT, K, ORIGIN, errorResponse, handle, json, parse, randomToken, readJson, redis, requireOwner, type Invite, type Seen } from "./_lib";

export const config = { runtime: "edge" };

const noStore = { "cache-control": "no-store, max-age=0" };

export default handle(async (req) => {
  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;

  if (req.method === "GET") {
    const [all, places] = await redis([
      ["HGETALL", `${K}invites`],
      ["GET", `${K}places`],
    ]);
    const flat = Array.isArray(all) ? (all as string[]) : [];
    const invites: Invite[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const inv = parse<Invite>(flat[i + 1]);
      if (inv) invites.push(inv);
    }
    const seenRaw = invites.length ? await redis(invites.map((v) => ["GET", `${K}seen:${v.code}`])) : [];
    const rows = invites
      .map((v, i) => {
        const s = parse<Seen>(seenRaw[i]) ?? { devices: [], countries: [] };
        return { ...v, link: `${ORIGIN}/hp/${v.code}`, devices: s.devices.length, countries: s.countries };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    return json({ invites: rows, places: { taken: Number(places) || 0, total: CONTENT.ask.places }, expiresAt: EXPIRES_AT }, 200, noStore);
  }

  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const b = await readJson(req);
  const action = String(b.action ?? "");

  if (action === "create") {
    const name = String(b.name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (!name) return errorResponse("Write who the link is for.");
    const code = randomToken(18); // 144 bits, 24 characters
    const invite: Invite = { code, name, createdAt: Date.now(), openedAt: null };
    await redis([["HSET", `${K}invites`, code, JSON.stringify(invite)]]);
    return json({ invite: { ...invite, link: `${ORIGIN}/hp/${code}`, devices: 0, countries: [] } }, 200, noStore);
  }

  if (action === "revoke" || action === "reset") {
    const code = String(b.code ?? "");
    if (!CODE.test(code)) return errorResponse("That link isn't one of yours.");
    if (action === "revoke") {
      await redis([
        ["HDEL", `${K}invites`, code],
        ["DEL", `${K}seen:${code}`],
      ]);
    } else {
      await redis([["DEL", `${K}seen:${code}`]]);
    }
    return json({ ok: true }, 200, noStore);
  }

  if (action === "places") {
    const taken = Math.max(0, Math.min(CONTENT.ask.places, Math.round(Number(b.taken) || 0)));
    await redis([["SET", `${K}places`, String(taken)]]);
    return json({ taken }, 200, noStore);
  }

  return errorResponse("Unknown action.");
});
