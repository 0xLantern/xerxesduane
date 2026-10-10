// One participant's page: GET /api/hack-teams/me?c=<code>&d=<device>
//                     and POST {c, d, action: "prefs" | "checkin", ...}
//
// No login. The code finds the person; the device id is checked against the
// devices the code has already opened on (two at most, as on the partner
// page). A revoked or expired code is a 404, a third device a 403.
//
// Before the teams are announced, the page shows the challenge picker and
// POST "prefs" saves their choices. After, it shows their team: the brief
// (server only, _briefs.ts), teammates and roles, and the team's check-ins,
// and POST "checkin" adds one. The signed-in owner can open any link to
// check it, without using a device slot, and nothing they do is saved.
import { greetName } from "../../src/hackpartners/greet";
import { briefFor } from "./_briefs";
import {
  CODE,
  DEVICE_ID,
  EXPIRES_AT,
  HOURS,
  K,
  MAX_DEVICES,
  PANEL,
  SKILLS,
  alertOwner,
  clean,
  countryName,
  deviceHash,
  esc,
  handle,
  isChallenge,
  isOwner,
  parse,
  redis,
  reply,
  sameOrigin,
  underLimit,
  type CheckIn,
  type Hours,
  type Person,
  type Prefs,
  type Seen,
  type Skill,
  type Summary,
} from "./_lib";

export const config = { runtime: "edge" };

const GONE = "This link has expired or was withdrawn. If you think that's a mistake, message Xerxes or Abel.";
const LOCKED =
  "This link is already open on two other devices, so it can't open here. If this is your new phone or laptop, message Xerxes or Abel and they'll let it in.";

/** Finds the person and checks the device. Returns the person, or the response to send instead. */
async function admit(req: Request, c: string, d: string): Promise<{ person: Person; owner: boolean } | Response> {
  if (!CODE.test(c) || Date.now() > EXPIRES_AT) return reply({ error: GONE }, 404);
  const [rawPerson, rawSeen] = await redis([
    ["HGET", `${K}people`, c],
    ["GET", `${K}seen:${c}`],
  ]);
  const person = parse<Person>(rawPerson);
  if (!person) return reply({ error: GONE }, 404);
  if (await isOwner(req)) return { person, owner: true };

  if (!DEVICE_ID.test(d)) return reply({ error: LOCKED, locked: true }, 403);
  const h = await deviceHash(d);
  const seen: Seen = parse<Seen>(rawSeen) ?? { devices: [], countries: [] };
  if (seen.devices.some((x) => x.h === h)) return { person, owner: false };

  // Only a page view lets a new device in; a form post from an unknown device is refused.
  const country = req.headers.get("x-vercel-ip-country") ?? "";
  if (req.method !== "GET" || seen.devices.length >= MAX_DEVICES) {
    if (req.method === "GET") {
      await alertOwner(
        `teams:locked:${c}`,
        12,
        `${person.name}'s #HACK team link was tried on another device`,
        `<p>Someone tried to open <strong>${esc(person.name)}</strong>'s team page on a third device${country ? ` in ${esc(countryName(country))}` : ""}. It didn't open.</p><p>If it was them on a new phone or laptop, let the device in from /ht. If it wasn't, revoke their link.</p>`,
        PANEL,
      );
    }
    return reply({ error: LOCKED, locked: true }, 403);
  }
  seen.devices.push({ h, at: Date.now(), country });
  if (country && !seen.countries.includes(country)) seen.countries.push(country);
  if (person.openedAt === null) person.openedAt = Date.now();
  await redis([
    ["SET", `${K}seen:${c}`, JSON.stringify(seen)],
    ["HSET", `${K}people`, c, JSON.stringify(person)],
  ]);
  return { person, owner: false };
}

/** Everything the page needs, for this person only. */
async function view(person: Person, owner: boolean) {
  const [published] = await redis([["GET", `${K}published`]]);
  const announced = published === "1";
  const base = {
    name: greetName(person.name),
    owner,
    expiresAt: EXPIRES_AT,
    prefs: person.prefs ?? null,
    announced,
  };
  if (!announced || !person.team) return { ...base, team: null };

  const n = person.team;
  const [all, rawCheckins, rawSummary] = await redis([
    ["HGETALL", `${K}people`],
    ["LRANGE", `${K}checkins:${n}`, 0, 49],
    ["GET", `${K}summary:${n}`],
  ]);
  const flat = Array.isArray(all) ? (all as string[]) : [];
  const members: { name: string; role: string; you: boolean }[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const p = parse<Person>(flat[i + 1]);
    if (p && p.team === n) members.push({ name: greetName(p.name), role: p.role ?? "", you: p.code === person.code });
  }
  members.sort((a, b) => Number(b.you) - Number(a.you) || a.name.localeCompare(b.name));
  const checkins = (Array.isArray(rawCheckins) ? rawCheckins : []).map((r) => parse<CheckIn>(r)).filter((x): x is CheckIn => !!x);
  return { ...base, team: { n, role: person.role ?? "", members, brief: briefFor(n), checkins, summary: parse<Summary>(rawSummary) } };
}

