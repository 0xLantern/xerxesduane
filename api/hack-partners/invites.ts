// The Champions' side of the partner page: make, list and revoke personal links.
//
//   GET                                   invites (all for the owner, own ones for a co-Champion), and places taken
//   POST {action:"create", name}          a new personal link for one person
//   POST {action:"revoke", code}          the link stops working at once
//   POST {action:"reset", code}           clear its devices, so a new phone can open it
//   POST {action:"places", taken}         how many of the ten places are taken
//   POST {action:"gift", code, amount, kind, note}   record a gift as received (amount 0 clears it)
//   POST {action:"update", title, body}   post an update every partner sees (owner only)
//   POST {action:"deleteUpdate", id}      take an update down (owner only)
//   POST {action:"spend", item, amount, note}        record what money went on (owner only)
//   POST {action:"deleteSpend", id}       remove a spending line (owner only)
//   POST {action:"statement", on}         show or hide the money statement on partners' pages (owner only)
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
  placesFromGifts,
  statement,
  type Gift,
  type Invite,
  type Seen,
  type Spend,
  type Update,
} from "./_lib";

export const config = { runtime: "edge" };

const list = <T,>(raw: unknown): T[] => (Array.isArray(raw) ? raw : []).map((r) => parse<T>(r)).filter((x): x is T => !!x);
const oneLine = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

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
    const [all, places, rawUpdates, rawSpend, statementOn] = await redis([
      ["HGETALL", `${K}invites`],
      ["GET", `${K}places`],
      ["LRANGE", `${K}updates`, 0, 49],
      ["LRANGE", `${K}spend`, 0, 199],
      ["GET", `${K}statement`],
    ]);
    const flat = Array.isArray(all) ? (all as string[]) : [];
    const invites: Invite[] = [];
    const gifts: Gift[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const inv = parse<Invite>(flat[i + 1]);
      if (inv?.gift) gifts.push(inv.gift);
      if (inv && mine(inv)) invites.push(inv);
    }
    const updates = list<Update>(rawUpdates);
    const spend = list<Spend>(rawSpend);
    // The money side is the owner's: a co-Champion sees their own partners' gifts only.
    const money =
      me.role === "owner"
        ? { budget: CONTENT.budget, spend, statementOn: statementOn === "1", ...statement(gifts, spend, CONTENT.budget), gifts: gifts.length }
        : null;
    const seenRaw = invites.length ? await redis(invites.map((v) => ["GET", `${K}seen:${v.code}`])) : [];
    const rows = invites.map((v, i) => row(v, parse<Seen>(seenRaw[i]))).sort((a, b) => b.createdAt - a.createdAt);
    return json(
      { invites: rows, places: { taken: Number(places) || 0, total: CONTENT.ask.places }, expiresAt: EXPIRES_AT, me: { role: me.role, name: me.name }, updates, money },
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

  if (action === "gift") {
    const code = String(b.code ?? "");
    if (!CODE.test(code)) return errorResponse("That link isn't one of yours.");
    const amount = Math.max(0, Math.min(100000, Math.round(Number(b.amount) || 0)));
    const [raw] = await redis([["HGET", `${K}invites`, code]]);
    const inv = parse<Invite>(raw);
    if (!inv || !mine(inv)) return errorResponse("That link isn't one of yours.");
    if (amount) {
      inv.gift = { amount, kind: b.kind === "in-kind" ? "in-kind" : "money", note: oneLine(b.note, 120), at: Date.now() };
    } else delete inv.gift;
    await redis([["HSET", `${K}invites`, code, JSON.stringify(inv)]]);
    // Places follow the gifts: every AED 300 received fills one.
    const [all] = await redis([["HGETALL", `${K}invites`]]);
    const flat = Array.isArray(all) ? (all as string[]) : [];
    let total = 0;
    for (let i = 0; i + 1 < flat.length; i += 2) total += parse<Invite>(flat[i + 1])?.gift?.amount ?? 0;
    const taken = placesFromGifts(total, CONTENT.ask.places);
    await redis([["SET", `${K}places`, String(taken)]]);
    return json({ ok: true, taken }, 200, noStore);
  }

  // Updates, spending and the statement speak for everyone: the owner's alone.
  if (["update", "deleteUpdate", "spend", "deleteSpend", "statement"].includes(action) && me.role !== "owner") {
    return errorResponse("Only Xerxes can do that, from his panel.", 403);
  }

  if (action === "update") {
    const title = oneLine(b.title, 100);
    const body = String(b.body ?? "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 4000);
    if (!title || !body) return errorResponse("Give the update a title and some words.");
    const u: Update = { id: randomToken(6), title, body, at: Date.now(), by: me.name };
    await redis([
      ["LPUSH", `${K}updates`, JSON.stringify(u)],
      ["LTRIM", `${K}updates`, 0, 49],
    ]);
    return json({ ok: true }, 200, noStore);
  }

  if (action === "deleteUpdate" || action === "deleteSpend") {
    const key = action === "deleteUpdate" ? `${K}updates` : `${K}spend`;
    const [raw] = await redis([["LRANGE", key, 0, 199]]);
    const hit = (Array.isArray(raw) ? (raw as string[]) : []).find((r) => parse<{ id: string }>(r)?.id === String(b.id ?? ""));
    if (hit) await redis([["LREM", key, 1, hit]]);
    return json({ ok: true }, 200, noStore);
  }

  if (action === "spend") {
    const item = oneLine(b.item, 80);
    const amount = Math.round(Number(b.amount) || 0);
    if (!item || amount <= 0 || amount > 100000) return errorResponse("Pick what it was for and an amount in AED.");
    const s: Spend = { id: randomToken(6), item, amount, note: oneLine(b.note, 120), at: Date.now() };
    await redis([
      ["LPUSH", `${K}spend`, JSON.stringify(s)],
      ["LTRIM", `${K}spend`, 0, 199],
    ]);
    return json({ ok: true }, 200, noStore);
  }

  if (action === "statement") {
    await redis([b.on ? ["SET", `${K}statement`, "1"] : ["DEL", `${K}statement`]]);
    return json({ ok: true }, 200, noStore);
  }

  if (action === "places") {
    const taken = Math.max(0, Math.min(CONTENT.ask.places, Math.round(Number(b.taken) || 0)));
    await redis([["SET", `${K}places`, String(taken)]]);
    return json({ taken }, 200, noStore);
  }

  return errorResponse("Unknown action.");
});

