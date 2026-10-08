import { useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * One partner's private page. Everything it shows comes from
 * /api/hack-partners/read, which answers only for a valid personal link on
 * a device it has let in. What this file adds in the browser:
 *
 *   - a faint watermark with their first name and today's date, so a
 *     screenshot that travels says whose link it came from;
 *   - a plain cover hides the page while it is switched away (page visibility
 *     only), so the phone's app switcher keeps a covered snapshot, not a
 *     readable one; "Tap to show" lifts it;
 *   - printing shows a notice instead (see partners.html);
 *   - nothing is stored except a random device id.
 */

type Row = { when: string; what: string };
type Content = {
  eyebrow: string;
  title: string;
  intro: string;
  program: Row[];
  ask: { headline: string; amount: string; amountNote: string; carries: string; places: number; shareNote: string };
  budget: { item: string; total: number; each: number }[];
  receives: string[];
  howToGive: string[];
  pray: string[];
  why: {
    eyebrow: string;
    title: string;
    intro: string;
    punch: string;
    rows: { problem: string; looks: string; instead: string }[];
    challengesTitle: string;
    tracks: { label: string; title: string; lede: string; challenges: { title: string; hook: string; body: string }[] }[];
    giftTitle: string;
    gift: string;
  };
  closing: string;
  signature: string;
  whatsapp: { number: string; text: string };
};
type Kind = "in" | "share" | "pray" | "notnow";
type Payload = {
  name: string;
  content: Content;
  places: { taken: number; total: number };
  expiresAt: number;
  owner: boolean;
  /** The Champion who sent this link; replies go to them. */
  from?: { name: string; whatsapp: string };
  response?: Kind | null;
};

/**
 * The four answers. Each tap records the answer (api/hack-partners/respond.ts)
 * and opens WhatsApp to the Champion who sent the link, with a message ready.
 */
const ANSWERS: { kind: Kind; label: string; note: string; text: (champion: string) => string }[] = [
  { kind: "in", label: "Count me in for a place", note: "AED 300", text: (n) => `Hi ${n}, I've read the page. Count me in for one of the ten places 🙏` },
  { kind: "share", label: "I'd like to share a place", note: "AED 150 with a friend", text: (n) => `Hi ${n}, I've read the page. I'd like to share a place with a friend (AED 150) 🙏` },
  { kind: "pray", label: "I'll pray with you", note: "for the teams", text: (n) => `Hi ${n}, I've read the page. I can't give right now, but I'll be praying for the teams 🙏` },
  { kind: "notnow", label: "Not this time", note: "and that's okay", text: (n) => `Hi ${n}, thank you for thinking of me. Not this time, but I'm cheering you on 🙏` },
];

function Answers({ code, data }: { code: string; data: Payload }) {
  const [picked, setPicked] = useState<Kind | null>(data.response ?? null);
  const from = data.from ?? { name: "Xerxes", whatsapp: data.content.whatsapp.number };

  // Recorded without waiting, so the tap still opens WhatsApp straight away;
  // keepalive lets the request finish as the page hands over to WhatsApp.
  const record = (kind: Kind) => {
    setPicked(kind);
    if (data.owner) return;
    fetch("/api/hack-partners/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ c: code, d: deviceId(), kind }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  };

  const thanks: Record<Kind, string> = {
    in: `Thank you! ${from.name} will send you the giving details privately.`,
    share: `Thank you! ${from.name} will help pair you with a friend and send the details privately.`,
    pray: "Thank you. Your prayers carry this as much as any gift.",
    notnow: "Thank you for reading it. No pressure at all, and we're grateful you're in our corner.",
  };

  return (
    <div className="mt-5">
      <p className="text-[0.95rem] font-bold text-[#131313]">How would you like to respond?</p>
      <p className="mt-0.5 text-[0.82rem] text-[#5a5a5a]">Each answer opens WhatsApp to {from.name} with a message ready to send. You can change it any time.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ANSWERS.map((a) => {
          const on = picked === a.kind;
          return (
            <a
              key={a.kind}
              href={`https://wa.me/${from.whatsapp}?text=${encodeURIComponent(a.text(from.name))}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => record(a.kind)}
              className="flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 transition hover:-translate-y-0.5"
              style={
                on
                  ? { background: Y, borderColor: INK, color: INK }
                  : a.kind === "in"
                    ? { background: INK, borderColor: INK, color: "#fff" }
                    : { background: "#fff", borderColor: "#d9d4c8", color: INK }
              }
            >
              <span>
                <span className="block font-display text-[0.98rem] font-extrabold">{a.label}</span>
                <span className={`block text-[0.78rem] ${a.kind === "in" && !on ? "text-white/70" : "text-[#5a5a5a]"}`}>{a.note}</span>
              </span>
              <span aria-hidden className="text-[1.1rem]">
                {on ? "✓" : "→"}
              </span>
            </a>
          );
        })}
      </div>
      {picked && (
        <p className="mt-3 rounded-xl px-4 py-3 text-[0.9rem] font-semibold" style={{ background: "#FBF8D6", color: INK }} aria-live="polite">
          {thanks[picked]}
        </p>
      )}
    </div>
  );
}

const Y = "#EFE974";
const O = "#EF4E25";
const INK = "#131313";

/** This browser's id for the device lock: random, kept on the device. */
function deviceId(): string {
  const KEY = "hackp-device";
  const make = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b & 63]).join("");
  try {
    const have = localStorage.getItem(KEY);
    if (have && /^[A-Za-z0-9_-]{16,64}$/.test(have)) return have;
    const made = make();
    localStorage.setItem(KEY, made);
    return made;
  } catch {
    try {
      const s = sessionStorage.getItem(KEY) ?? make();
      sessionStorage.setItem(KEY, s);
      return s;
    } catch {
      return "";
    }
  }
}

/** A tiled SVG of "For <name> · <date> · private", for the watermark layer. */
function watermark(name: string): string {
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Dubai" }).format(new Date());
  const text = `For ${name} · ${day} · private`.replace(/[<>&"']/g, "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='180'><text x='10' y='100' transform='rotate(-24 170 90)' font-family='sans-serif' font-size='15' fill='%23131313' fill-opacity='0.07'>${text}</text></svg>`;
  return `url("data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}")`;
}

const aed = (n: number) => `AED ${n.toLocaleString("en-US")}`;

/** Challenges numbered 1..7 straight through both tracks. */
function numbered(tracks: Content["why"]["tracks"]) {
  let n = 0;
  return tracks.map((t) => ({ ...t, challenges: t.challenges.map((ch) => ({ ...ch, n: ++n })) }));
}

function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`mt-8 ${className}`}>{children}</section>;
}

function Box({ children, tone = "panel", className = "" }: { children: ReactNode; tone?: "panel" | "yellow" | "ink"; className?: string }) {
  const styles =
    tone === "yellow"
      ? { background: "#FBF8D6", color: INK, borderColor: "#E9E2A0" }
      : tone === "ink"
        ? { background: "#1d1d1d", color: "#fff", borderColor: "#2a2a2a" }
        : { background: "#fff", color: INK, borderColor: "#e8e4dc" };
  return (
    <div className={`rounded-2xl border p-5 ${className}`} style={styles}>
      {children}
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center text-white">
      {/* Neutral on purpose: someone holding a dead or forwarded link learns nothing about what it was for. */}
      <p className="text-[1.8rem]" aria-hidden>
        🔒
      </p>
      <h1 className="mt-4 font-display text-[1.4rem] font-bold">{title}</h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-white/75">{body}</p>
    </main>
  );
}

export default function Reader({ code }: { code: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/hack-partners/read?c=${encodeURIComponent(code)}&d=${encodeURIComponent(deviceId())}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const body = (await res.json().catch(() => ({}))) as Partial<Payload> & { error?: string; locked?: boolean };
        if (!live) return;
        if (res.ok && body.content) {
          setData(body as Payload);
          document.title = "A private note from Xerxes";
        } else {
          setError({
            title: body.locked ? "This link is open elsewhere" : res.status === 429 ? "One moment" : "This link isn't working",
            body: body.error ?? "Please check your connection and try again.",
          });
        }
      } catch {
        if (live) setError({ title: "This link isn't working", body: "Please check your connection and try again." });
      }
    })();
    return () => {
      live = false;
    };
  }, [code]);

  // Cover the page while it is hidden, so the app switcher's snapshot can't be read.
  //
  // Only the page-visibility signal, never window blur/focus: WhatsApp's in-app
  // browser on iPhone fires "blur" without ever firing "focus" again, which left
  // the page stuck behind the cover (a partner saw a black screen, 7 Oct 2026).
  // Visibility always comes back to "visible" when the page is shown again, and
  // the cover has a tap-to-show button besides, so nobody can be locked out.
  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    const shown = () => setHidden(false);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pageshow", shown);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pageshow", shown);
    };
  }, []);

  const mark = useMemo(() => (data ? watermark(data.name) : ""), [data]);

  if (error) return <Message title={error.title} body={error.body} />;
  if (!data) return <Message title="Opening your page…" body="Just a moment." />;

  const c = data.content;
  const until = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Dubai" }).format(new Date(data.expiresAt));
  const totalBudget = c.budget.reduce((s, r) => s + r.total, 0);

  return (
    <div className="relative min-h-dvh select-none" style={{ background: "#f6f3ee" }}>
      {/* The watermark sits over everything and catches nothing. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-40" style={{ backgroundImage: mark, backgroundRepeat: "repeat" }} />

      {/* A plain cover rather than a CSS blur: Safari can paint a large blurred layer as solid black. */}
      {hidden && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "#f6f3ee" }}>
          <p className="text-[1.6rem]" aria-hidden>
            🔒
          </p>
          <p className="font-display text-[1.05rem] font-bold text-[#131313]">Private page</p>
          <button
            type="button"
            onClick={() => setHidden(false)}
            className="rounded-full px-5 py-2.5 font-display text-[0.95rem] font-bold"
            style={{ background: INK, color: Y }}
          >
            Tap to show
          </button>
        </div>
      )}
      <div>
        {/* ---- header ---- */}
        <header style={{ background: INK }}>
          <div className="mx-auto max-w-3xl px-5 pb-8 pt-6 sm:px-8">
            <div className="flex items-center justify-between">
              <p className="font-display text-[1.15rem] font-extrabold text-white">
                #HACK<span style={{ color: O }}>2026</span>{" "}
                <span className="rounded-sm px-1.5 py-0.5 align-middle text-[0.65rem] tracking-[0.3em] text-white" style={{ background: O }}>
                  DUBAI
                </span>
              </p>
              <span className="rounded-full border px-3 py-1 text-[0.72rem] font-semibold" style={{ borderColor: `${Y}55`, color: Y }}>
                Private · for {data.name}
              </span>
            </div>
            <p className="mt-8 font-technical text-[0.72rem] font-bold uppercase tracking-[0.18em]" style={{ color: Y }}>
              {c.eyebrow}
            </p>
            <h1 className="mt-2 font-display text-[2.1rem] font-extrabold leading-tight text-white sm:text-[2.6rem]">{c.title}</h1>
            <p className="mt-4 text-[1rem] leading-relaxed text-white/80">{c.intro}</p>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
          {/* ---- program ---- */}
          <Section>
            <h2 className="font-display text-[1.2rem] font-bold text-[#131313]">The program</h2>
            <dl className="mt-3 divide-y divide-[#e8e4dc] overflow-hidden rounded-2xl border border-[#e8e4dc] bg-white">
              {c.program.map((p) => (
                <div key={p.when} className="grid gap-1 px-4 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
                  <dt className="text-[0.9rem] font-bold text-[#131313]">{p.when}</dt>
                  <dd className="text-[0.92rem] leading-snug text-[#4a4a4a]">{p.what}</dd>
                </div>
              ))}
            </dl>
          </Section>

          {/* ---- the ask ---- */}
          <Section>
            <p className="font-display text-[1.2rem] font-bold leading-snug text-[#131313]">{c.ask.headline}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Box tone="ink">
                <p className="text-[0.85rem] font-bold" style={{ color: Y }}>
                  One partner
                </p>
                <p className="mt-1 font-display text-[2.4rem] font-extrabold leading-none">{c.ask.amount}</p>
                <p className="mt-1 text-[0.8rem] text-white/60">{c.ask.amountNote}</p>
                <p className="mt-3 text-[0.92rem] leading-snug text-white/85">{c.ask.carries}</p>
              </Box>
              <Box tone="yellow">
                <p className="text-[0.85rem] font-bold">Ten places</p>
                <ol className="mt-2 flex flex-wrap gap-1.5" aria-label={`${data.places.taken} of ${data.places.total} places taken`}>
                  {Array.from({ length: data.places.total }, (_, i) => {
                    const taken = i < data.places.taken;
                    return (
                      <li
                        key={i}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[0.8rem] font-bold"
                        style={taken ? { background: INK, borderColor: INK, color: Y } : { borderColor: INK, color: INK }}
                      >
                        {taken ? "✓" : i + 1}
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-2 text-[0.85rem] font-semibold">
                  {data.places.taken === 0
                    ? "All ten places are open."
                    : data.places.taken >= data.places.total
                      ? "All ten places are taken. Thank you!"
                      : `${data.places.taken} taken, ${data.places.total - data.places.taken} still open.`}
                </p>
                <p className="mt-2 text-[0.82rem] leading-snug text-[#5a5640]">{c.ask.shareNote}</p>
              </Box>
            </div>
            <Answers code={code} data={data} />
          </Section>

          {/* ---- budget and what partners receive ---- */}
          <Section className="grid gap-3 lg:grid-cols-2">
            <Box>
              <h2 className="font-display text-[1.05rem] font-bold">Where it goes</h2>
              <table className="mt-3 w-full text-[0.88rem]">
                <thead>
                  <tr className="text-left text-[0.75rem] text-[#7a7468]">
                    <th className="pb-2 font-semibold">Item</th>
                    <th className="pb-2 text-right font-semibold">Total</th>
                    <th className="pb-2 text-right font-semibold">Each</th>
                  </tr>
                </thead>
                <tbody>
                  {c.budget.map((r) => (
                    <tr key={r.item} className="border-t border-[#efebe3]">
                      <td className="py-1.5 pr-2 font-semibold">{r.item}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.total.toLocaleString("en-US")}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.each}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[#131313] font-bold">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right tabular-nums">{aed(totalBudget)}</td>
                    <td className="py-2 text-right tabular-nums">{c.ask.amount.replace("AED ", "")}</td>
                  </tr>
                </tbody>
              </table>
            </Box>
            <Box>
              <h2 className="font-display text-[1.05rem] font-bold">What every partner receives</h2>
              <ul className="mt-3 space-y-2 text-[0.9rem] leading-snug text-[#3a3a3a]">
                {c.receives.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span aria-hidden style={{ color: O }}>
                      ●
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </Box>
          </Section>

          <Section className="grid gap-3 lg:grid-cols-2">
            <Box>
              <h2 className="font-display text-[1.05rem] font-bold">How to give</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[0.9rem] leading-snug text-[#3a3a3a]">
                {c.howToGive.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Box>
            <Box tone="yellow">
              <h2 className="font-display text-[1.05rem] font-bold">Please pray with us</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[0.9rem] leading-snug">
                {c.pray.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Box>
          </Section>

          {/* ---- why ---- */}
          <Section className="border-t-2 border-[#131313] pt-8">
            <p className="font-technical text-[0.72rem] font-bold uppercase tracking-[0.18em]" style={{ color: O }}>
              {c.why.eyebrow}
            </p>
            <h2 className="mt-1 font-display text-[1.8rem] font-extrabold leading-tight text-[#131313]">{c.why.title}</h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-[#3a3a3a]">
              {c.why.intro} <strong className="text-[#131313]">{c.why.punch}</strong>
            </p>
            <div className="mt-4 space-y-2">
              {c.why.rows.map((r) => (
                <div key={r.problem} className="grid overflow-hidden rounded-2xl border border-[#e8e4dc] sm:grid-cols-[1fr_1.2fr_1.2fr]">
                  <p className="bg-white px-4 py-3 text-[0.9rem] font-bold">{r.problem}</p>
                  <p className="bg-white px-4 py-3 text-[0.88rem] leading-snug text-[#4a4a4a]">{r.looks}</p>
                  <p className="px-4 py-3 text-[0.88rem] leading-snug" style={{ background: "#FBF8D6" }}>
                    {r.instead}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section>
            <h2 className="font-display text-[1.2rem] font-bold text-[#131313]">{c.why.challengesTitle}</h2>
            {numbered(c.why.tracks).map((t) => (
                <div key={t.title} className="mt-4">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="rounded-sm px-2 py-0.5 font-technical text-[0.68rem] font-bold uppercase tracking-[0.16em]" style={{ background: Y, color: INK }}>
                      {t.label}
                    </span>
                    <h3 className="font-display text-[1.1rem] font-bold text-[#131313]">{t.title}</h3>
                    <p className="basis-full text-[0.86rem] leading-snug text-[#4a4a4a]">{t.lede}</p>
                  </div>
                  <ul className="mt-2.5 grid gap-3 sm:grid-cols-2">
                    {t.challenges.map((ch) => {
                      // The third kit challenge stays the dark card, as on the printed sheet.
                      const dark = ch.n === 3;
                      return (
                        <li key={ch.title}>
                          <Box tone={dark ? "ink" : "panel"} className="h-full">
                            <p className="font-technical text-[0.7rem] font-bold uppercase tracking-[0.16em]" style={{ color: dark ? Y : O }}>
                              Challenge {String(ch.n).padStart(2, "0")}
                            </p>
                            <h4 className="mt-1 font-display text-[1.05rem] font-bold">{ch.title}</h4>
                            <p className="mt-2 text-[0.9rem] font-semibold leading-snug">{ch.hook}</p>
                            <p className={`mt-1.5 text-[0.88rem] leading-snug ${dark ? "text-white/75" : "text-[#4a4a4a]"}`}>{ch.body}</p>
                          </Box>
                        </li>
                      );
                    })}
                  </ul>
                </div>
            ))}
          </Section>

          <Section>
            <Box tone="yellow">
              <h2 className="font-display text-[1.1rem] font-bold">{c.why.giftTitle}</h2>
              <p className="mt-2 text-[0.95rem] leading-relaxed">{c.why.gift}</p>
            </Box>
          </Section>

          <Section className="text-[0.88rem] leading-relaxed text-[#5a5a5a]">
            <p>{c.closing}</p>
            <p className="mt-1 font-bold text-[#131313]">{c.signature}</p>
            <p className="mt-6 rounded-xl border border-[#e8e4dc] bg-white px-4 py-3 text-[0.8rem]">
              🔒 This page is just for you. It opens on up to two of your devices, stops working after {until}, and can't be printed. Please don't
              forward the link.
              {data.owner && <strong className="ml-1" style={{ color: O }}>You're signed in, so this view didn't use a device slot.</strong>}
            </p>
          </Section>
        </main>
      </div>
    </div>
  );
}
