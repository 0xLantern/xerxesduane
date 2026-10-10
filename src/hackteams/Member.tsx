import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CHALLENGES, CHAMPION_CONTACTS, CHECK_IN_GOALS, EVENTS, GROUND_RULES, JUDGING, TRACKS } from "../data/hack";
import { HOURS, SKILLS, type Hours, type Skill } from "./shared";
import ThankYouCard from "./ThankYouCard";
import { deviceId, watermark } from "./device";

/**
 * One participant's private page, /ht/<code>.
 *
 * Before the teams are announced: pick a first and second challenge, say what
 * you bring, and whether you'll be at the dinner. After: your team page, with
 * the full brief, teammates and roles, the dates and the weekly check-in.
 *
 * The challenge summaries come from the public data (src/data/hack.ts); the
 * full brief comes only from /api/hack-teams/me, for this team's members on a
 * device the link has let in. Nothing is stored here but a random device id.
 */

type Prefs = { first: number; second: number | null; skills: Skill[]; hours: Hours; dinner: "yes" | "no"; note: string; at: number };
type CheckIn = { by: string; did: string; next: string; help: string; at: number };
type Summary = { built: string; helps: string; works: string; next: string; public: string; by: string; at: number };
type TeamLink = { id: string; label: string; url: string; by: string; at: number };
type SafetyView = {
  items: string[];
  ticks: Record<string, { by: string; at: number }>;
  review: { status: "passed" | "fixes"; note: string; by: string; at: number } | null;
};
type Brief = {
  n: number;
  title: string;
  strap: string;
  challenge: string;
  callout: { title: string; body: string };
  build: string;
  parts: { name: string; what: string }[];
  whoGets: { who: string; items: string[] }[];
  rules: { rule: string; detail: string }[];
  exists?: string;
  team: string[];
  by21: string[];
  measured?: string[];
  demo?: string[];
  notes: string[];
};
type Payload = {
  name: string;
  owner: boolean;
  expiresAt: number;
  prefs: Prefs | null;
  announced: boolean;
  team: null | {
    n: number;
    role: string;
    members: { name: string; role: string; you: boolean }[];
    brief: Brief | null;
    checkins: CheckIn[];
    summary: Summary | null;
    links: TeamLink[];
    safety: SafetyView;
  };
};

const INK = "#131313";
const Y = "#EFE974";
const O = "#EF4E25";
const two = (n: number) => String(n).padStart(2, "0");
const challenge = (n: number) => CHALLENGES.find((c) => c.n === n);
const when = (t: number) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dubai" }).format(new Date(t));

