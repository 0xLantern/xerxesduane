// The Champions' side of the team pages.
//
//   GET                                         everyone, their choices and teams, the check-ins, and whether teams are announced
//   POST {action:"create", names}               one personal link per line of names
//   POST {action:"revoke", code}                the link stops working at once
//   POST {action:"reset", code}                 clear its devices, so a new phone or laptop can open it
//   POST {action:"assign", code, team, role}    place one person (team 0 takes them out)
//   POST {action:"assignMany", assignments}     place many at once (the panel's "Suggest teams")
//   POST {action:"announce", on}                show (or hide) the teams on everyone's page
//   POST {action:"show", order, present, qa, start}   the 21 November running order and timings
//
// Two ways in, as on the partner panel: the owner signed in with the /letters
// login, or a co-Champion by their HACKP_CHAMPIONS secret in the
// x-hp-champion header (their panel is /ht/champion/<secret>). Both see and
// manage everyone. Writes must come from the page itself either way.
import {
  CHALLENGE_NS,
  CODE,
  EXPIRES_AT,
  K,
  ORIGIN,
  championFor,
  clean,
  errorResponse,
  handle,
  isChallenge,
  json,
  parse,
  randomToken,
  readJson,
  redis,
  requireOwner,
  sameOrigin,
  underLimit,
  SHOW_DEFAULT,
  type CheckIn,
  type Person,
  type Seen,
  type Show,
  type Summary,
} from "./_lib";

export const config = { runtime: "edge" };

const noStore = { "cache-control": "no-store, max-age=0" };

async function who(req: Request, write: boolean): Promise<string | Response> {
  const secret = req.headers.get("x-hp-champion");
  if (secret) {
    if (!(await underLimit("hackt-team", req, 60, 60))) return errorResponse("Too many tries. Wait a minute.", 429);
    const name = await championFor(secret);
    if (!name) return errorResponse("This panel link isn't valid any more. Ask Xerxes for a new one.", 401);
    if (write && !sameOrigin(req)) return errorResponse("Blocked: that request did not come from this page.", 403);
    return name;
  }
  const denied = await requireOwner(req, write);
  if (denied) return denied;
  return "Xerxes";
}

async function everyone(): Promise<Person[]> {
  const [all] = await redis([["HGETALL", `${K}people`]]);
  const flat = Array.isArray(all) ? (all as string[]) : [];
  const out: Person[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const p = parse<Person>(flat[i + 1]);
    if (p) out.push(p);
  }
  return out;
}

export default handle(async (req) => {
  const me = await who(req, req.method !== "GET");
  if (me instanceof Response) return me;

  if (req.method === "GET") {
    const people = await everyone();
    const extra = await redis([
      ["GET", `${K}published`],
      ["GET", `${K}show`],
      ...people.map((p) => ["GET", `${K}seen:${p.code}`]),
      ...CHALLENGE_NS.map((n) => ["LRANGE", `${K}checkins:${n}`, 0, 19]),
      ...CHALLENGE_NS.map((n) => ["GET", `${K}summary:${n}`]),
    ]);
    const announced = extra[0] === "1";
    const show: Show = parse<Show>(extra[1]) ?? { order: [], ...SHOW_DEFAULT };
    const seen = extra.slice(2, 2 + people.length);
    const lists = extra.slice(2 + people.length, 2 + people.length + CHALLENGE_NS.length);
    const sums = extra.slice(2 + people.length + CHALLENGE_NS.length);
    const summaries: Record<number, Summary | null> = {};
    CHALLENGE_NS.forEach((n, i) => (summaries[n] = parse<Summary>(sums[i])));
    const rows = people
      .map((p, i) => {
        const s = parse<Seen>(seen[i]) ?? { devices: [], countries: [] };
        return { ...p, link: `${ORIGIN}/ht/${p.code}`, devices: s.devices.length, countries: s.countries };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    const checkins: Record<number, CheckIn[]> = {};
    CHALLENGE_NS.forEach((n, i) => {
      checkins[n] = (Array.isArray(lists[i]) ? (lists[i] as unknown[]) : []).map((r) => parse<CheckIn>(r)).filter((x): x is CheckIn => !!x);
    });
    return json({ people: rows, announced, checkins, summaries, show, expiresAt: EXPIRES_AT, me }, 200, noStore);
  }

  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const b = await readJson(req);
  const action = String(b.action ?? "");

  if (action === "create") {
    const names = String(b.names ?? "")
      .split(/\r?\n/)
      .map((n) => n.replace(/\s+/g, " ").trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 60);
    if (!names.length) return errorResponse("Write at least one name, one per line.");
    const made = names.map((name): Person => ({ code: randomToken(18), name, createdAt: Date.now(), openedAt: null, by: me }));
    await redis(made.map((p) => ["HSET", `${K}people`, p.code, JSON.stringify(p)]));
    return json({ made: made.length }, 200, noStore);
  }

  if (action === "assignMany") {
    const list = Array.isArray(b.assignments) ? (b.assignments as { code?: unknown; team?: unknown }[]) : [];
    const people = new Map((await everyone()).map((p) => [p.code, p]));
    const writes: (string | number)[][] = [];
    for (const a of list.slice(0, 200)) {
      const p = people.get(String(a.code ?? ""));
      const team = Number(a.team);
      if (!p || !isChallenge(team)) continue;
      p.team = team;
      writes.push(["HSET", `${K}people`, p.code, JSON.stringify(p)]);
    }
    if (writes.length) await redis(writes);
    return json({ placed: writes.length }, 200, noStore);
  }

  if (action === "announce") {
    await redis([b.on ? ["SET", `${K}published`, "1"] : ["DEL", `${K}published`]]);
    return json({ announced: !!b.on }, 200, noStore);
  }

  if (action === "show") {
    const order = (Array.isArray(b.order) ? b.order : []).map(Number).filter((n, i, a) => isChallenge(n) && a.indexOf(n) === i);
    const minutes = (v: unknown, d: number) => Math.max(1, Math.min(30, Math.round(Number(v) || d)));
    const start = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.start ?? "")) ? String(b.start) : SHOW_DEFAULT.start;
    const show: Show = { order, present: minutes(b.present, SHOW_DEFAULT.present), qa: minutes(b.qa, SHOW_DEFAULT.qa), start };
    await redis([["SET", `${K}show`, JSON.stringify(show)]]);
    return json({ show }, 200, noStore);
  }

  // The rest act on one person.
  const code = String(b.code ?? "");
  if (!CODE.test(code)) return errorResponse("That link wasn't found.");
  const [raw] = await redis([["HGET", `${K}people`, code]]);
  const person = parse<Person>(raw);
  if (!person) return errorResponse("That link wasn't found.");

  if (action === "revoke") {
    await redis([
      ["HDEL", `${K}people`, code],
      ["DEL", `${K}seen:${code}`],
    ]);
    return json({ ok: true }, 200, noStore);
  }
  if (action === "reset") {
    await redis([["DEL", `${K}seen:${code}`]]);
    return json({ ok: true }, 200, noStore);
  }
  if (action === "assign") {
    const team = Number(b.team);
    if (team === 0) delete person.team;
    else if (isChallenge(team)) person.team = team;
    else return errorResponse("Pick a challenge.");
    if (b.role !== undefined) {
      const role = clean(b.role, 40);
      if (role) person.role = role;
      else delete person.role;
    }
    await redis([["HSET", `${K}people`, code, JSON.stringify(person)]]);
    return json({ ok: true }, 200, noStore);
  }

  return errorResponse("Unknown action.");
});
