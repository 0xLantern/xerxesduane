import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CHALLENGES, CHECK_IN_GOALS, JUDGING } from "../data/hack";
import Showcase from "./Showcase";
import { greetName } from "../hackpartners/greet";
import type { Hours, Skill } from "./shared";
import { suggestTeams } from "./suggest";

/**
 * The Champions' panel for the team pages.
 *
 *   /ht                     the owner, signed in with the /letters login
 *   /ht/champion/<secret>   a co-Champion, with the same secret as their
 *                           partner panel (/hp/team/<secret>)
 *
 * Everyone sees everyone here: forming teams is shared work.
 */

type Prefs = { first: number; second: number | null; skills: Skill[]; hours: Hours; dinner: "yes" | "no"; note: string; at: number };
type Row = {
  code: string;
  name: string;
  createdAt: number;
  openedAt: number | null;
  by: string;
  prefs?: Prefs;
  team?: number;
  role?: string;
  email?: string;
  link: string;
  devices: number;
  countries: string[];
};
type CheckIn = { by: string; did: string; next: string; help: string; at: number };
type Summary = { built: string; helps: string; works: string; next: string; public: string; by: string; at: number };
type Show = { order: number[]; present: number; qa: number; start: string };
type TeamLink = { id: string; label: string; url: string; by: string; at: number };
type Review = { status: "passed" | "fixes"; note: string; by: string; at: number };
type GuestRow = { code: string; name: string; kind: "security" | "mentor" | "judge"; teams: number[]; openedAt: number | null; link: string; devices: number };
type List = {
  people: Row[];
  announced: boolean;
  checkins: Record<number, CheckIn[]>;
  summaries: Record<number, Summary | null>;
  show: Show;
  links: Record<number, TeamLink[]>;
  safety: Record<number, { items: string[]; ticks: Record<string, { by: string; at: number }>; review: Review | null }>;
  guests: GuestRow[];
  scores: { judge: string; marks: Record<string, { s: number[]; note: string; at: number }> }[];
  expiresAt: number;
  me: string;
};

