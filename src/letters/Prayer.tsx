/**
 * The prayer team's page, at /pray/<token>. Open requests first, then the
 * ones answered in the last two weeks (with thanks), and nothing after
 * that: a request leaves the page once it's answered. "I prayed" is a
 * count, so the owner knows the page is more than a list.
 */
import { useCallback, useEffect, useState } from "react";
import { api, type PrayerRequest } from "./api";
import { fmtShort, msg } from "./local";
import { ACCENT, GOOD, INK, PAPER, SERIF, SOFT } from "./ui";

const PRAYED = "prayer:prayed";

function readPrayed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(PRAYED) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export default function Prayer({ token }: { token: string }) {
  const [data, setData] = useState<{ requests: PrayerRequest[]; sender: string } | null>(null);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<Set<string>>(() => readPrayed());

  const load = useCallback(() => api.teamPrayer(token).then(setData, (e) => setError(msg(e))), [token]);
  useEffect(() => {
    void load();
  }, [load]);

  const prayed = async (r: PrayerRequest) => {
    if (mine.has(r.id)) return;
    const next = new Set(mine).add(r.id);
    setMine(next);
    try {
      localStorage.setItem(PRAYED, JSON.stringify([...next]));
    } catch {
      /* fine */
    }
    try {
      const res = await api.prayed(token, r.id);
      setData((d) => (d ? { ...d, requests: d.requests.map((x) => (x.id === r.id ? { ...x, prayed: res.prayed } : x)) } : d));
    } catch {
      /* the tap still counts here */
    }
  };

  const open = data?.requests.filter((r) => !r.answeredAt) ?? [];
  const answered = data?.requests.filter((r) => r.answeredAt) ?? [];
  const first = data?.sender.split(" ")[0] ?? "";

  return (
    <main className="min-h-screen pb-16 pt-[max(2rem,env(safe-area-inset-top))]" style={{ background: PAPER, color: "#2b2420" }}>
      <div className="mx-auto max-w-[36rem] px-4">
        <header className="text-center">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            Prayer team
          </p>
          <h1 className="mt-3 text-[1.9rem] font-bold leading-tight" style={{ color: INK, fontFamily: SERIF }}>
            {data ? `Praying with ${first}` : "Prayer requests"}
          </h1>
          <p className="mt-2 text-[0.95rem]" style={{ color: SOFT }}>
            Thank you for standing with us. Tap <strong>I prayed</strong> when you have: it's a quiet encouragement on this side.
          </p>
        </header>

        {error && <p className="mt-10 rounded-3xl bg-white p-6 text-center text-red-700 shadow-sm">{error}</p>}
        {!data && !error && (
          <p className="py-24 text-center" style={{ color: SOFT }}>
            Loading…
          </p>
        )}

        {data && open.length === 0 && answered.length === 0 && (
          <p className="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm" style={{ color: SOFT }}>
            Nothing to pray for right now, which is its own answer. Check back soon.
          </p>
        )}

        {open.length > 0 && (
          <ol className="mt-8 space-y-3">
            {open.map((r) => {
              const did = mine.has(r.id);
              return (
                <li key={r.id} className="overflow-hidden rounded-3xl bg-white shadow-sm">
                  {r.photo && <img src={r.photo} alt="" className="max-h-80 w-full object-cover" loading="lazy" />}
                  <div className="p-5">
                  <p className="whitespace-pre-line text-[1.02rem] leading-relaxed" style={{ color: "#2b2420" }}>
                    {r.text}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: SOFT }}>
                      Since {fmtShort(r.createdAt)}
                      {r.prayed > 0 && ` · prayed ${r.prayed} ${r.prayed === 1 ? "time" : "times"}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => void prayed(r)}
                      aria-pressed={did}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition"
                      style={did ? { borderColor: "#bcd6b5", background: "#e3eedf", color: GOOD } : { borderColor: "#ddd5c7", background: "#fff", color: INK }}
                    >
                      <span aria-hidden="true">🙏</span> {did ? "Prayed" : "I prayed"}
                    </button>
                  </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {answered.length > 0 && (
          <section className="mt-10">
            <h2 className="text-center text-[0.8rem] font-semibold uppercase tracking-[0.18em]" style={{ color: GOOD }}>
              Answered · thank you
            </h2>
            <ol className="mt-4 space-y-3">
              {answered.map((r) => (
                <li key={r.id} className="rounded-3xl border border-[#dfe9dc] bg-[#f3f8f1] p-5">
                  {r.photo && <img src={r.photo} alt="" className="mb-3 max-h-48 w-full rounded-2xl object-cover opacity-90" loading="lazy" />}
                  <p className="whitespace-pre-line leading-relaxed line-through decoration-[#9fbf97]" style={{ color: SOFT }}>
                    {r.text}
                  </p>
                  {r.answer && (
                    <p className="mt-3 font-semibold leading-relaxed" style={{ color: GOOD }}>
                      {r.answer}
                    </p>
                  )}
                  <p className="mt-2 text-xs" style={{ color: SOFT }}>
                    Answered {r.answeredAt ? fmtShort(r.answeredAt) : ""}
                    {r.prayed > 0 && ` · prayed ${r.prayed} ${r.prayed === 1 ? "time" : "times"}`}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="mt-12 text-center text-[0.85rem] leading-relaxed" style={{ color: SOFT }}>
          <p>This page is for our prayer partners. Please keep what's here between us. Answered requests leave the page after two weeks.</p>
        </footer>
      </div>
    </main>
  );
}
