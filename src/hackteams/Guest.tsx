import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CHALLENGES, JUDGING } from "../data/hack";
import { deviceId } from "./device";
import { BriefView, Card, Champions, Frame } from "./Member";

/**
 * A guest's page, /ht/g/<code>: the security reviewer, a mentor or a judge.
 * Everything comes from /api/hack-teams/guest, which shapes it to the kind of
 * guest (see that file). No phone numbers or email addresses, ever.
 */

type Summary = { built: string; helps: string; works: string; next: string; public: string; by: string; at: number };
type Review = { status: "passed" | "fixes"; note: string; by: string; at: number };
type Link = { id: string; label: string; url: string };
type CheckIn = { by: string; did: string; next: string; help: string; at: number };
type Team = {
  n: number;
  size: number;
  links?: Link[];
  safety?: { items: string[]; ticks: Record<string, { by: string; at: number }>; review: Review | null };
  summary?: Summary | null;
  score?: { s: number[]; note: string; at: number } | null;
  checkins?: CheckIn[];
  members?: { name: string; role: string }[];
  brief?: Parameters<typeof BriefView>[0]["b"] | null;
  review?: Review | null;
};
type Payload = { name: string; kind: "security" | "mentor" | "judge"; owner: boolean; expiresAt: number; teams: Team[] };

