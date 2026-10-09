import { useEffect, useMemo, useState } from "react";

/**
 * One person's private briefing. The page asks /api/join/read for the key,
 * which it gets only for a valid personal link on a device it has let in,
 * then opens the sealed briefing (public/jb/brief.dat) in the browser. What
 * this file adds:
 *
 *   - a faint watermark with their first name and today's date, so a
 *     screenshot that travels says whose link it came from;
 *   - a plain cover while the page is switched away (page visibility only,
 *     as on /hp), with a tap-to-show button so nobody is locked out;
 *   - printing shows a notice instead (see join.html);
 *   - nothing is stored except a random device id.
 */

type Kind = "join" | "talk" | "pray" | "notnow";
type Payload = { name: string; key: string; owner: boolean; whatsapp: string; response?: Kind | null };

const INK = "#1c2a44";
const CANVAS = "#f6f3ee";

/** This browser's id for the device lock: random, kept on the device. */
function deviceId(): string {
  const KEY = "join-device";
  const make = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b & 63]).join("");
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
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='180'><text x='10' y='100' transform='rotate(-24 170 90)' font-family='sans-serif' font-size='15' fill='%231c2a44' fill-opacity='0.06'>${text}</text></svg>`;
  return `url("data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}")`;
}

function b64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

/** Fetch and open the sealed briefing: iv (12) | ciphertext | tag, AES-256-GCM. */
async function openBrief(rawKey: string): Promise<string> {
  const res = await fetch("/jb/brief.dat", { cache: "no-store" });
  if (!res.ok) throw new Error("fetch");
  const sealed = new Uint8Array(await res.arrayBuffer());
  const key = await crypto.subtle.importKey("raw", b64url(rawKey), "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: sealed.subarray(0, 12) }, key, sealed.subarray(12));
  const data = JSON.parse(new TextDecoder().decode(plain)) as { html?: string };
  if (typeof data.html !== "string") throw new Error("format");
  return data.html;
}

const ANSWERS: { kind: Kind; label: string; note: string; text: string }[] = [
  { kind: "join", label: "I'd like to join the team", note: "Let's talk about where I'd fit", text: "Hi Xerxes, I've read the private page. I'd like to join the team. Can we talk about where I'd fit? 🙏" },
  { kind: "talk", label: "I'd like to talk first", note: "I have some questions", text: "Hi Xerxes, I've read the private page. I'd like to talk about it first, I have a few questions 🙏" },
  { kind: "pray", label: "I'll pray with you", note: "for the people and the team", text: "Hi Xerxes, I've read the private page. I can't serve right now, but I'll be praying for it 🙏" },
  { kind: "notnow", label: "Not right now", note: "and that's okay", text: "Hi Xerxes, thank you for thinking of me. Not right now, but I'm cheering you on 🙏" },
];

function Answers({ code, data }: { code: string; data: Payload }) {
  const [picked, setPicked] = useState<Kind | null>(data.response ?? null);

  // Recorded without waiting, so the tap still opens WhatsApp straight away.
  const record = (kind: Kind) => {
    setPicked(kind);
    if (data.owner) return;
    fetch("/api/join/respond", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ c: code, d: deviceId(), kind }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  };

  const thanks: Record<Kind, string> = {
    join: "Thank you! Xerxes will be in touch to talk about the next step.",
    talk: "Thank you! Xerxes would love to answer your questions.",
    pray: "Thank you. Your prayers carry this work as much as anything.",
    notnow: "Thank you for reading it. No pressure at all, and we're grateful you're in our corner.",
  };

  return (
    <section className="wb-respond">
      <h2>How would you like to respond?</h2>
      <p className="wb-note">Each answer opens WhatsApp to Xerxes with a message ready to send. You can change it any time.</p>
      <div className="wb-answers">
        {ANSWERS.map((a) => {
          const on = picked === a.kind;
          return (
            <a
              key={a.kind}
              href={`https://wa.me/${data.whatsapp}?text=${encodeURIComponent(a.text)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => record(a.kind)}
              className={`wb-answer${on ? " is-on" : ""}${a.kind === "join" ? " is-main" : ""}`}
            >
              <span>
                <b>{a.label}</b>
                <small>{a.note}</small>
              </span>
              <span aria-hidden>{on ? "✓" : "→"}</span>
            </a>
          );
        })}
      </div>
      {picked && (
        <p className="wb-thanks" aria-live="polite">
          {thanks[picked]}
        </p>
      )}
    </section>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center" style={{ color: INK }}>
      {/* Neutral on purpose: someone holding a dead or forwarded link learns nothing about what it was for. */}
      <p className="text-[1.8rem]" aria-hidden>
        🔒
      </p>
      <h1 className="mt-4 font-display text-[1.4rem] font-bold">{title}</h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-[#4a5468]">{body}</p>
    </main>
  );
}

export default function Reader({ code }: { code: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/join/read?c=${encodeURIComponent(code)}&d=${encodeURIComponent(deviceId())}`, { cache: "no-store", credentials: "same-origin" });
        const body = (await res.json().catch(() => ({}))) as Partial<Payload> & { error?: string; locked?: boolean };
        if (!live) return;
        if (!res.ok || !body.key) {
          setError({
            title: body.locked ? "This link is open elsewhere" : res.status === 429 ? "One moment" : res.status === 503 ? "Not quite ready" : "This link isn't working",
            body: body.error ?? "Please check your connection and try again.",
          });
          return;
        }
        const page = await openBrief(body.key);
        if (!live) return;
        setData(body as Payload);
        setHtml(page);
      } catch {
        if (live) setError({ title: "This page couldn't open", body: "Please check your connection and try again." });
      }
    })();
    return () => {
      live = false;
    };
  }, [code]);

  // Cover the page while it is hidden, so the app switcher's snapshot can't be
  // read. Page visibility only, never blur/focus (see src/hackpartners/Reader.tsx).
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
  if (!data || html === null) return <Message title="Opening your page…" body="Just a moment." />;

  return (
    <div className="relative min-h-dvh select-none" style={{ background: CANVAS }}>
      {/* The watermark sits over everything and catches nothing. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-40" style={{ backgroundImage: mark, backgroundRepeat: "repeat" }} />

      {/* A plain cover rather than a CSS blur: Safari can paint a large blurred layer as solid black. */}
      {hidden && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: CANVAS }}>
          <p className="text-[1.6rem]" aria-hidden>
            🔒
          </p>
          <p className="font-display text-[1.05rem] font-bold" style={{ color: INK }}>
            Private page
          </p>
          <button type="button" onClick={() => setHidden(false)} className="rounded-full px-5 py-2.5 font-display text-[0.95rem] font-bold" style={{ background: INK, color: "#fff" }}>
            Tap to show
          </button>
        </div>
      )}

      <div className="wb-top">
        <span>
          Private · for <b>{data.name}</b>
        </span>
      </div>
      <p className="wb-hello">
        Dear {data.name}, thank you for taking a few quiet minutes with this. It's written for you personally.
      </p>

      {/* The briefing's own markup, from the sealed file this site made. */}
      <article className="wb" dangerouslySetInnerHTML={{ __html: html }} />

      <div className="wb">
        <Answers code={code} data={data} />
        <p className="wb-foot" style={{ color: "#7a8296" }}>
          🔒 This page is just for you. It opens on this device only and can't be printed. Please don't forward the link or share anything from it online, and to protect the people we serve, please don't mention the ministry's name in public.
        </p>
      </div>
    </div>
  );
}