export default handle(async (req) => {
  if (req.method === "GET") {
    // Thirty opens a minute from one address is far more than a person needs.
    if (!(await underLimit("hackt-read", req, 30, 60))) return reply({ error: "Too many tries. Wait a minute." }, 429);
    const u = new URL(req.url);
    const got = await admit(req, u.searchParams.get("c") ?? "", u.searchParams.get("d") ?? "");
    if (got instanceof Response) return got;
    return reply(await view(got.person, got.owner));
  }

  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  if (!sameOrigin(req)) return reply({ error: "Blocked." }, 403);
  if (!(await underLimit("hackt-write", req, 20, 60))) return reply({ error: "Too many tries. Wait a minute." }, 429);
  let b: Record<string, unknown> = {};
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty body */
  }
  const got = await admit(req, String(b.c ?? ""), String(b.d ?? ""));
  if (got instanceof Response) return got;
  const { person, owner } = got;
  // The owner checking a page shouldn't answer for anyone.
  if (owner) return reply({ error: "This is a preview, so nothing was saved." }, 409);

  const [published] = await redis([["GET", `${K}published`]]);
  const announced = published === "1";

  if (b.action === "prefs") {
    if (announced) return reply({ error: "The teams are announced, so choices are closed. Message Xerxes or Abel to change teams." }, 409);
    const first = Number(b.first);
    const second = b.second == null || b.second === "" ? null : Number(b.second);
    if (!isChallenge(first)) return reply({ error: "Pick your first choice." }, 400);
    if (second !== null && (!isChallenge(second) || second === first)) return reply({ error: "Pick a different second choice, or none." }, 400);
    const skills = (Array.isArray(b.skills) ? b.skills : []).filter((s): s is Skill => (SKILLS as readonly string[]).includes(String(s)));
    const hours = String(b.hours ?? "") as Hours;
    if (!HOURS.includes(hours)) return reply({ error: "Say how many hours a week you can give." }, 400);
    const dinner = b.dinner === "no" ? "no" : "yes";
    const prefs: Prefs = { first, second, skills: [...new Set(skills)], hours, dinner, note: clean(b.note, 400), at: Date.now() };
    person.prefs = prefs;
    await redis([["HSET", `${K}people`, person.code, JSON.stringify(person)]]);
    return reply(await view(person, false));
  }

  if (b.action === "checkin") {
    if (!announced || !person.team) return reply({ error: "Check-ins open once you're in a team." }, 409);
    const did = clean(b.did, 600);
    const next = clean(b.next, 600);
    const help = clean(b.help, 400);
    if (!did && !next) return reply({ error: "Say what your team did, or what's next." }, 400);
    const entry: CheckIn = { by: greetName(person.name), did, next, help, at: Date.now() };
    await redis([
      ["LPUSH", `${K}checkins:${person.team}`, JSON.stringify(entry)],
      ["LTRIM", `${K}checkins:${person.team}`, 0, 199],
    ]);
    if (help) {
      // Once per team per hour is plenty: the panel shows every request anyway.
      await alertOwner(
        `teams:help:${person.team}`,
        1,
        `A #HACK team asked for help (challenge ${String(person.team).padStart(2, "0")})`,
        `<p><strong>${esc(entry.by)}</strong> checked in for challenge ${String(person.team).padStart(2, "0")} and asked for help:</p><blockquote style="border-left:3px solid #EF4E25;margin:0;padding:4px 12px">${esc(help)}</blockquote>`,
        PANEL,
      );
    }
    return reply(await view(person, false));
  }

  if (b.action === "summary") {
    if (!announced || !person.team) return reply({ error: "The summary opens once you're in a team." }, 409);
    const summary: Summary = {
      built: clean(b.built, 700),
      helps: clean(b.helps, 500),
      works: clean(b.works, 500),
      next: clean(b.next, 500),
      public: clean(b.public, 200),
      by: greetName(person.name),
      at: Date.now(),
    };
    if (!summary.built) return reply({ error: "Say what your team built." }, 400);
    await redis([["SET", `${K}summary:${person.team}`, JSON.stringify(summary)]]);
    return reply(await view(person, false));
  }

  return reply({ error: "Unknown action." }, 400);
});