const INK = "#131313";
const Y = "#EFE974";
const two = (n: number) => String(n).padStart(2, "0");
const title = (n: number) => CHALLENGES.find((c) => c.n === n)?.title ?? `Challenge ${n}`;
const when = (t: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dubai" }).format(new Date(t));
const btn = "rounded-full px-3 py-1.5 text-[0.8rem] font-semibold transition hover:-translate-y-0.5 disabled:opacity-50";

/** The usual team size per challenge, from the briefs: four for the kit, more for the apps. */
const SIZE: Record<number, string> = { 1: "4", 2: "4", 3: "4", 4: "7–9", 5: "7–9", 6: "7–9", 7: "6–8" };

/**
 * What goes to a participant. Before the teams: pick your challenges. After:
 * your team is ready. Neither says what the challenges are about, in case the
 * chat is ever seen: the page explains everything.
 */
const message = (r: Row, announced: boolean, from: string) =>
  (announced
    ? [
        `Hi ${greetName(r.name)}! 🎉 Your team is ready.`,
        "",
        "Your private page now has your team, your full challenge brief, the dates and your weekly check-in:",
        r.link,
        "",
        "Same link as before, so please keep it to yourself. See you at the first check-in!",
        from,
      ]
    : [
        `Hi ${greetName(r.name)}! 😊 Here's your private page for the dinner on Saturday 17 October:`,
        r.link,
        "",
        "Pick the two challenges you'd most like to work on and tell us what you bring, so we can suggest teams before the evening. It takes two minutes, and you can change it until Saturday.",
        "",
        "It opens only for you, so please don't forward it. See you Saturday!",
        from,
      ]
  ).join("\n");

export type { List as PanelList };

export default function Panel({ champion }: { champion?: string }) {
  const [state, setState] = useState<"loading" | "login" | "off" | "error" | "ready">("loading");
  const [list, setList] = useState<List | null>(null);
  const [names, setNames] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"all" | "unanswered" | "unplaced">("all");

  const call = useCallback(
    async <T,>(method: "GET" | "POST", body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> => {
      const headers: Record<string, string> = {};
      if (body) headers["content-type"] = "application/json";
      if (champion) headers["x-hp-champion"] = champion;
      const res = await fetch("/api/hack-teams/people", { method, credentials: "same-origin", cache: "no-store", headers, body: body ? JSON.stringify(body) : undefined });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string };
      return { ok: res.ok, status: res.status, data };
    },
    [champion],
  );

  const load = useCallback(async () => {
    const r = await call<List>("GET");
    if (r.status === 401) {
      if (champion) setNote(r.data.error ?? "This panel link isn't valid any more.");
      return setState(champion ? "error" : "login");
    }
    if (r.status === 503) return setState("off");
    if (!r.ok) {
      setNote(r.data.error ?? "Couldn't load. Reload to try again.");
      return setState("error");
    }
    setList(r.data);
    setState("ready");
  }, [call, champion]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only load
    load();
  }, [load]);

  const act = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    setNote("");
    const r = await call<{ made?: number; placed?: number; sent?: number; skipped?: string; date?: string }>("POST", body);
    if (r.ok && body.action === "remind") {
      setBusy(false);
      return setNote(r.data.skipped ? `Nothing sent: ${r.data.skipped}` : `Sent ${r.data.sent} reminder${r.data.sent === 1 ? "" : "s"} for the ${r.data.date} check-in.`);
    }
    setBusy(false);
    if (!r.ok) return setNote(r.data.error ?? "That didn't work. Try again.");
    setNote(done.replace("{n}", String(r.data.made ?? r.data.placed ?? "")));
    await load();
  };

  if (state === "loading") return <Shell><p className="text-white/70">Loading…</p></Shell>;
  if (state === "error") return <Shell><p className="text-white/80">{note}</p></Shell>;
  if (state === "off") return <Shell><p className="text-white/80">The owner login isn't set up on this site yet.</p></Shell>;
  if (state === "login")
    return (
      <Shell>
        <h1 className="font-display text-[1.4rem] font-bold text-white">Team pages</h1>
        <p className="mt-2 text-white/75">
          Sign in on{" "}
          <a href="/letters" className="underline" style={{ color: Y }}>
            the letters desk
          </a>{" "}
          with your owner login, then come back here.
        </p>
        <p className="mt-6 text-[0.85rem] text-white/50">If you were sent a personal link, open that link instead. This address shows nothing on its own.</p>
      </Shell>
    );
  if (!list) return null;

  const owner = !champion;
  const from = list.me;
  const people = list.people;
  const answered = people.filter((p) => p.prefs);
  const placed = people.filter((p) => p.team);
  const shown = people.filter((p) => (filter === "unanswered" ? !p.prefs : filter === "unplaced" ? !p.team : true));

  const suggest = () => {
    if (!answered.length) return setNote("Nobody has picked their challenges yet.");
    if (placed.length && !window.confirm("This sets a team for everyone who has answered, replacing the teams already set for them. Continue?")) return;
    const draft = suggestTeams(answered);
    act({ action: "assignMany", assignments: [...draft].map(([code, team]) => ({ code, team })) }, "Suggested teams set for {n} people. Adjust anyone below, then announce.");
  };

  return (
    <Shell wide>
      <h1 className="font-display text-[1.5rem] font-bold text-white">#HACK2026 Dubai team pages{owner ? "" : ` · ${from}`}</h1>
      <p className="mt-1 text-[0.9rem] text-white/70">
        One private link per participant. Before the teams are announced it asks for their top two challenges; after, it becomes their team page with the full brief and
        weekly check-ins. Each link opens on up to two devices and stops working after{" "}
        {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Dubai" }).format(new Date(list.expiresAt))}.
      </p>
      {!owner && (
        <p className="mt-2 rounded-xl border border-white/15 px-3 py-2 text-[0.8rem] text-white/60">
          🔒 This panel is just for you. Keep its address private: anyone who has it can manage every participant.
        </p>
      )}

      {/* Add people */}
      <form
        className="mt-5 rounded-2xl border border-white/15 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (names.trim()) act({ action: "create", names }, "{n} links made. Send each one below.").then(() => setNames(""));
        }}
      >
        <label className="block text-[0.9rem] font-semibold text-white">
          Add participants, one per line
          <span className="mt-0.5 block text-[0.78rem] font-normal text-white/55">Add an email after a comma if you have it: that's where the Wednesday check-in reminder goes.</span>
          <textarea
            value={names}
            onChange={(e) => setNames(e.target.value)}
            rows={3}
            placeholder={"Maria Santos, maria@example.com\nJohn Mathew"}
            className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 font-normal text-white placeholder:text-white/40 focus:outline-none focus:ring-2"
          />
        </label>
        <button type="submit" disabled={busy || !names.trim()} className={`${btn} mt-2`} style={{ background: Y, color: INK }}>
          Make links
        </button>
      </form>

      {/* Announce */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: list.announced ? Y : "#2a2a2a", color: list.announced ? INK : "#fff" }}>
        <div>
          <p className="font-display text-[1.05rem] font-bold">{list.announced ? "Teams are announced" : "Teams are hidden"}</p>
          <p className="text-[0.82rem] opacity-75">
            {list.announced
              ? "Everyone placed sees their team, brief and check-ins. Choices are closed."
              : `${answered.length} of ${people.length} have picked. ${placed.length} placed so far. Participants see only the picker.`}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          className={btn}
          style={{ background: list.announced ? INK : Y, color: list.announced ? "#fff" : INK }}
          onClick={() => {
            const on = !list.announced;
            const unplaced = people.length - placed.length;
            if (on && !window.confirm(`Announce the teams? Everyone placed will see their team and brief straight away.${unplaced ? ` ${unplaced} people aren't placed yet.` : ""}`)) return;
            if (!on && !window.confirm("Hide the teams again? Everyone goes back to the picker, and check-ins pause.")) return;
            act({ action: "announce", on }, on ? "Teams announced. Send everyone the \"your team is ready\" message." : "Teams hidden.");
          }}
        >
          {list.announced ? "Hide teams" : "Announce teams"}
        </button>
      </div>

      {/* Demand */}
      <div className="mt-4 overflow-x-auto rounded-2xl bg-white p-4 text-[#131313]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[1.1rem] font-bold">Who wants what</h2>
          <button type="button" disabled={busy || list.announced} className={btn} style={{ background: INK, color: "#fff" }} onClick={suggest}>
            Suggest teams
          </button>
        </div>
        <table className="mt-3 w-full text-left text-[0.85rem]">
          <thead className="text-[0.72rem] uppercase tracking-wide text-[#8a7f75]">
            <tr>
              <th className="py-1 pe-2">Challenge</th>
              <th className="px-2">1st</th>
              <th className="px-2">2nd</th>
              <th className="px-2">Placed</th>
              <th className="ps-2">Usual size</th>
            </tr>
          </thead>
          <tbody>
            {CHALLENGES.map((c) => {
              const n1 = answered.filter((p) => p.prefs!.first === c.n).length;
              const n2 = answered.filter((p) => p.prefs!.second === c.n).length;
              const np = people.filter((p) => p.team === c.n).length;
              return (
                <tr key={c.n} className="border-t border-[#eee]">
                  <td className="py-1.5 pe-2 font-semibold">
                    {two(c.n)} {c.title}
                  </td>
                  <td className="px-2">{n1 || "·"}</td>
                  <td className="px-2">{n2 || "·"}</td>
                  <td className="px-2 font-bold">{np || "·"}</td>
                  <td className="ps-2 text-[#6a6a6a]">{SIZE[c.n]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-[0.75rem] text-[#6a6a6a]">
          "Suggest teams" puts everyone in their first choice, then moves people from teams smaller than three to their second choice. It's a draft: adjust below.
        </p>
      </div>

      {note && (
        <p className="mt-3 text-[0.88rem]" style={{ color: Y }} aria-live="polite">
          {note}
        </p>
      )}

      {/* People */}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-[0.8rem]">
        <span className="text-white/60">Show:</span>
        {(
          [
            ["all", `Everyone (${people.length})`],
            ["unanswered", `Not picked yet (${people.length - answered.length})`],
            ["unplaced", `Not placed (${people.length - placed.length})`],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" className={`${btn} border`} style={filter === k ? { background: "#fff", color: INK, borderColor: "#fff" } : { color: "#fff", borderColor: "rgba(255,255,255,.3)" }} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {people.length === 0 && <li className="text-white/60">No participants yet. Add them above.</li>}
        {shown.map((r) => (
          <Person key={r.code} r={r} list={list} owner={owner} busy={busy} from={from} act={act} setNote={setNote} />
        ))}
      </ul>

      {/* Check-ins */}
      {list.announced && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[1.2rem] font-bold text-white">Check-ins</h2>
            <button
              type="button"
              disabled={busy}
              className={btn}
              style={{ background: Y, color: INK }}
              onClick={() =>
                window.confirm(`Email the next check-in reminder now to the ${people.filter((p) => p.team && p.email).length} placed participants with an email address? (It also goes out by itself on Wednesday evenings.)`) &&
                act({ action: "remind" }, "Reminders: {n}")
              }
            >
              Send reminders now
            </button>
          </div>
          <p className="mt-1 text-[0.78rem] text-white/50">
            Every Wednesday at 6pm, each placed participant with an email gets their own link and whether their team has checked in. {people.filter((p) => p.team && !p.email).length} placed
            people have no email yet.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {CHALLENGES.filter((c) => people.some((p) => p.team === c.n)).map((c) => {
              const items = list.checkins[c.n] ?? [];
              return (
                <div key={c.n} className="rounded-2xl bg-white p-4 text-[#131313]">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-display font-bold">
                      {two(c.n)} {c.title}
                    </p>
                    <WeekBadge latest={items[0]?.at ?? 0} />
                  </div>
                  {(list.links[c.n] ?? []).length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {list.links[c.n].map((l) => (
                        <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#ddd] px-2 py-0.5 text-[0.75rem] font-semibold hover:border-[#131313]">
                          {l.label} ↗
                        </a>
                      ))}
                    </p>
                  )}
                  {items.length === 0 && <p className="mt-1 text-[0.82rem] text-[#8a7f75]">No check-ins yet.</p>}
                  <ul className="mt-2 space-y-2">
                    {items.slice(0, 5).map((k) => (
                      <li key={k.at} className="text-[0.82rem] leading-snug">
                        <p className="font-bold text-[#8a7f75]">
                          {k.by} · {when(k.at)}
                        </p>
                        {k.did && <p>Done: {k.did}</p>}
                        {k.next && <p>Next: {k.next}</p>}
                        {k.help && (
                          <p className="mt-0.5 rounded-lg px-2 py-1 font-semibold" style={{ background: "#fde4dc", color: "#7a2410" }}>
                            Help: {k.help}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {list.announced && <SafetyOverview list={list} />}
      <Guests list={list} owner={owner} busy={busy} from={from} act={act} setNote={setNote} />
      {list.announced && list.scores.length > 0 && <Results list={list} />}

      {/* Keyed so a saved running order or a newly placed team resets the draft. */}
      {list.announced && <Showcase key={JSON.stringify(list.show) + [...new Set(placed.map((p) => p.team))].sort().join()} list={list} owner={owner} busy={busy} act={act} setNote={setNote} />}

      <p className="mt-6 text-[0.8rem] text-white/45">
        {owner
          ? "Previewing while signed in doesn't use a device slot, and nothing you do on a preview is saved."
          : "Don't open a participant's link yourself: it would use one of their two device slots."}
      </p>
    </Shell>
  );
}

function Person({
  r,
  list,
  owner,
  busy,
  from,
  act,
  setNote,
}: {
  r: Row;
  list: List;
  owner: boolean;
  busy: boolean;
  from: string;
  act: (body: Record<string, unknown>, done: string) => Promise<void>;
  setNote: (s: string) => void;
}) {
  const [role, setRole] = useState(r.role ?? "");
  const [email, setEmail] = useState(r.email ?? "");
  const p = r.prefs;
  const msg = message(r, list.announced, from);
  return (
    <li className="rounded-2xl bg-white p-4 text-[#131313]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[1.05rem] font-bold">
          {r.name}
          {r.by !== "Xerxes" && <span className="ml-2 text-[0.75rem] font-semibold text-[#9A3412]">added by {r.by}</span>}
        </p>
        <p className="text-[0.78rem] text-[#6a6a6a]">
          {r.openedAt ? `Opened ${when(r.openedAt)}` : "Not opened yet"} · {r.devices} of 2 devices
        </p>
      </div>

      {p ? (
        <div className="mt-2 text-[0.85rem] leading-snug">
          <p>
            <strong>1st:</strong> {two(p.first)} {title(p.first)}
            {p.second && (
              <>
                {" "}
                · <strong>2nd:</strong> {two(p.second)} {title(p.second)}
              </>
            )}
          </p>
          <p className="mt-0.5 text-[#555]">
            {p.skills.length ? p.skills.join(", ") : "No skills ticked"} · {p.hours} hrs/week ·{" "}
            <span style={p.dinner === "no" ? { color: "#b91c1c", fontWeight: 700 } : undefined}>{p.dinner === "yes" ? "at the dinner" : "can't make the dinner"}</span>
          </p>
          {p.note && <p className="mt-0.5 italic text-[#555]">"{p.note}"</p>}
        </div>
      ) : (
        <p className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold" style={{ background: "#fee2e2", color: "#7f1d1d" }}>
          Hasn't picked yet
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={r.team ?? 0}
          disabled={busy}
          onChange={(e) => act({ action: "assign", code: r.code, team: Number(e.target.value) }, `${r.name} placed.`)}
          className="rounded-full border border-[#ccc] px-3 py-1.5 text-[0.82rem] font-semibold"
          aria-label={`Team for ${r.name}`}
        >
          <option value={0}>No team yet</option>
          {CHALLENGES.map((c) => (
            <option key={c.n} value={c.n}>
              {two(c.n)} {c.title}
            </option>
          ))}
        </select>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onBlur={() => role !== (r.role ?? "") && r.team && act({ action: "assign", code: r.code, team: r.team, role }, `${r.name}'s role saved.`)}
          placeholder={r.team ? "Role, e.g. Developer" : "Place them first"}
          disabled={!r.team || busy}
          maxLength={40}
          className="min-w-0 flex-1 rounded-full border border-[#ccc] px-3 py-1.5 text-[0.82rem]"
          aria-label={`Role for ${r.name}`}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email.trim() !== (r.email ?? "") && act({ action: "email", code: r.code, email: email.trim() }, `${r.name}'s email saved.`)}
          placeholder="Email for reminders"
          type="email"
          disabled={busy}
          className="min-w-0 flex-1 rounded-full border border-[#ccc] px-3 py-1.5 text-[0.82rem]"
          aria-label={`Email for ${r.name}`}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className={btn} style={{ background: "#1FA855", color: "#fff" }}>
          {list.announced ? "Send \"your team is ready\"" : "Send on WhatsApp"}
        </a>
        <button type="button" className={`${btn} border border-[#ccc]`} onClick={() => navigator.clipboard?.writeText(msg).then(() => setNote(`Message for ${r.name} copied.`))}>
          Copy message
        </button>
        {owner && (
          <a href={r.link} target="_blank" rel="noopener noreferrer" className={`${btn} border border-[#ccc]`}>
            Preview
          </a>
        )}
        <button type="button" className={`${btn} border border-[#ccc]`} disabled={busy || r.devices === 0} onClick={() => act({ action: "reset", code: r.code }, `${r.name} can open the link on a new device now.`)}>
          Let a new device in
        </button>
        <button
          type="button"
          className={`${btn} border border-red-300 text-red-700`}
          disabled={busy}
          onClick={() => window.confirm(`Revoke ${r.name}'s link? It stops working at once, on every device.`) && act({ action: "revoke", code: r.code }, `${r.name}'s link is revoked.`)}
        >
          Revoke
        </button>
      </div>
    </li>
  );
}

type Act = (body: Record<string, unknown>, done: string) => Promise<void>;

/**
 * Has this team checked in since the last weekly call (or since the dinner,
 * before the first one)? Worked out once per page view, in Dubai time.
 */
function WeekBadge({ latest }: { latest: number }) {
  const [now] = useState(() => Date.now());
  const calls = Object.keys(CHECK_IN_GOALS).map((d) => Date.parse(`${d}T20:30:00+04:00`));
  const since = Math.max(Date.parse("2026-10-17T21:00:00+04:00"), ...calls.filter((t) => t <= now));
  const ok = latest > since;
  return (
    <span className="rounded-full px-2 py-0.5 text-[0.72rem] font-bold" style={ok ? { background: "#dcfce7", color: "#14532d" } : { background: "#fee2e2", color: "#7f1d1d" }}>
      {ok ? "Checked in this week" : "No check-in this week"}
    </span>
  );
}

/** Every team's safety checklist at a glance, and the reviewer's verdicts. */
function SafetyOverview({ list }: { list: List }) {
  const teams = CHALLENGES.filter((c) => list.people.some((p) => p.team === c.n));
  return (
    <div className="mt-8 rounded-2xl bg-white p-4 text-[#131313]">
      <h2 className="font-display text-[1.1rem] font-bold">Safety check, due 5 November</h2>
      <table className="mt-2 w-full text-left text-[0.85rem]">
        <tbody>
          {teams.map((c) => {
            const s = list.safety[c.n];
            const done = s ? s.items.filter((_, i) => s.ticks[String(i)]).length : 0;
            const r = s?.review;
            return (
              <tr key={c.n} className="border-t border-[#eee]">
                <td className="py-1.5 pe-2 font-semibold">
                  {two(c.n)} {c.title}
                </td>
                <td className="px-2 tabular-nums">
                  {done}/{s?.items.length ?? 0} ticked
                </td>
                <td className="ps-2">
                  {r ? (
                    <span className="rounded-full px-2 py-0.5 text-[0.72rem] font-bold" style={r.status === "passed" ? { background: "#dcfce7", color: "#14532d" } : { background: "#fde4dc", color: "#7a2410" }}>
                      {r.status === "passed" ? "Passed" : "Needs fixes"}
                    </span>
                  ) : (
                    <span className="text-[0.75rem] text-[#8a7f75]">Not reviewed</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!list.guests.some((g) => g.kind === "security") && <p className="mt-2 text-[0.78rem] font-semibold text-[#9A3412]">No security reviewer yet: add one under "Reviewer, mentors and judges".</p>}
    </div>
  );
}

const GUEST_LABEL: Record<GuestRow["kind"], string> = { security: "Security reviewer", mentor: "Mentor", judge: "Judge" };

/** What goes to a guest. Like the participants' message, it doesn't say what the work is. */
const guestMessage = (g: GuestRow, from: string) =>
  [
    `Hi ${greetName(g.name)}! 😊`,
    "",
    g.kind === "security"
      ? "Thank you for reviewing the teams' projects for safety. Here's your private page with each team's checklist and links. Reviews are due by 5 November:"
      : g.kind === "mentor"
        ? "Thank you for mentoring. Here's your private page for your team: their brief, their weekly check-ins and the links they're working from:"
        : "Thank you for judging on 21 November. Here's your private scoring page. Please open it on your phone before the night:",
    g.link,
    "",
    "It opens only for you, so please don't forward it.",
    from,
  ].join("\n");

/** The security reviewer, mentors and judges: one private link each. */
function Guests({ list, owner, busy, from, act, setNote }: { list: List; owner: boolean; busy: boolean; from: string; act: Act; setNote: (s: string) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GuestRow["kind"]>("mentor");
  const [teams, setTeams] = useState<number[]>([]);
  return (
    <div className="mt-8">
      <h2 className="font-display text-[1.2rem] font-bold text-white">Reviewer, mentors and judges</h2>
      <p className="mt-1 text-[0.8rem] text-white/55">
        The security reviewer sees every team's checklist and marks it passed or needing fixes. A mentor sees only their teams: brief, check-ins and links. A judge scores every team
        on the four criteria. None of them sees a phone number or an email.
      </p>
      <form
        className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          // Cleared straight away, so typing the next name never races the reload.
          setName("");
          setTeams([]);
          act({ action: "addGuest", name, kind, teams }, `Link made for ${name}. Send it below.`);
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={60} className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white placeholder:text-white/40" />
        <select value={kind} onChange={(e) => setKind(e.target.value as GuestRow["kind"])} className="rounded-full px-3 py-2 text-[0.85rem] text-[#131313]">
          <option value="security">Security reviewer</option>
          <option value="mentor">Mentor</option>
          <option value="judge">Judge</option>
        </select>
        {kind === "mentor" && (
          <div className="flex basis-full flex-wrap gap-1.5">
            {CHALLENGES.map((c) => {
              const on = teams.includes(c.n);
              return (
                <button
                  key={c.n}
                  type="button"
                  onClick={() => setTeams(on ? teams.filter((x) => x !== c.n) : [...teams, c.n])}
                  className="rounded-full border px-2.5 py-1 text-[0.75rem] font-semibold"
                  style={on ? { background: Y, color: INK, borderColor: Y } : { color: "#fff", borderColor: "rgba(255,255,255,.3)" }}
                  aria-pressed={on}
                >
                  {two(c.n)} {c.title}
                </button>
              );
            })}
          </div>
        )}
        <button type="submit" disabled={busy || !name.trim() || (kind === "mentor" && !teams.length)} className={btn} style={{ background: Y, color: INK }}>
          Make a link
        </button>
      </form>
      <ul className="mt-3 space-y-2">
        {list.guests.map((g) => {
          const msg = guestMessage(g, from);
          return (
            <li key={g.code} className="rounded-2xl bg-white p-3 text-[#131313]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {g.name} <span className="text-[0.78rem] font-bold text-[#9A3412]">{GUEST_LABEL[g.kind]}</span>
                  {g.kind === "mentor" && <span className="text-[0.75rem] text-[#6a6a6a]"> · {g.teams.map((n) => title(n)).join(", ")}</span>}
                </p>
                <p className="text-[0.75rem] text-[#6a6a6a]">{g.openedAt ? `Opened ${when(g.openedAt)}` : "Not opened yet"} · {g.devices} of 2 devices</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className={btn} style={{ background: "#1FA855", color: "#fff" }}>
                  Send on WhatsApp
                </a>
                <button type="button" className={`${btn} border border-[#ccc]`} onClick={() => navigator.clipboard?.writeText(msg).then(() => setNote(`Message for ${g.name} copied.`))}>
                  Copy message
                </button>
                {owner && (
                  <a href={g.link} target="_blank" rel="noopener noreferrer" className={`${btn} border border-[#ccc]`}>
                    Preview
                  </a>
                )}
                <button type="button" className={`${btn} border border-[#ccc]`} disabled={busy || g.devices === 0} onClick={() => act({ action: "resetGuest", code: g.code }, `${g.name} can open the link on a new device now.`)}>
                  Let a new device in
                </button>
                <button
                  type="button"
                  className={`${btn} border border-red-300 text-red-700`}
                  disabled={busy}
                  onClick={() => window.confirm(`Revoke ${g.name}'s link?${g.kind === "judge" ? " Their scores are removed too." : ""}`) && act({ action: "revokeGuest", code: g.code }, `${g.name}'s link is revoked.`)}
                >
                  Revoke
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The judges' scores, added up: the average on each criterion, best total first. */
function Results({ list }: { list: List }) {
  const teams = CHALLENGES.filter((c) => list.people.some((p) => p.team === c.n))
    .map((c) => {
      const marks = list.scores.map((j) => ({ judge: j.judge, m: j.marks[String(c.n)] })).filter((x) => x.m);
      const avg = JUDGING.criteria.map((_, i) => (marks.length ? marks.reduce((s, x) => s + x.m.s[i], 0) / marks.length : 0));
      return { c, marks, avg, total: avg.reduce((a, b) => a + b, 0) };
    })
    .sort((a, b) => b.total - a.total);
  const f = (n: number) => (n ? n.toFixed(1) : "·");
  return (
    <div className="mt-8 overflow-x-auto rounded-2xl bg-white p-4 text-[#131313]">
      <h2 className="font-display text-[1.1rem] font-bold">Judges' scores</h2>
      <p className="mt-1 text-[0.75rem] text-[#6a6a6a]">Averages out of 5 per question, and the total out of 20. Only you and the Champions see this.</p>
      <table className="mt-2 w-full text-left text-[0.82rem]">
        <thead className="text-[0.68rem] uppercase tracking-wide text-[#8a7f75]">
          <tr>
            <th className="py-1 pe-2">Team</th>
            {JUDGING.criteria.map((q) => (
              <th key={q} className="px-1.5 font-semibold normal-case">
                {q.replace(/\?$/, "")}
              </th>
            ))}
            <th className="px-1.5">Total</th>
            <th className="ps-1.5">Judges</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(({ c, marks, avg, total }) => (
            <tr key={c.n} className="border-t border-[#eee] align-top">
              <td className="py-1.5 pe-2 font-semibold">
                {c.title}
                {marks
                  .filter((x) => x.m.note)
                  .map((x) => (
                    <span key={x.judge} className="mt-0.5 block text-[0.75rem] font-normal italic text-[#555]">
                      {x.judge}: "{x.m.note}"
                    </span>
                  ))}
              </td>
              {avg.map((a, i) => (
                <td key={i} className="px-1.5 tabular-nums">
                  {f(a)}
                </td>
              ))}
              <td className="px-1.5 font-bold tabular-nums">{f(total)}</td>
              <td className="ps-1.5 tabular-nums">{marks.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh" style={{ background: INK }}>
      <main className={`mx-auto px-5 py-10 ${wide ? "max-w-3xl" : "max-w-md"}`}>{children}</main>
    </div>
  );
}