export default function Member({ code }: { code: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hack-teams/me?c=${encodeURIComponent(code)}&d=${encodeURIComponent(deviceId())}`, { cache: "no-store", credentials: "same-origin" });
      const body = (await res.json().catch(() => ({}))) as Payload & { error?: string };
      if (!res.ok) return setError(body.error ?? "This link didn't open. Message Xerxes or Abel.");
      setData(body);
      document.title = body.team ? `Your team · ${challenge(body.team.n)?.title ?? ""}` : "Your challenges";
    } catch {
      setError("Couldn't reach the page. Check your connection and reload.");
    }
  }, [code]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only load
    load();
  }, [load]);

  /** Saves a form; the server answers with the whole updated page. */
  const post = async (body: Record<string, unknown>): Promise<string | null> => {
    try {
      const res = await fetch("/api/hack-teams/me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ c: code, d: deviceId(), ...body }),
      });
      const out = (await res.json().catch(() => ({}))) as Payload & { error?: string };
      if (!res.ok) return out.error ?? "That didn't save. Try again.";
      setData(out);
      return null;
    } catch {
      return "That didn't save. Check your connection and try again.";
    }
  };

  if (error)
    return (
      <Frame>
        <div className="rounded-3xl bg-white p-6 text-[#131313]">
          <p className="font-display text-[1.2rem] font-bold">This page didn't open</p>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-[#444]">{error}</p>
        </div>
      </Frame>
    );
  if (!data) return <Frame><p className="text-white/70">Opening your page…</p></Frame>;

  return (
    <Frame name={data.name}>
      {data.owner && (
        <p className="mb-3 rounded-xl px-4 py-2 text-[0.85rem] font-semibold" style={{ background: Y, color: INK }}>
          Preview: you're signed in as the owner. Nothing here is saved, and no device slot is used.
        </p>
      )}
      <header className="mb-5 text-white">
        <p className="font-technical text-[0.72rem] font-bold uppercase tracking-[0.18em]" style={{ color: Y }}>
          #HACK2026 · Dubai · Private to you
        </p>
        <h1 className="mt-2 font-display text-[1.9rem] font-extrabold leading-tight">
          {data.team ? `Welcome to your team, ${data.name}` : `Hi ${data.name}, pick your challenges`}
        </h1>
      </header>

      {data.team ? (
        <TeamView data={data} team={data.team} post={post} />
      ) : data.announced ? (
        <Card>
          <h2 className="font-display text-[1.2rem] font-bold">The teams are announced</h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-[#444]">
            Xerxes and Abel are still placing you in a team. Message one of them and they'll sort it out. This page will show your team as soon as you're placed.
          </p>
          <Champions />
        </Card>
      ) : (
        <Picker prefs={data.prefs} owner={data.owner} post={post} />
      )}

      <p className="mt-8 text-center text-[0.8rem] text-white/45">
        This page is private to you and opens on two devices only. Please don't forward the link.
      </p>
    </Frame>
  );
}

export function Frame({ children, name }: { children: ReactNode; name?: string }) {
  return (
    <div className="min-h-dvh" style={{ background: INK }}>
      <main className="relative mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {name && <div aria-hidden className="pointer-events-none fixed inset-0 z-50" style={{ backgroundImage: watermark(name) }} />}
        {children}
      </main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 text-[#131313] sm:p-6 ${className}`}>{children}</section>;
}