const INK = "#131313";
const Y = "#EFE974";
const O = "#EF4E25";
const two = (n: number) => String(n).padStart(2, "0");
const title = (n: number) => CHALLENGES.find((c) => c.n === n)?.title ?? "";
const when = (t: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dubai" }).format(new Date(t));

const INTRO: Record<Payload["kind"], { title: string; body: string }> = {
  security: {
    title: "Safety review",
    body: "Each team ticks its own checklist from its brief's ground rules. Look at their work through the links they've pinned, then mark each team passed or needing fixes, with a note they can act on. Teams see your verdict on their page.",
  },
  mentor: {
    title: "Your teams",
    body: "Thank you for walking with these teams. Here's their brief, who's who, their weekly check-ins and the links they've pinned. Join their calls or message them as you've agreed with the Champions.",
  },
  judge: {
    title: "Judging",
    body: `${JUDGING.intro} Score each team from 1 to 5 on the four questions as they finish presenting. You can change a score until the end of the night.`,
  },
};

export default function Guest({ code }: { code: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hack-teams/guest?c=${encodeURIComponent(code)}&d=${encodeURIComponent(deviceId())}`, { cache: "no-store", credentials: "same-origin" });
      const body = (await res.json().catch(() => ({}))) as Payload & { error?: string };
      if (!res.ok) return setError(body.error ?? "This link didn't open.");
      setData(body);
      document.title = INTRO[body.kind].title;
    } catch {
      setError("Couldn't reach the page. Check your connection and reload.");
    }
  }, [code]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only load
    load();
  }, [load]);

  const post = async (body: Record<string, unknown>): Promise<string | null> => {
    try {
      const res = await fetch("/api/hack-teams/guest", {
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
      return "That didn't save. Check your connection.";
    }
  };

  if (error)
    return (
      <Frame>
        <Card>
          <p className="font-display text-[1.2rem] font-bold">This page didn't open</p>
          <p className="mt-2 text-[0.95rem] text-[#444]">{error}</p>
        </Card>
      </Frame>
    );
  if (!data) return <Frame><p className="text-white/70">Opening…</p></Frame>;
  const intro = INTRO[data.kind];

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
          {intro.title}, {data.name}
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-white/75">{intro.body}</p>
      </header>

      {data.teams.length === 0 ? (
        <Card>
          <p className="text-[0.95rem]">The teams aren't formed yet. They form at the dinner on 17 October; this page fills in after that.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.teams.map((t) =>
            data.kind === "security" ? (
              <SecurityTeam key={t.n} t={t} owner={data.owner} post={post} />
            ) : data.kind === "judge" ? (
              <JudgeTeam key={t.n} t={t} owner={data.owner} post={post} />
            ) : (
              <MentorTeam key={t.n} t={t} />
            ),
          )}
        </div>
      )}

      <Card className="mt-4">
        <p className="text-[0.9rem]">Questions? Message a Champion.</p>
        <Champions />
      </Card>
      <p className="mt-8 text-center text-[0.8rem] text-white/45">This page is private to you and opens on two devices only. Please don't forward the link.</p>
    </Frame>
  );
}

function TeamHead({ t, right }: { t: Team; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <p className="font-technical text-[0.72rem] font-bold uppercase tracking-[0.16em]" style={{ color: O }}>
          Challenge {two(t.n)} · team of {t.size}
        </p>
        <h2 className="font-display text-[1.3rem] font-bold">{title(t.n)}</h2>
      </div>
      {right}
    </div>
  );
}

function LinkList({ links }: { links?: Link[] }) {
  if (!links?.length) return <p className="mt-2 text-[0.85rem] text-[#8a7f75]">No links pinned yet.</p>;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {links.map((l) => (
        <li key={l.id}>
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border border-[#d9d4c8] px-3 py-1.5 text-[0.85rem] font-semibold hover:border-[#131313]">
            {l.label} ↗
          </a>
        </li>
      ))}
    </ul>
  );
}

function ReviewBadge({ r }: { r: Review | null | undefined }) {
  if (!r) return <span className="rounded-full px-3 py-1 text-[0.78rem] font-bold" style={{ background: "#f6f3ee", color: "#6a6a6a" }}>Not reviewed</span>;
  return (
    <span className="rounded-full px-3 py-1 text-[0.78rem] font-bold" style={r.status === "passed" ? { background: "#dcfce7", color: "#14532d" } : { background: "#fde4dc", color: "#7a2410" }}>
      {r.status === "passed" ? "✓ Passed" : "Needs fixes"}
    </span>
  );
}

function SecurityTeam({ t, owner, post }: { t: Team; owner: boolean; post: (b: Record<string, unknown>) => Promise<string | null> }) {
  const s = t.safety!;
  const [note, setNote] = useState(s.review?.note ?? "");
  const [msg, setMsg] = useState("");
  const done = s.items.filter((_, i) => s.ticks[String(i)]).length;
  const decide = async (status: "passed" | "fixes") => {
    const err = await post({ action: "review", n: t.n, status, note });
    setMsg(err ?? (status === "passed" ? "Marked passed. The team sees it now." : "Sent back with your note. The team sees it now."));
  };
  return (
    <Card>
      <TeamHead t={t} right={<ReviewBadge r={s.review} />} />
      <p className="mt-3 text-[0.85rem] font-bold">Their links</p>
      <LinkList links={t.links} />
      <p className="mt-4 text-[0.85rem] font-bold">
        Their checklist · {done} of {s.items.length} ticked
      </p>
      <ul className="mt-2 space-y-1.5">
        {s.items.map((item, i) => (
          <li key={item} className="flex gap-2 text-[0.88rem] leading-snug">
            <span aria-hidden style={{ color: s.ticks[String(i)] ? "#15803d" : "#b91c1c" }}>
              {s.ticks[String(i)] ? "✓" : "○"}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <label className="mt-4 block text-[0.85rem] font-bold">
        Your note for the team
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={800} rows={3} className="mt-1 w-full rounded-2xl border-2 border-[#d9d4c8] px-4 py-2.5 text-[0.92rem] font-normal focus:border-[#131313] focus:outline-none" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={owner} onClick={() => decide("passed")} className="rounded-full px-4 py-2 font-bold text-white disabled:opacity-50" style={{ background: "#15803d" }}>
          Passed
        </button>
        <button type="button" disabled={owner || !note.trim()} onClick={() => decide("fixes")} className="rounded-full px-4 py-2 font-bold text-white disabled:opacity-50" style={{ background: "#b91c1c" }}>
          Needs fixes
        </button>
      </div>
      {s.review && <p className="mt-2 text-[0.78rem] text-[#8a7f75]">Last verdict by {s.review.by}, {when(s.review.at)}</p>}
      {msg && <p className="mt-2 text-[0.88rem] font-semibold">{msg}</p>}
    </Card>
  );
}

function JudgeTeam({ t, owner, post }: { t: Team; owner: boolean; post: (b: Record<string, unknown>) => Promise<string | null> }) {
  const [s, setS] = useState<number[]>(t.score?.s ?? [0, 0, 0, 0]);
  const [note, setNote] = useState(t.score?.note ?? "");
  const [msg, setMsg] = useState("");
  const total = s.reduce((a, b) => a + b, 0);
  const save = async () => {
    const err = await post({ action: "score", n: t.n, s, note });
    setMsg(err ?? "Saved.");
  };
  const sum = t.summary;
  return (
    <Card>
      <TeamHead t={t} right={t.score ? <span className="rounded-full px-3 py-1 text-[0.78rem] font-bold" style={{ background: "#dcfce7", color: "#14532d" }}>Scored {t.score.s.reduce((a, b) => a + b, 0)}/20</span> : undefined} />
      {sum ? (
        <div className="mt-3 space-y-1 rounded-2xl px-4 py-3 text-[0.88rem] leading-snug" style={{ background: "#f6f3ee" }}>
          <p><strong>Built:</strong> {sum.built}</p>
          {sum.helps && <p><strong>Helps:</strong> {sum.helps}</p>}
          {sum.works && <p><strong>Works today:</strong> {sum.works}</p>}
        </div>
      ) : (
        <p className="mt-2 text-[0.85rem] text-[#8a7f75]">This team hasn't written its one-pager yet.</p>
      )}
      <div className="mt-4 space-y-3">
        {JUDGING.criteria.map((c, i) => (
          <div key={c}>
            <p className="text-[0.9rem] font-bold">{c}</p>
            <div className="mt-1 flex gap-1.5" role="radiogroup" aria-label={c}>
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={s[i] === v}
                  onClick={() => setS(s.map((x, j) => (j === i ? v : x)))}
                  className="h-10 w-10 rounded-full border-2 font-bold"
                  style={s[i] === v ? { background: INK, borderColor: INK, color: Y } : { borderColor: "#d9d4c8", color: INK }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <label className="mt-4 block text-[0.85rem] font-bold">
        A comment for the Champions <span className="font-normal text-[#6a6a6a]">(optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} className="mt-1 w-full rounded-full border-2 border-[#d9d4c8] px-4 py-2 text-[0.92rem] font-normal focus:border-[#131313] focus:outline-none" />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" disabled={owner || s.includes(0)} onClick={save} className="rounded-full px-5 py-2.5 font-display font-extrabold disabled:opacity-50" style={{ background: Y, color: INK }}>
          Save score
        </button>
        <span className="text-[0.85rem] font-semibold">{s.includes(0) ? "Score all four" : `${total} of 20`}</span>
      </div>
      {msg && <p className="mt-2 text-[0.88rem] font-semibold">{msg}</p>}
    </Card>
  );
}

function MentorTeam({ t }: { t: Team }) {
  return (
    <div className="space-y-3">
      <Card>
        <TeamHead t={t} right={<ReviewBadge r={t.review} />} />
        {t.members && t.members.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {t.members.map((m) => (
              <li key={m.name + m.role} className="rounded-full border border-[#ebe6da] px-3 py-1.5 text-[0.85rem]">
                <strong>{m.name}</strong>
                {m.role && <span className="text-[#6a6a6a]"> · {m.role}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[0.85rem] font-bold">Their links</p>
        <LinkList links={t.links} />
        <p className="mt-4 text-[0.85rem] font-bold">Latest check-ins</p>
        {t.checkins?.length ? (
          <ul className="mt-2 space-y-2">
            {t.checkins.slice(0, 5).map((k) => (
              <li key={k.at} className="rounded-2xl px-4 py-2.5 text-[0.88rem]" style={{ background: "#f6f3ee" }}>
                <p className="text-[0.75rem] font-bold text-[#8a7f75]">{k.by} · {when(k.at)}</p>
                {k.did && <p>Done: {k.did}</p>}
                {k.next && <p>Next: {k.next}</p>}
                {k.help && <p className="font-semibold" style={{ color: "#7a2410" }}>Asked for help: {k.help}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[0.85rem] text-[#8a7f75]">No check-ins yet.</p>
        )}
        {t.summary && (
          <>
            <p className="mt-4 text-[0.85rem] font-bold">Their one-pager</p>
            <p className="mt-1 text-[0.88rem]">{t.summary.built}</p>
          </>
        )}
      </Card>
      {t.brief && <BriefView b={t.brief} />}
    </div>
  );
}
