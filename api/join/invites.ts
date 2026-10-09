// The owner's side of the private briefing: make, list and revoke personal links.
//
//   GET                              every invite, newest first
//   POST {action:"create", name}     a new personal link for one person
//   POST {action:"revoke", code}     the link stops working at once
//   POST {action:"reset", code}      clear its devices, so a new phone can open it
//
// Owner only, signed in with the /letters login. Writes must come from the page.
import {
  CODE,
  K,
  ORIGIN,
  errorResponse,
  handle,
  json,
  parse,
  randomToken,
  readJson,
  redis,
  requireOwner,
  type Invite,
  type Seen,
} from "./_lib";

export const config = { runtime: "edge" };

const noStore = { "cache-control": "no-store, max-age=0" };

/** What the panel shows for one invite. */
function row(v: Invite, s: Seen | null) {
  const seen = s ?? { devices: [], countries: [] };
  return { ...v, link: `${ORIGIN}/join/${v.code}`, devices: seen.devices.length, countries: seen.countries };
}

export default handle(async (req) => {
  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;

  if (req.method === "GET") {
    const [all] = await redis([["HGETALL", `${K}invites`]]);
    const flat = Array.isArray(all) ? (all as string[]) : [];
    const invites: Invite[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const inv = parse<Invite>(flat[i + 1]);
      if (inv) invites.push(inv);
    }
    const seenRaw = invites.length ? await redis(invites.map((v) => ["GET", `${K}seen:${v.code}`])) : [];
    const rows = invites.map((v, i) => row(v, parse<Seen>(seenRaw[i]))).sort((a, b) => b.createdAt - a.createdAt);
    return json({ invites: rows, ready: /^[A-Za-z0-9_-]{43}$/.test((process.env.JOIN_BRIEF_KEY ?? "").trim()) }, 200, noStore);
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
    return json({ invite: row(invite, null) }, 200, noStore);
  }

  if (action === "revoke" || action === "reset") {
    const code = String(b.code ?? "");
    if (!CODE.test(code)) return errorResponse("That link isn't one of yours.");
    const [raw] = await redis([["HGET", `${K}invites`, code]]);
    if (!parse<Invite>(raw)) return errorResponse("That link isn't one of yours.");
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

  return errorResponse("Unknown action.");
});