export function Champions() {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {CHAMPION_CONTACTS.map((c) => (
        <a
          key={c.first}
          href={`https://wa.me/${c.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full px-4 py-2 text-[0.85rem] font-bold text-white transition hover:-translate-y-0.5"
          style={{ background: "#1FA855" }}
        >
          WhatsApp {c.first}
        </a>
      ))}
    </div>
  );
}

const chip = "rounded-full border-2 px-3 py-1.5 text-[0.85rem] font-semibold transition";
const chipOn = { background: INK, borderColor: INK, color: "#fff" };
const chipOff = { background: "#fff", borderColor: "#d9d4c8", color: INK };

/* ------------------------------------------------------------------ */
/* Before the teams: the challenge picker                               */
/* ------------------------------------------------------------------ */

function Picker({ prefs, owner, post }: { prefs: Prefs | null; owner: boolean; post: (b: Record<string, unknown>) => Promise<string | null> }) {
  const [first, setFirst] = useState<number | null>(prefs?.first ?? null);
  const [second, setSecond] = useState<number | null>(prefs?.second ?? null);
  const [skills, setSkills] = useState<Skill[]>(prefs?.skills ?? []);
  const [hours, setHours] = useState<Hours | null>(prefs?.hours ?? null);
  const [dinner, setDinner] = useState<"yes" | "no">(prefs?.dinner ?? "yes");
  const [note, setNote] = useState(prefs?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(prefs ? `Saved ${when(prefs.at)}. You can change it until the teams are announced.` : "");

  const pick = (n: number, slot: 1 | 2) => {
    if (slot === 1) {
      if (second === n) setSecond(first);
      setFirst(n);
    } else {
      if (first === n) setFirst(second);
      setSecond(second === n ? null : n);
    }
  };

  const save = async () => {
    if (!first) return setMsg("Pick your first choice.");
    if (!hours) return setMsg("Say how many hours a week you can give.");
    setBusy(true);
    const err = await post({ action: "prefs", first, second, skills, hours, dinner, note });
    setBusy(false);
    setMsg(err ?? "Saved. Thank you! You can change it until the teams are announced.");
  };

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[0.95rem] leading-relaxed text-[#333]">
          Teams form at the dinner on <strong>Saturday 17 October</strong>. Pick the two challenges you'd most like to work on, and tell us what you bring. Xerxes and
          Abel use this to suggest teams before the evening. It takes two minutes, and you can change it until the teams are announced.
        </p>
      </Card>

      {TRACKS.map((t) => (
        <Card key={t.id}>
          <p className="font-technical text-[0.72rem] font-bold uppercase tracking-[0.16em]" style={{ color: O }}>
            {t.label}
          </p>
          <h2 className="mt-1 font-display text-[1.25rem] font-bold">{t.title}</h2>
          <ul className="mt-3 space-y-3">
            {CHALLENGES.filter((c) => c.track === t.id).map((c) => {
              const isFirst = first === c.n;
              const isSecond = second === c.n;
              return (
                <li
                  key={c.n}
                  className="rounded-2xl border-2 p-4 transition"
                  style={{ borderColor: isFirst ? INK : isSecond ? "#9b9384" : "#ebe6da", background: isFirst ? "#FBF8D6" : "#fff" }}
                >
                  <p className="text-[0.75rem] font-bold uppercase tracking-wide text-[#8a7f75]">
                    Challenge {two(c.n)} · {c.tag}
                  </p>
                  <h3 className="font-display text-[1.1rem] font-bold">{c.title}</h3>
                  <p className="mt-1 text-[0.9rem] leading-snug text-[#444]">{c.build}</p>
                  <p className="mt-1.5 text-[0.8rem] text-[#6a6a6a]">Team: {c.team}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={chip} style={isFirst ? chipOn : chipOff} onClick={() => pick(c.n, 1)} aria-pressed={isFirst}>
                      {isFirst ? "✓ First choice" : "First choice"}
                    </button>
                    <button type="button" className={chip} style={isSecond ? chipOn : chipOff} onClick={() => pick(c.n, 2)} aria-pressed={isSecond}>
                      {isSecond ? "✓ Second choice" : "Second choice"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      <Card>
        <h2 className="font-display text-[1.15rem] font-bold">What do you bring?</h2>
        <p className="mt-1 text-[0.85rem] text-[#6a6a6a]">Tick everything that fits, including what you'd like to learn.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SKILLS.map((s) => {
            const on = skills.includes(s);
            return (
              <button key={s} type="button" className={chip} style={on ? chipOn : chipOff} aria-pressed={on} onClick={() => setSkills(on ? skills.filter((x) => x !== s) : [...skills, s])}>
                {s}
              </button>
            );
          })}
        </div>

        <h2 className="mt-6 font-display text-[1.15rem] font-bold">Hours a week you can give</h2>
        <p className="mt-1 text-[0.85rem] text-[#6a6a6a]">Between 17 October and 21 November. Honest beats hopeful.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {HOURS.map((h) => (
            <button key={h} type="button" className={chip} style={hours === h ? chipOn : chipOff} aria-pressed={hours === h} onClick={() => setHours(h)}>
              {h}
            </button>
          ))}
        </div>

        <h2 className="mt-6 font-display text-[1.15rem] font-bold">Will you be at the dinner on 17 October?</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={chip} style={dinner === "yes" ? chipOn : chipOff} aria-pressed={dinner === "yes"} onClick={() => setDinner("yes")}>
            Yes, I'll be there
          </button>
          <button type="button" className={chip} style={dinner === "no" ? chipOn : chipOff} aria-pressed={dinner === "no"} onClick={() => setDinner("no")}>
            I can't make it
          </button>
        </div>

        <label className="mt-6 block">
          <span className="font-display text-[1.15rem] font-bold">Anything we should know?</span>
          <span className="mt-1 block text-[0.85rem] text-[#6a6a6a]">Optional. Someone you'd like to team with, an idea, or a time you can't do.</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={400}
            rows={3}
            className="mt-2 w-full rounded-2xl border-2 border-[#d9d4c8] px-4 py-3 text-[0.95rem] focus:border-[#131313] focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={save}
          disabled={busy || owner}
          className="mt-5 w-full rounded-full px-5 py-3 font-display text-[1rem] font-extrabold transition hover:-translate-y-0.5 disabled:opacity-50"
          style={{ background: Y, color: INK }}
        >
          {busy ? "Saving…" : prefs ? "Save my changes" : "Save my choices"}
        </button>
        {msg && (
          <p className="mt-3 text-center text-[0.9rem] font-semibold text-[#333]" aria-live="polite">
            {msg}
          </p>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* After the teams: the team page                                       */
/* ------------------------------------------------------------------ */

function TeamView({
  data,
  team,
  post,
}: {
  data: Payload;
  team: NonNullable<Payload["team"]>;
  post: (b: Record<string, unknown>) => Promise<string | null>;
}) {
  const c = challenge(team.n);
  const b = team.brief;
  return (
    <div className="space-y-4">
      <section className="rounded-3xl p-5 sm:p-6" style={{ background: Y, color: INK }}>
        <p className="font-technical text-[0.72rem] font-bold uppercase tracking-[0.16em]">Challenge {two(team.n)}</p>
        <h2 className="mt-1 font-display text-[1.8rem] font-extrabold leading-tight">{c?.title}</h2>
        {b && <p className="mt-1 text-[1rem] font-semibold">{b.strap}</p>}
        {team.role && (
          <p className="mt-3 inline-block rounded-full px-3 py-1 text-[0.85rem] font-bold" style={{ background: INK, color: Y }}>
            Your role: {team.role}
          </p>
        )}
      </section>

      <Card>
        <h2 className="font-display text-[1.2rem] font-bold">Your team</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {team.members.map((m) => (
            <li key={m.name + m.role} className="flex items-center justify-between gap-2 rounded-2xl border border-[#ebe6da] px-4 py-2.5">
              <span className="font-semibold">
                {m.name}
                {m.you && <span className="ml-1.5 text-[0.75rem] font-bold" style={{ color: O }}>you</span>}
              </span>
              {m.role && <span className="text-[0.8rem] text-[#6a6a6a]">{m.role}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[0.82rem] text-[#6a6a6a]">Swap numbers at the dinner and make a team chat. Phone numbers are never shown here.</p>
      </Card>

      <ThankYouCard name={data.name} challenge={c?.title ?? ""} role={team.role} preview={data.owner} />
      <Links links={team.links} owner={data.owner} post={post} />
      {b && <BriefView b={b} />}
      <Dates n={team.n} />
      <CheckIns team={team} owner={data.owner} post={post} />
      <SafetyCheck safety={team.safety} owner={data.owner} post={post} />
      <OnePager summary={team.summary} owner={data.owner} post={post} />

      <Card>
        <h2 className="font-display text-[1.2rem] font-bold">How you'll be judged</h2>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[#444]">{JUDGING.intro}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {JUDGING.criteria.map((x) => (
            <li key={x} className="rounded-2xl px-4 py-2.5 text-[0.9rem] font-semibold" style={{ background: "#f6f3ee" }}>
              {x}
            </li>
          ))}
        </ul>
        <h3 className="mt-5 font-display text-[1.05rem] font-bold">Everyone's ground rules</h3>
        <ul className="mt-2 list-disc space-y-1.5 ps-5 text-[0.9rem] leading-snug text-[#444]">
          {GROUND_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-display text-[1.2rem] font-bold">Stuck? Ask early.</h2>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[#444]">More than half an hour stuck is too long. Ask your team, or message a Champion.</p>
        <Champions />
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="font-technical text-[0.75rem] font-bold uppercase tracking-[0.16em]" style={{ color: O }}>
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

const List = ({ items, ordered = false }: { items: string[]; ordered?: boolean }) => {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`${ordered ? "list-decimal" : "list-disc"} space-y-1 ps-5 text-[0.92rem] leading-snug text-[#333]`}>
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </Tag>
  );
};

export function BriefView({ b }: { b: Brief }) {
  return (
    <Card>
      <h2 className="font-display text-[1.2rem] font-bold">Your brief</h2>
      <p className="mt-1 text-[0.82rem] text-[#6a6a6a]">For your team only. Please don't share it outside the team or post it anywhere.</p>
      <div className="mt-5">
        <Section title="The challenge">
          <p className="text-[0.95rem] leading-relaxed text-[#333]">{b.challenge}</p>
        </Section>
        <div className="mt-5 rounded-2xl p-4 text-white" style={{ background: INK }}>
          <p className="font-display text-[1.02rem] font-bold" style={{ color: Y }}>
            {b.callout.title}
          </p>
          <p className="mt-1 text-[0.92rem] leading-relaxed text-white/85">{b.callout.body}</p>
        </div>
        <Section title="What to build">
          <p className="text-[0.95rem] leading-relaxed text-[#333]">{b.build}</p>
          {b.parts.length > 0 && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {b.parts.map((p) => (
                <li key={p.name} className="rounded-2xl px-4 py-3" style={{ background: "#f6f3ee" }}>
                  <p className="text-[0.9rem] font-bold">{p.name}</p>
                  <p className="text-[0.85rem] leading-snug text-[#555]">{p.what}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
        {b.whoGets.length > 0 && (
          <Section title="Who gets what">
            <div className="grid gap-3 sm:grid-cols-2">
              {b.whoGets.map((w) => (
                <div key={w.who}>
                  <p className="mb-1 text-[0.9rem] font-bold">{w.who}</p>
                  <List items={w.items} />
                </div>
              ))}
            </div>
          </Section>
        )}
        <Section title="Ground rules">
          <ol className="space-y-2">
            {b.rules.map((r, i) => (
              <li key={r.rule} className="flex gap-3">
                <span className="font-display text-[0.9rem] font-extrabold" style={{ color: O }}>
                  {two(i + 1)}
                </span>
                <span className="text-[0.92rem] leading-snug text-[#333]">
                  <strong>{r.rule}.</strong> {r.detail}
                </span>
              </li>
            ))}
          </ol>
        </Section>
        {b.exists && (
          <Section title="Does it exist?">
            <p className="text-[0.92rem] leading-relaxed text-[#333]">{b.exists}</p>
          </Section>
        )}
        <Section title="The team">
          <List items={b.team} />
        </Section>
        <Section title="By 21 November">
          <List items={b.by21} ordered />
          {b.measured && (
            <p className="mt-2 text-[0.88rem] text-[#555]">
              <strong>Measured by:</strong> {b.measured.join("; ")}.
            </p>
          )}
        </Section>
        {b.demo && (
          <Section title="Demo story">
            <List items={b.demo} ordered />
          </Section>
        )}
        {b.notes.length > 0 && (
          <Section title="Good to know">
            <List items={b.notes} />
          </Section>
        )}
      </div>
    </Card>
  );
}

function Dates({ n }: { n: number }) {
  const [now] = useState(() => Date.now());
  const ahead = EVENTS.filter((e) => Date.parse(e.end) > Date.parse("2026-10-17T00:00:00+04:00"));
  const next = ahead.find((e) => Date.parse(e.end) > now)?.id;
  const kit = challenge(n)?.track === "kit";
  return (
    <Card>
      <h2 className="font-display text-[1.2rem] font-bold">The road to 21 November</h2>
      <ol className="mt-3 space-y-2">
        {ahead.map((e) => {
          const day = e.start.slice(0, 10);
          const goal = CHECK_IN_GOALS[day];
          const past = Date.parse(e.end) < now;
          return (
            <li
              key={e.id}
              className="rounded-2xl border-2 px-4 py-3"
              style={{ borderColor: e.id === next ? INK : "#ebe6da", background: e.id === next ? "#FBF8D6" : "#fff", opacity: past ? 0.55 : 1 }}
            >
              <p className="text-[0.78rem] font-bold uppercase tracking-wide text-[#8a7f75]">
                {when(Date.parse(e.start))} · {e.mode}
                {e.id === next && <span style={{ color: O }}> · next</span>}
              </p>
              <p className="font-semibold">{e.title}</p>
              {goal && <p className="mt-0.5 text-[0.85rem] text-[#555]">By then: {goal}</p>}
            </li>
          );
        })}
      </ol>
      {kit && <p className="mt-3 text-[0.82rem] text-[#6a6a6a]">Website kit teams: Team 01's page structure is settled by the 29 October check-in, so Teams 02 and 03 can build on it.</p>}
      {n === 7 && <p className="mt-3 text-[0.82rem] text-[#6a6a6a]">Provision: get the legal question answered in week 1.</p>}
    </Card>
  );
}

/** The team's working links, pinned in one place: GitHub, Figma, Canva, the team chat. */
function Links({ links, owner, post }: { links: TeamLink[]; owner: boolean; post: (b: Record<string, unknown>) => Promise<string | null> }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const add = async () => {
    setBusy(true);
    const err = await post({ action: "addLink", label, url });
    setBusy(false);
    if (err) return setMsg(err);
    setLabel("");
    setUrl("");
    setMsg("");
  };
  return (
    <Card>
      <h2 className="font-display text-[1.2rem] font-bold">Team links</h2>
      <p className="mt-1 text-[0.85rem] text-[#6a6a6a]">Pin your shared project, designs and team chat here so everyone, and your Champions, can find them.</p>
      {links.length > 0 && (
        <ul className="mt-3 space-y-2">
          {links.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5" style={{ background: "#f6f3ee" }}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold underline-offset-2 hover:underline">
                {l.label} <span className="font-normal text-[#8a7f75]">· {new URL(l.url).hostname.replace(/^www\./, "")}</span>
              </a>
              <button
                type="button"
                disabled={owner}
                className="text-[0.78rem] text-[#9A3412] underline disabled:opacity-40"
                onClick={() => window.confirm(`Remove "${l.label}" for the whole team?`) && post({ action: "removeLink", id: l.id })}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name, e.g. GitHub" maxLength={40} className="w-36 rounded-full border-2 border-[#d9d4c8] px-3 py-2 text-[0.9rem] focus:border-[#131313] focus:outline-none" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" className="min-w-0 flex-1 rounded-full border-2 border-[#d9d4c8] px-3 py-2 text-[0.9rem] focus:border-[#131313] focus:outline-none" />
        <button type="button" onClick={add} disabled={busy || owner || !label.trim() || !url.trim()} className="rounded-full px-4 py-2 font-bold disabled:opacity-50" style={{ background: Y, color: INK }}>
          Pin it
        </button>
      </div>
      {msg && <p className="mt-2 text-[0.88rem] font-semibold text-[#9A3412]">{msg}</p>}
      <p className="mt-2 text-[0.78rem] text-[#8a7f75]">Use your personal accounts, and keep shared files private to the team.</p>
    </Card>
  );
}

/**
 * The safety check due by 5 November: the team's own ground rules as a
 * checklist, then the security reviewer's verdict, which shows here too.
 */
function SafetyCheck({ safety, owner, post }: { safety: SafetyView; owner: boolean; post: (b: Record<string, unknown>) => Promise<string | null> }) {
  // Ticks show at once and settle when the server answers, so a slow phone never looks stuck.
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const toggle = (i: number, on: boolean) => {
    setPending((p) => ({ ...p, [i]: on }));
    post({ action: "safetyTick", i, on }).finally(() =>
      setPending((p) => {
        const next = { ...p };
        delete next[i];
        return next;
      }),
    );
  };
  const isOn = (i: number) => pending[i] ?? !!safety.ticks[String(i)];
  const done = safety.items.filter((_, i) => isOn(i)).length;
  const r = safety.review;
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[1.2rem] font-bold">Safety check</h2>
        <span className="text-[0.85rem] font-bold" style={{ color: done === safety.items.length ? "#15803d" : O }}>
          {done} of {safety.items.length} ticked
        </span>
      </div>
      <p className="mt-1 text-[0.85rem] text-[#6a6a6a]">Tick each one when it's true for your whole project. The security reviewer checks your work against this list by 5 November.</p>
      {r && (
        <p className="mt-3 rounded-2xl px-4 py-3 text-[0.9rem] font-semibold" style={r.status === "passed" ? { background: "#dcfce7", color: "#14532d" } : { background: "#fde4dc", color: "#7a2410" }}>
          {r.status === "passed" ? "✓ Passed the safety check" : "Needs fixes"} · {r.by}, {when(r.at)}
          {r.note && <span className="mt-1 block font-normal">{r.note}</span>}
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {safety.items.map((item, i) => {
          const tick = safety.ticks[String(i)];
          return (
            <li key={item}>
              <label className="flex cursor-pointer gap-3 rounded-2xl px-3 py-2.5" style={{ background: isOn(i) ? "#f0fdf4" : "#f6f3ee" }}>
                <input type="checkbox" checked={isOn(i)} disabled={owner} onChange={(e) => toggle(i, e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#131313]" />
                <span className="text-[0.9rem] leading-snug">
                  {item}
                  {tick && <span className="mt-0.5 block text-[0.75rem] text-[#6a6a6a]">Ticked by {tick.by}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/**
 * The team's one-page summary for 21 November. One shared copy per team: the
 * latest save wins, and it says who saved it. The Champions read it out on
 * the night and turn it into the partners' report.
 */
function OnePager({ summary, owner, post }: { summary: Summary | null; owner: boolean; post: (b: Record<string, unknown>) => Promise<string | null> }) {
  const [built, setBuilt] = useState(summary?.built ?? "");
  const [helps, setHelps] = useState(summary?.helps ?? "");
  const [works, setWorks] = useState(summary?.works ?? "");
  const [next, setNext] = useState(summary?.next ?? "");
  const [pub, setPub] = useState(summary?.public ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(summary ? `Last saved by ${summary.by}, ${when(summary.at)}.` : "");
  const field = "mt-1 w-full rounded-2xl border-2 border-[#d9d4c8] px-4 py-2.5 text-[0.95rem] font-normal focus:border-[#131313] focus:outline-none";
  const save = async () => {
    setBusy(true);
    const err = await post({ action: "summary", built, helps, works, next, public: pub });
    setBusy(false);
    setMsg(err ?? "Saved for the whole team. Thank you!");
  };
  return (
    <Card>
      <h2 className="font-display text-[1.2rem] font-bold">Your one-pager for 21 November</h2>
      <p className="mt-1 text-[0.85rem] text-[#6a6a6a]">
        One shared copy for the team: whoever saves last wins. Have it ready for the practice run on 19 November. The Champions use it on the night and in the report to
        partners.
      </p>
      <label className="mt-4 block text-[0.9rem] font-bold">
        What did you build?
        <textarea value={built} onChange={(e) => setBuilt(e.target.value)} maxLength={700} rows={3} className={field} />
      </label>
      <label className="mt-3 block text-[0.9rem] font-bold">
        Who does it help, and how?
        <textarea value={helps} onChange={(e) => setHelps(e.target.value)} maxLength={500} rows={2} className={field} />
      </label>
      <label className="mt-3 block text-[0.9rem] font-bold">
        What works today, and who tested it?
        <textarea value={works} onChange={(e) => setWorks(e.target.value)} maxLength={500} rows={2} className={field} />
      </label>
      <label className="mt-3 block text-[0.9rem] font-bold">
        What's next for it?
        <textarea value={next} onChange={(e) => setNext(e.target.value)} maxLength={500} rows={2} className={field} />
      </label>
      <label className="mt-3 block text-[0.9rem] font-bold">
        One line we could share publicly <span className="font-normal text-[#6a6a6a]">(optional)</span>
        <input value={pub} onChange={(e) => setPub(e.target.value)} maxLength={200} className={field} />
        <span className="mt-1 block text-[0.78rem] font-normal text-[#6a6a6a]">For people beyond the partners, such as the wider #HACK network. No names, places or who it's for.</span>
      </label>
      <button
        type="button"
        onClick={save}
        disabled={busy || owner || !built.trim()}
        className="mt-4 rounded-full px-5 py-2.5 font-display font-extrabold transition hover:-translate-y-0.5 disabled:opacity-50"
        style={{ background: Y, color: INK }}
      >
        {busy ? "Saving…" : "Save the one-pager"}
      </button>
      {msg && (
        <p className="mt-2 text-[0.9rem] font-semibold text-[#333]" aria-live="polite">
          {msg}
        </p>
      )}
    </Card>
  );
}

function CheckIns({ team, owner, post }: { team: NonNullable<Payload["team"]>; owner: boolean; post: (b: Record<string, unknown>) => Promise<string | null> }) {
  const [did, setDid] = useState("");
  const [next, setNext] = useState("");
  const [help, setHelp] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const field = "mt-1 w-full rounded-2xl border-2 border-[#d9d4c8] px-4 py-2.5 text-[0.95rem] focus:border-[#131313] focus:outline-none";

  const send = async () => {
    if (!did.trim() && !next.trim()) return setMsg("Say what your team did, or what's next.");
    setBusy(true);
    const err = await post({ action: "checkin", did, next, help });
    setBusy(false);
    if (err) return setMsg(err);
    setDid("");
    setNext("");
    setHelp("");
    setMsg(help.trim() ? "Posted, and the Champions have been told you need help." : "Posted. Thank you!");
  };

  return (
    <Card>
      <h2 className="font-display text-[1.2rem] font-bold">Weekly check-in</h2>
      <p className="mt-1 text-[0.85rem] text-[#6a6a6a]">One of you posts it before each Thursday call. Your team and the Champions see it.</p>
      <label className="mt-4 block text-[0.9rem] font-bold">
        What did the team get done?
        <textarea value={did} onChange={(e) => setDid(e.target.value)} maxLength={600} rows={2} className={field} />
      </label>
      <label className="mt-3 block text-[0.9rem] font-bold">
        What's next?
        <textarea value={next} onChange={(e) => setNext(e.target.value)} maxLength={600} rows={2} className={field} />
      </label>
      <label className="mt-3 block text-[0.9rem] font-bold">
        Need a Champion's help? <span className="font-normal text-[#6a6a6a]">Optional: say with what.</span>
        <input value={help} onChange={(e) => setHelp(e.target.value)} maxLength={400} className={field} />
      </label>
      <button
        type="button"
        onClick={send}
        disabled={busy || owner}
        className="mt-4 rounded-full px-5 py-2.5 font-display font-extrabold transition hover:-translate-y-0.5 disabled:opacity-50"
        style={{ background: Y, color: INK }}
      >
        {busy ? "Posting…" : "Post check-in"}
      </button>
      {msg && (
        <p className="mt-2 text-[0.9rem] font-semibold text-[#333]" aria-live="polite">
          {msg}
        </p>
      )}

      {team.checkins.length > 0 && (
        <ul className="mt-5 space-y-2">
          {team.checkins.map((k) => (
            <li key={k.at} className="rounded-2xl px-4 py-3" style={{ background: "#f6f3ee" }}>
              <p className="text-[0.78rem] font-bold text-[#8a7f75]">
                {k.by} · {when(k.at)}
              </p>
              {k.did && <p className="mt-1 text-[0.9rem]"><strong>Done:</strong> {k.did}</p>}
              {k.next && <p className="mt-0.5 text-[0.9rem]"><strong>Next:</strong> {k.next}</p>}
              {k.help && (
                <p className="mt-1 rounded-xl px-3 py-1.5 text-[0.85rem] font-semibold" style={{ background: "#fde4dc", color: "#7a2410" }}>
                  Asked for help: {k.help}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
