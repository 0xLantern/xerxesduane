import { useEffect, useReducer, useState } from "react";
import { CHALLENGES } from "../data/hack";
import type { PanelList } from "./Panel";

/**
 * Showcase night, 21 November: the running order, a presentation timer for
 * the room, and each team's one-pager, ready to share two ways.
 *
 *   - For partners: everything the team wrote, posted straight onto every
 *     partner's page as an update (the owner's panel only), or copied.
 *   - For the wider #HACK network: only what the public page already says,
 *     plus the one line each team marked as safe to share.
 */

type Act = (body: Record<string, unknown>, done: string) => Promise<void>;

const INK = "#131313";
const Y = "#EFE974";
const O = "#EF4E25";
const two = (n: number) => String(n).padStart(2, "0");
const ch = (n: number) => CHALLENGES.find((c) => c.n === n);
const btn = "rounded-full px-3 py-1.5 text-[0.8rem] font-semibold transition hover:-translate-y-0.5 disabled:opacity-50";

/** "18:40" plus minutes, as "6:47". */
function clock(start: string, plus: number): string {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + plus;
  const hh = Math.floor(t / 60) % 24;
  return `${hh > 12 ? hh - 12 : hh}:${String(t % 60).padStart(2, "0")}`;
}

export default function Showcase({ list, owner, busy, act, setNote }: { list: PanelList; owner: boolean; busy: boolean; act: Act; setNote: (s: string) => void }) {
  const placed = CHALLENGES.map((c) => c.n).filter((n) => list.people.some((p) => p.team === n));
  const saved = list.show.order.filter((n) => placed.includes(n));
  const [order, setOrder] = useState<number[]>([...saved, ...placed.filter((n) => !saved.includes(n))]);
  const [present, setPresent] = useState(list.show.present);
  const [qa, setQa] = useState(list.show.qa);
  const [start, setStart] = useState(list.show.start);
  const [timer, setTimer] = useState(false);
  const slot = present + qa;
  const endsAt = clock(start, slot * order.length);
  // The public program gives presentations until 7:20.
  const over = (() => {
    const [h, m] = start.split(":").map(Number);
    return h * 60 + m + slot * order.length > 19 * 60 + 20;
  })();

  const move = (i: number, d: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
  };

  const sums = order.map((n) => ({ n, s: list.summaries[n] }));
  const forPartners = sums
    .map(({ n, s }) =>
      [
        `Challenge ${two(n)}: ${ch(n)?.title}`,
        s ? `What they built: ${s.built}` : "Summary to come.",
        s?.helps && `Who it helps: ${s.helps}`,
        s?.works && `What works today: ${s.works}`,
        s?.next && `What's next: ${s.next}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
  const forNetwork = [
    "#HACK2026 Dubai: what our teams built",
    "",
    ...sums.map(({ n, s }) => `${ch(n)?.title}: ${ch(n)?.build}${s?.public ? `\n${s.public}` : ""}\n`),
  ].join("\n");

  /**
   * The final report partners were promised: what each team built, in their
   * own words, and the money in one paragraph. Posted as an update on every
   * partner's page, and the line-by-line statement is switched on beside it.
   */
  const postToPartners = async () => {
    if (!window.confirm("Post the final report on every partner's page, and show them the money statement?")) return;
    const send = (body: unknown) =>
      fetch("/api/hack-partners/invites", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const got = await fetch("/api/hack-partners/invites", { credentials: "same-origin", cache: "no-store" });
    const money = got.ok ? ((await got.json()) as { money?: { received: number; spent: number; left: number } | null }).money : null;
    const aed = (n: number) => `AED ${n.toLocaleString("en-US")}`;
    const moneyLine = money
      ? `The money: ${aed(money.received)} came in from partners, and ${aed(money.spent)} has been spent so far, ${money.left >= 0 ? `with ${aed(money.left)} left` : `${aed(-money.left)} more than came in`}. The line-by-line statement is below on this page, and receipts are there for anyone who'd like to see them.`
      : "";
    const res = await send({
      action: "update",
      title: "What the teams built",
      body: [
        `On 21 November ${order.length} teams showed what they built over five weeks, working, not on slides. Here is each one, in their own words.`,
        forPartners,
        moneyLine,
        "Thank you for carrying this with us. None of it happens without you.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const out = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return setNote(out.error ?? "That didn't post. Try again.");
    if (money) await send({ action: "statement", on: true });
    setNote("The final report is on every partner's page, with the money statement. Send each a nudge from the partner panel (/hp).");
  };

  return (
    <div className="mt-8">
      <h2 className="font-display text-[1.2rem] font-bold text-white">Showcase night, 21 November</h2>

      <div className="mt-3 rounded-2xl bg-white p-4 text-[#131313]">
        <div className="flex flex-wrap items-center gap-3 text-[0.85rem]">
          <label className="flex items-center gap-1.5">
            Start
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-full border border-[#ccc] px-2 py-1" />
          </label>
          <label className="flex items-center gap-1.5">
            Present
            <input type="number" min={1} max={30} value={present} onChange={(e) => setPresent(Number(e.target.value) || 1)} className="w-14 rounded-full border border-[#ccc] px-2 py-1" />
            min
          </label>
          <label className="flex items-center gap-1.5">
            Questions
            <input type="number" min={1} max={30} value={qa} onChange={(e) => setQa(Number(e.target.value) || 1)} className="w-14 rounded-full border border-[#ccc] px-2 py-1" />
            min
          </label>
        </div>
        <ol className="mt-3 space-y-1.5">
          {order.map((n, i) => (
            <li key={n} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#f6f3ee" }}>
              <span className="w-12 font-technical text-[0.8rem] font-bold tabular-nums text-[#8a7f75]">{clock(start, slot * i)}</span>
              <span className="flex-1 font-semibold">
                {two(n)} {ch(n)?.title}
                {!list.summaries[n] && <span className="ml-2 text-[0.72rem] font-bold text-[#b91c1c]">no one-pager yet</span>}
              </span>
              <button type="button" className="px-1.5 text-[1rem]" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${ch(n)?.title} earlier`}>
                ↑
              </button>
              <button type="button" className="px-1.5 text-[1rem]" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${ch(n)?.title} later`}>
                ↓
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[0.8rem]" style={over ? { color: "#b91c1c", fontWeight: 700 } : { color: "#6a6a6a" }}>
          Presentations end at {endsAt}.{over ? " That runs past 7:20, when the talk is due to start: trim the minutes or start earlier." : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy} className={btn} style={{ background: INK, color: "#fff" }} onClick={() => act({ action: "show", order, present, qa, start }, "Running order saved.")}>
            Save running order
          </button>
          <button type="button" disabled={!order.length} className={btn} style={{ background: Y, color: INK }} onClick={() => setTimer(true)}>
            Start the timer
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4 text-[#131313]">
        <h3 className="font-display text-[1.05rem] font-bold">The one-pagers</h3>
        <p className="mt-1 text-[0.78rem] text-[#6a6a6a]">Teams write these on their own pages. Names never appear in either version below.</p>
        <ul className="mt-3 space-y-3">
          {sums.map(({ n, s }) => (
            <li key={n} className="rounded-xl border border-[#eee] p-3 text-[0.85rem] leading-snug">
              <p className="font-display font-bold">
                {two(n)} {ch(n)?.title}
              </p>
              {s ? (
                <>
                  <p className="mt-1"><strong>Built:</strong> {s.built}</p>
                  {s.helps && <p className="mt-0.5"><strong>Helps:</strong> {s.helps}</p>}
                  {s.works && <p className="mt-0.5"><strong>Works today:</strong> {s.works}</p>}
                  {s.next && <p className="mt-0.5"><strong>Next:</strong> {s.next}</p>}
                  {s.public && <p className="mt-0.5 italic"><strong className="not-italic">Shareable line:</strong> {s.public}</p>}
                  <p className="mt-1 text-[0.72rem] text-[#8a7f75]">Saved by {s.by}</p>
                </>
              ) : (
                <p className="mt-1 text-[#8a7f75]">Not written yet.</p>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          {owner && (
            <button type="button" disabled={busy || !sums.some((x) => x.s)} className={btn} style={{ background: INK, color: Y }} onClick={postToPartners}>
              Post the final report to partners
            </button>
          )}
          <button type="button" className={`${btn} border border-[#ccc]`} onClick={() => navigator.clipboard?.writeText(forPartners).then(() => setNote("Partner version copied."))}>
            Copy for partners
          </button>
          <button type="button" className={`${btn} border border-[#ccc]`} onClick={() => navigator.clipboard?.writeText(forNetwork).then(() => setNote("Shareable version copied: public descriptions plus each team's shareable line."))}>
            Copy for the #HACK network
          </button>
        </div>
      </div>

      {timer && <Timer order={order} present={present} qa={qa} onClose={() => setTimer(false)} />}
    </div>
  );
}

type T = { idx: number; phase: "present" | "qa"; left: number; running: boolean };
type A = { type: "tick"; dt: number } | { type: "toggle" } | { type: "next" } | { type: "prev" } | { type: "restart" };

/** The presentation timer: full screen, big enough to read from the back of a room. Space starts and pauses, arrows move between teams. */
function Timer({ order, present, qa, onClose }: { order: number[]; present: number; qa: number; onClose: () => void }) {
  const P = present * 60_000;
  const Q = qa * 60_000;
  const [t, dispatch] = useReducer(
    (s: T, a: A): T => {
      switch (a.type) {
        case "tick": {
          if (!s.running) return s;
          const left = s.left - a.dt;
          if (left > 0) return { ...s, left };
          // Presenting runs straight on into questions; questions stop at time.
          return s.phase === "present" ? { ...s, phase: "qa", left: Q } : { ...s, left: 0, running: false };
        }
        case "toggle":
          return { ...s, running: !s.running };
        case "restart":
          return { ...s, phase: "present", left: P, running: false };
        case "next":
          return s.idx < order.length - 1 ? { idx: s.idx + 1, phase: "present", left: P, running: false } : s;
        case "prev":
          return s.idx > 0 ? { idx: s.idx - 1, phase: "present", left: P, running: false } : s;
      }
    },
    { idx: 0, phase: "present", left: P, running: false },
  );

  useEffect(() => {
    if (!t.running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", dt: now - last });
      last = now;
    }, 200);
    return () => window.clearInterval(id);
  }, [t.running]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        dispatch({ type: "toggle" });
      } else if (e.key === "ArrowRight") dispatch({ type: "next" });
      else if (e.key === "ArrowLeft") dispatch({ type: "prev" });
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const n = order[t.idx];
  const secs = Math.ceil(t.left / 1000);
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const done = t.left <= 0;
  const color = done ? "#ff6b6b" : secs <= 60 ? O : "#fff";
  const nextUp = order[t.idx + 1];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between px-6 py-8 text-center" style={{ background: INK }} role="dialog" aria-label="Presentation timer">
      <div className="flex w-full max-w-4xl items-center justify-between text-[0.85rem] text-white/60">
        <span>
          Team {t.idx + 1} of {order.length}
        </span>
        <button type="button" onClick={onClose} className="rounded-full border border-white/30 px-3 py-1 text-white">
          Close
        </button>
      </div>
      <div>
        <p className="font-technical text-[1rem] font-bold uppercase tracking-[0.2em]" style={{ color: Y }}>
          Challenge {two(n)}
        </p>
        <h2 className="mt-2 font-display text-[2.6rem] font-extrabold leading-tight text-white sm:text-[4rem]">{ch(n)?.title}</h2>
        <p className="mt-6 text-[1.1rem] font-bold uppercase tracking-[0.2em]" style={{ color: t.phase === "present" ? Y : "#93c5fd" }}>
          {done ? "Time" : t.phase === "present" ? "Presenting" : "Questions"}
        </p>
        <p className="font-display font-extrabold leading-none tabular-nums" style={{ color, fontSize: "clamp(6rem, 22vw, 16rem)" }} aria-live="off">
          {mmss}
        </p>
      </div>
      <div className="w-full max-w-4xl">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => dispatch({ type: "prev" })} disabled={t.idx === 0} className="rounded-full border border-white/30 px-5 py-3 font-bold text-white disabled:opacity-30">
            ← Back
          </button>
          <button type="button" onClick={() => dispatch({ type: "toggle" })} disabled={done} className="rounded-full px-8 py-3 font-display text-[1.2rem] font-extrabold disabled:opacity-40" style={{ background: Y, color: INK }}>
            {t.running ? "Pause" : t.left === P && t.phase === "present" ? "Start" : "Resume"}
          </button>
          <button type="button" onClick={() => dispatch({ type: "restart" })} className="rounded-full border border-white/30 px-5 py-3 font-bold text-white">
            Restart
          </button>
          <button type="button" onClick={() => dispatch({ type: "next" })} disabled={t.idx === order.length - 1} className="rounded-full border border-white/30 px-5 py-3 font-bold text-white disabled:opacity-30">
            Next →
          </button>
        </div>
        <p className="mt-4 text-[0.9rem] text-white/50">
          {nextUp ? `Next up: ${ch(nextUp)?.title}` : "Last team"} · Space to start or pause, arrows to move
        </p>
      </div>
    </div>
  );
}
