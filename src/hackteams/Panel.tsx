import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CHALLENGES } from "../data/hack";
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
  link: string;
  devices: number;
  countries: string[];
};
type CheckIn = { by: string; did: string; next: string; help: string; at: number };
type List = { people: Row[]; announced: boolean; checkins: Record<number, CheckIn[]>; expiresAt: number; me: string };

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
    const r = await call<{ made?: number; placed?: number }>("POST", body);
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
          Add participants, one name per line
          <textarea
            value={names}
            onChange={(e) => setNames(e.target.value)}
            rows={3}
            placeholder={"Maria Santos\nJohn Mathew"}
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
          <h2 className="font-display text-[1.2rem] font-bold text-white">Check-ins</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {CHALLENGES.filter((c) => people.some((p) => p.team === c.n)).map((c) => {
              const items = list.checkins[c.n] ?? [];
              return (
                <div key={c.n} className="rounded-2xl bg-white p-4 text-[#131313]">
                  <p className="font-display font-bold">
                    {two(c.n)} {c.title}
                  </p>
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

function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh" style={{ background: INK }}>
      <main className={`mx-auto px-5 py-10 ${wide ? "max-w-3xl" : "max-w-md"}`}>{children}</main>
    </div>
  );
}
