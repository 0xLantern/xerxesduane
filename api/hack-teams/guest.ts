// A guest's page: GET /api/hack-teams/guest?c=<code>&d=<device>
//             and POST {c, d, action: "review" | "score", ...}
//
// Three kinds of guest, each made by a Champion on the panel:
//   - the security reviewer: every team's safety checklist and links, and a
//     verdict per team ("passed" or "fixes", with a note);
//   - a mentor: only the teams they were given, read-only: brief, teammates'
//     first names and roles, check-ins, links and one-pager;
//   - a judge: every team's one-pager, and a score on the four criteria.
// Same lock as a participant's link: two devices, revocable, and the owner can
// open any guest link to check it without using a slot or saving anything.
import { greetName } from "../../src/hackpartners/greet";
import { briefFor, safetyItems } from "./_briefs";
import {
  CHALLENGE_NS,
  CODE,
  EXPIRES_AT,
  K,
  MAX_DEVICES,
  PANEL,
  alertOwner,
  clean,
  esc,
  handle,
  isChallenge,
  isOwner,
  letDeviceIn,
  parse,
  redis,
  reply,
  sameOrigin,
  underLimit,
  type CheckIn,
  type Guest,
  type Person,
  type Safety,
  type Score,
  type Summary,
  type TeamLink,
} from "./_lib";

export const config = { runtime: "edge" };

const GONE = "This link has expired or was withdrawn. If you think that's a mistake, message Xerxes or Abel.";
const LOCKED = "This link is already open on two other devices, so it can't open here. Message Xerxes or Abel and they'll let this one in.";

async function admit(req: Request, c: string, d: string): Promise<{ guest: Guest; owner: boolean } | Response> {
  if (!CODE.test(c) || Date.now() > EXPIRES_AT) return reply({ error: GONE }, 404);
  const [raw] = await redis([["HGET", `${K}guests`, c]]);
  const guest = parse<Guest>(raw);
  if (!guest) return reply({ error: GONE }, 404);
  if (await isOwner(req)) return { guest, owner: true };
  const door = await letDeviceIn(req, `${K}gseen:${c}`, d, MAX_DEVICES);
  if (!door.ok) {
    if (req.method === "GET") {
      await alertOwner(`teams:glocked:${c}`, 12, `${guest.name}'s #HACK ${guest.kind} link was tried on another device`, `<p><strong>${esc(guest.name)}</strong>'s ${guest.kind} link was tried on a third device. It didn't open. Let the device in or revoke the link from /ht.</p>`, PANEL);
    }
    return reply({ error: LOCKED, locked: true }, 403);
  }
  if (door.first && guest.openedAt === null) {
    guest.openedAt = Date.now();
    await redis([["HSET", `${K}guests`, c, JSON.stringify(guest)]]);
  }
  return { guest, owner: false };
}

async function view(guest: Guest, owner: boolean) {
  const [all, published, rawScores] = await redis([
    ["HGETALL", `${K}people`],
    ["GET", `${K}published`],
    ["HGET", `${K}scores`, guest.code],
  ]);
  const base = { name: greetName(guest.name), kind: guest.kind, owner, expiresAt: EXPIRES_AT };
  if (published !== "1") return { ...base, teams: [] };

  const flat = Array.isArray(all) ? (all as string[]) : [];
  const people: Person[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const p = parse<Person>(flat[i + 1]);
    if (p?.team) people.push(p);
  }
  const placed = CHALLENGE_NS.filter((n) => people.some((p) => p.team === n));
  const mine = guest.kind === "mentor" && guest.teams.length ? placed.filter((n) => guest.teams.includes(n)) : placed;
  const extra = await redis(mine.flatMap((n) => [["GET", `${K}links:${n}`], ["GET", `${K}safety:${n}`], ["GET", `${K}summary:${n}`], ["LRANGE", `${K}checkins:${n}`, 0, 9]]));
  const myScores = parse<Record<string, Score>>(rawScores) ?? {};

  const teams = mine.map((n, i) => {
    const links = parse<TeamLink[]>(extra[i * 4]) ?? [];
    const safety = parse<Safety>(extra[i * 4 + 1]) ?? { ticks: {} };
    const summary = parse<Summary>(extra[i * 4 + 2]);
    const size = people.filter((p) => p.team === n).length;
    if (guest.kind === "security") {
      return { n, size, links, safety: { items: safetyItems(n), ticks: safety.ticks, review: safety.review ?? null } };
    }
    if (guest.kind === "judge") {
      return { n, size, summary, score: myScores[String(n)] ?? null };
    }
    const checkins = (Array.isArray(extra[i * 4 + 3]) ? (extra[i * 4 + 3] as unknown[]) : []).map((r) => parse<CheckIn>(r)).filter((x): x is CheckIn => !!x);
    const members = people.filter((p) => p.team === n).map((p) => ({ name: greetName(p.name), role: p.role ?? "" }));
    return { n, size, links, summary, checkins, members, brief: briefFor(n), review: safety.review ?? null };
  });
  return { ...base, teams };
}

export default handle(async (req) => {
  if (req.method === "GET") {
    if (!(await underLimit("hackt-gread", req, 30, 60))) return reply({ error: "Too many tries. Wait a minute." }, 429);
    const u = new URL(req.url);
    const got = await admit(req, u.searchParams.get("c") ?? "", u.searchParams.get("d") ?? "");
    if (got instanceof Response) return got;
    return reply(await view(got.guest, got.owner));
  }
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  if (!sameOrigin(req)) return reply({ error: "Blocked." }, 403);
  if (!(await underLimit("hackt-gwrite", req, 30, 60))) return reply({ error: "Too many tries. Wait a minute." }, 429);
  let b: Record<string, unknown> = {};
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty body */
  }
  const got = await admit(req, String(b.c ?? ""), String(b.d ?? ""));
  if (got instanceof Response) return got;
  const { guest, owner } = got;
  if (owner) return reply({ error: "This is a preview, so nothing was saved." }, 409);
  const n = Number(b.n);
  if (!isChallenge(n)) return reply({ error: "Pick a team." }, 400);

  if (b.action === "review" && guest.kind === "security") {
    const status = b.status === "passed" ? "passed" : b.status === "fixes" ? "fixes" : null;
    if (!status) return reply({ error: "Choose passed or needs fixes." }, 400);
    const note = clean(b.note, 800);
    if (status === "fixes" && !note) return reply({ error: "Say what needs fixing, so the team can act on it." }, 400);
    const [raw] = await redis([["GET", `${K}safety:${n}`]]);
    const safety = parse<Safety>(raw) ?? { ticks: {} };
    safety.review = { status, note, by: greetName(guest.name), at: Date.now() };
    await redis([["SET", `${K}safety:${n}`, JSON.stringify(safety)]]);
    return reply(await view(guest, false));
  }

  if (b.action === "score" && guest.kind === "judge") {
    const s = (Array.isArray(b.s) ? b.s : []).slice(0, 4).map((x) => Math.max(1, Math.min(5, Math.round(Number(x) || 0))));
    if (s.length !== 4) return reply({ error: "Score all four." }, 400);
    const [raw] = await redis([["HGET", `${K}scores`, guest.code]]);
    const scores = parse<Record<string, Score>>(raw) ?? {};
    scores[String(n)] = { s, note: clean(b.note, 400), at: Date.now() };
    await redis([["HSET", `${K}scores`, guest.code, JSON.stringify(scores)]]);
    return reply(await view(guest, false));
  }

  return reply({ error: "That isn't something this link can do." }, 403);
});
