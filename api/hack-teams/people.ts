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
//   POST {action:"email", code, email}          an address for the Wednesday reminder ("" clears it)
//   POST {action:"remind"}                      send the next check-in's reminders now
//   POST {action:"addGuest", name, kind, teams} a security reviewer, mentor or judge link
//   POST {action:"revokeGuest" | "resetGuest", code}
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
  EMAIL,
  GUEST_KINDS,
  type Guest,
  type GuestKind,
  type Safety,
  type Score,
  type TeamLink,
} from "./_lib";
import { safetyItems } from "./_briefs";
import { sendReminders } from "./_remind";

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
      ...CHALLENGE_NS.map((n) => ["GET", `${K}links:${n}`]),
      ...CHALLENGE_NS.map((n) => ["GET", `${K}safety:${n}`]),
      ["HGETALL", `${K}guests`],
      ["HGETALL", `${K}scores`],
    ]);
    const announced = extra[0] === "1";
    const show: Show = parse<Show>(extra[1]) ?? { order: [], ...SHOW_DEFAULT };
    const seen = extra.slice(2, 2 + people.length);
    const lists = extra.slice(2 + people.length, 2 + people.length + CHALLENGE_NS.length);
    const T = CHALLENGE_NS.length;
    const at = 2 + people.length + T;
    const summaries: Record<number, Summary | null> = {};
    const links: Record<number, TeamLink[]> = {};
    const safety: Record<number, { items: string[]; ticks: Safety["ticks"]; review: Safety["review"] | null }> = {};
    CHALLENGE_NS.forEach((n, i) => {
      summaries[n] = parse<Summary>(extra[at + i]);
      links[n] = parse<TeamLink[]>(extra[at + T + i]) ?? [];
      const s = parse<Safety>(extra[at + 2 * T + i]) ?? { ticks: {} };
      safety[n] = { items: safetyItems(n), ticks: s.ticks, review: s.review ?? null };
    });
    const pairs = (raw: unknown) => {
      const f = Array.isArray(raw) ? (raw as string[]) : [];
      const out: [string, string][] = [];
      for (let i = 0; i + 1 < f.length; i += 2) out.push([f[i], f[i + 1]]);
      return out;
    };
    const guestList = pairs(extra[at + 3 * T]).map(([, v]) => parse<Guest>(v)).filter((g): g is Guest => !!g);
    const gseen = guestList.length ? await redis(guestList.map((g) => ["GET", `${K}gseen:${g.code}`])) : [];
    const guests = guestList
      .map((g, i) => ({ ...g, link: `${ORIGIN}/ht/g/${g.code}`, devices: (parse<Seen>(gseen[i])?.devices ?? []).length }))
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
    const names = new Map(guestList.map((g) => [g.code, g.name]));
    const scores = pairs(extra[at + 3 * T + 1])
      .filter(([code]) => names.has(code))
      .map(([code, v]) => ({ judge: names.get(code)!, marks: parse<Record<string, Score>>(v) ?? {} }));
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
    return json({ people: rows, announced, checkins, summaries, show, links, safety, guests, scores, expiresAt: EXPIRES_AT, me }, 200, noStore);
  }

  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const b = await readJson(req);
  const action = String(b.action ?? "");

  if (action === "create") {
    const names = String(b.names ?? "")
      .split(/\r?\n/)
      .map((n) => n.replace(/\s+/g, " ").trim().slice(0, 260))
      .filter(Boolean)
      .slice(0, 60);
    if (!names.length) return errorResponse("Write at least one name, one per line.");
    const made = names.map((line): Person => {
      // "Maria Santos, maria@example.com" or "Maria Santos <maria@example.com>": the email is optional.
      const email = /[^\s,<>]+@[^\s,<>]+/.exec(line)?.[0] ?? "";
      const name = line.replace(email, "").replace(/[<>,]/g, " ").replace(/\s+/g, " ").trim() || line;
      const p: Person = { code: randomToken(18), name, createdAt: Date.now(), openedAt: null, by: me };
      if (EMAIL.test(email)) p.email = email.toLowerCase();
      return p;
    });
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

  if (action === "remind") {
    const r = await sendReminders(true);
    return json(r, 200, noStore);
  }

  if (action === "addGuest") {
    const name = clean(b.name, 60);
    const kind = String(b.kind ?? "") as GuestKind;
    if (!name || !GUEST_KINDS.includes(kind)) return errorResponse("Write a name and choose what they're for.");
    const teams = kind === "mentor" ? (Array.isArray(b.teams) ? b.teams : []).map(Number).filter(isChallenge) : [];
    if (kind === "mentor" && !teams.length) return errorResponse("Pick the team or teams this mentor helps.");
    const g: Guest = { code: randomToken(18), name, kind, teams, createdAt: Date.now(), openedAt: null, by: me };
    await redis([["HSET", `${K}guests`, g.code, JSON.stringify(g)]]);
    return json({ ok: true }, 200, noStore);
  }

  if (action === "revokeGuest" || action === "resetGuest") {
    const code = String(b.code ?? "");
    if (!CODE.test(code)) return errorResponse("That link wasn't found.");
    await redis(
      action === "revokeGuest"
        ? [
            ["HDEL", `${K}guests`, code],
            ["DEL", `${K}gseen:${code}`],
            ["HDEL", `${K}scores`, code],
          ]
        : [["DEL", `${K}gseen:${code}`]],
    );
    return json({ ok: true }, 200, noStore);
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
  if (action === "email") {
    const email = String(b.email ?? "").trim().toLowerCase();
    if (email && !EMAIL.test(email)) return errorResponse("That email address doesn't look right.");
    if (email) person.email = email;
    else delete person.email;
    await redis([["HSET", `${K}people`, code, JSON.stringify(person)]]);
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
