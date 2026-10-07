// The Champions' side of the partner page: make, list and revoke personal links.
//
//   GET                                   invites (all for the owner, own ones for a co-Champion), and places taken
//   POST {action:"create", name}          a new personal link for one person
//   POST {action:"revoke", code}          the link stops working at once
//   POST {action:"reset", code}           clear its devices, so a new phone can open it
//   POST {action:"places", taken}         how many of the ten places are taken
//
// Two ways in:
//   - the owner, signed in with the /letters login (sees and manages every link);
//   - a co-Champion, by the secret in their own panel link (/hp/team/<secret>),
//     sent as the x-hp-champion header. They see and manage only the links they
//     made. Secrets live in the HACKP_CHAMPIONS environment variable (see _lib.ts),
//     so nothing about them is in the repository.
// Writes must come from the page itself either way.
import { CONTENT } from "./_content";
import {
  CODE,
  EXPIRES_AT,
  K,
  ORIGIN,
  championFor,
  errorResponse,
  handle,
  json,
  parse,
  randomToken,
  readJson,
  redis,
  requireOwner,
  sameOrigin,
  underLimit,
  type Invite,
  type Seen,
} from "./_lib";

export const config = { runtime: "edge" };

const noStore = { "cache-control": "no-store, max-age=0" };

type Who = { role: "owner"; name: string } | { role: "champion"; name: string };

/** Who is asking, or the response to send instead. */
async function who(req: Request, write: boolean): Promise<Who | Response> {
  const secret = req.headers.get("x-hp-champion");
  if (secret) {
    // A guessed secret gets nowhere fast.
    if (!(await underLimit("hackp-team", req, 60, 60))) return errorResponse("Too many tries. Wait a minute.", 429);
    const name = await championFor(secret);
    if (!name) return errorResponse("This panel link isn't valid any more. Ask Xerxes for a new one.", 401);
    if (write && !sameOrigin(req)) return errorResponse("Blocked: that request did not come from this page.", 403);
    return { role: "champion", name };
  }
  const denied = await requireOwner(req, write);
  if (denied) return denied;
  return { role: "owner", name: "Xerxes" };
}

/** What the panel shows for one invite. */
function row(v: Invite, s: Seen | null) {
  const seen = s ?? { devices: [], countries: [] };
  return { ...v, by: v.by ?? "Xerxes", link: `${ORIGIN}/hp/${v.code}`, devices: seen.devices.length, countries: seen.countries };
}

export default handle(async (req) => {
  const me = await who(req, req.method !== "GET");
  if (me instanceof Response) return me;
  const mine = (v: Invite) => me.role === "owner" || v.by === me.name;

  if (req.method === "GET") {
    const [all, places] = await redis([
      ["HGETALL", `${K}invites`],
      ["GET", `${K}places`],
    ]);
    const flat = Array.isArray(all) ? (all as string[]) : [];
    const invites: Invite[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const inv = parse<Invite>(flat[i + 1]);
      if (inv && mine(inv)) invites.push(inv);
    }
    const seenRaw = invites.length ? await redis(invites.map((v) => ["GET", `${K}seen:${v.code}`])) : [];
    const rows = invites.map((v, i) => row(v, parse<Seen>(seenRaw[i]))).sort((a, b) => b.createdAt - a.createdAt);
    return json(
      { invites: rows, places: { taken: Number(places) || 0, total: CONTENT.ask.places }, expiresAt: EXPIRES_AT, me: { role: me.role, name: me.name } },
      200,
      noStore,
    );
  }

  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const b = await readJson(req);
  const action = String(b.action ?? "");

  if (action === "create") {
    const name = String(b.name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (!name) return errorResponse("Write who the link is for.");
    const code = randomToken(18); // 144 bits, 24 characters
    const invite: Invite = { code, name, createdAt: Date.now(), openedAt: null, by: me.name };
    await redis([["HSET", `${K}invites`, code, JSON.stringify(invite)]]);
    return json({ invite: row(invite, null) }, 200, noStore);
  }

  if (action === "revoke" || action === "reset") {
    const code = String(b.code ?? "");
    if (!CODE.test(code)) return errorResponse("That link isn't one of yours.");
    const [raw] = await redis([["HGET", `${K}invites`, code]]);
    const inv = parse<Invite>(raw);
    if (!inv || !mine(inv)) return errorResponse("That link isn't one of yours.");
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

