/**
 * A partner's private copy, at /l/<copyId>#<linkKey>.
 *
 * The key arrives in the link's # fragment, which the browser never sends to
 * the server. It stays in the address bar, so "Open in Safari/Chrome" from
 * the in-app browsers of Gmail, Outlook, Facebook and the like still carries
 * it; it is also kept for this tab, so a reload without it works. With it the page opens the copy, which holds the file key, fetches
 * the encrypted PDF piece by piece, decrypts it here, and shows its pages.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { api } from "./api";
import { PdfPages } from "./Pages";
import { openPdf, pdfjs } from "./pdf";
import { LINK_KEY, decrypt, fmtDate, fromB64url, importKey, shortName, type Wrapped } from "./shared";
import { ACCENT, Bar, INK, PAPER, SERIF, SOFT } from "./ui";

type State =
  | { kind: "opening" }
  | { kind: "gone"; message: string; retry?: boolean }
  | { kind: "loading"; w: Wrapped; got: number; total: number }
  | { kind: "ready"; w: Wrapped; doc: PDFDocumentProxy };

/** What the copy came with besides the letter: whether this partner already replied, and the prayer team's page. */
type Extras = { praying: boolean; prayer: string | null };


const INCOMPLETE = "This link isn't complete. Please open it straight from the message it came in, without changing it.";
const GONE = "This letter has expired or was withdrawn.";
const OFFLINE = "The letter couldn't be loaded. Please check your connection and try again.";

/**
 * True on a device the desk has published from (it keeps letters' links in
 * this site's storage, local.ts). Opening a partner's link there is the
 * owner checking it, so it isn't counted as that partner's open.
 */
/** This browser's reader id: random, kept on the device, the thing a copy is locked to. */
function deviceId(): string {
  const KEY = "letter-device";
  try {
    const have = localStorage.getItem(KEY);
    if (have && /^[A-Za-z0-9_-]{16,64}$/.test(have)) return have;
    const made = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b & 63]).join("");
    localStorage.setItem(KEY, made);
    return made;
  } catch {
    // Storage blocked (private mode): one id for this tab, so a reload in it still works.
    try {
      const s = sessionStorage.getItem(KEY) ?? Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[b & 63]).join("");
      sessionStorage.setItem(KEY, s);
      return s;
    } catch {
      return "";
    }
  }
}

const LOCKED =
  "This letter is already open on two other devices, so it can't open here. If this is your new phone or computer, just reply to the message your link came in and ask for this device to be let in.";

function ownDevice(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith("letters-desk:")) return true;
  } catch {
    /* storage blocked: count it */
  }
  return false;
}

/** Fetch with one quiet retry, for a phone on a patchy connection. */
async function get(url: string): Promise<Response | null> {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { credentials: "omit", cache: "no-store" }).catch(() => null);
    if (res && (res.ok || res.status === 404 || res.status === 403)) return res;
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  return null;
}

export default function Reader({ copyId }: { copyId: string }) {
  const [state, setState] = useState<State>({ kind: "opening" });
  const [extras, setExtras] = useState<Extras>({ praying: false, prayer: null });
  const pdfBytes = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let cancelled = false;
    const store = `letter-key:${copyId}`;
    let raw = window.location.hash.slice(1);
    if (raw) {
      try {
        sessionStorage.setItem(store, raw);
      } catch {
        /* private mode: the key just won't survive a reload */
      }
    } else {
      try {
        raw = sessionStorage.getItem(store) ?? "";
      } catch {
        raw = "";
      }
    }
    // Start fetching the viewer while the letter downloads.
    void pdfjs().catch(() => undefined);

    (async () => {
      if (!/^[A-Za-z0-9_-]{22}$/.test(copyId) || !LINK_KEY.test(raw)) {
        setState({ kind: "gone", message: INCOMPLETE });
        return;
      }
      const dev = deviceId();
      const res = await get(`/api/letters/read?c=${copyId}&d=${encodeURIComponent(dev)}${ownDevice() ? "&peek=1" : ""}`);
      if (cancelled) return;
      if (!res || !res.ok) {
        setState(
          res?.status === 404 ? { kind: "gone", message: GONE } : res?.status === 403 ? { kind: "gone", message: LOCKED } : { kind: "gone", message: OFFLINE, retry: true },
        );
        return;
      }
      const copy = (await res.json()) as { letterId: string; wrapped: string; size: number; chunks: number; praying?: boolean; prayer?: string | null };
      setExtras({ praying: copy.praying === true, prayer: typeof copy.prayer === "string" ? copy.prayer : null });
      let w: Wrapped;
      try {
        const bytes = await decrypt(fromB64url(copy.wrapped), await importKey(raw));
        w = JSON.parse(new TextDecoder().decode(bytes)) as Wrapped;
      } catch {
        if (!cancelled) setState({ kind: "gone", message: "This link doesn't open this letter. Please open it straight from the message it came in." });
        return;
      }
      if (cancelled) return;
      document.title = `A letter from ${w.sender}`;
      setState({ kind: "loading", w, got: 0, total: copy.size });

      // The pieces, three at a time.
      const parts: Uint8Array[] = new Array(copy.chunks);
      let got = 0;
      let next = 0;
      const fail: { why: "gone" | "offline" | null } = { why: null };
      await Promise.all(
        Array.from({ length: Math.min(3, copy.chunks) }, async () => {
          while (next < copy.chunks && !fail.why && !cancelled) {
            const n = next++;
            const r = await get(`/api/letters/read?c=${copyId}&d=${encodeURIComponent(dev)}&f=${copy.letterId}&n=${n}`);
            if (!r || !r.ok) {
              fail.why = r?.status === 404 || r?.status === 403 ? "gone" : "offline";
              return;
            }
            parts[n] = new Uint8Array(await r.arrayBuffer());
            got += parts[n].length;
            if (!cancelled) setState({ kind: "loading", w, got, total: copy.size });
          }
        }),
      );
      if (cancelled) return;
      if (fail.why) {
        setState(fail.why === "gone" ? { kind: "gone", message: GONE } : { kind: "gone", message: OFFLINE, retry: true });
        return;
      }
      const sealed = new Uint8Array(copy.size);
      let at = 0;
      for (const p of parts) {
        sealed.set(p, at);
        at += p.length;
      }

      let pdf: Uint8Array;
      try {
        pdf = await decrypt(sealed, await importKey(w.fileKey));
      } catch {
        if (!cancelled) setState({ kind: "gone", message: "The letter didn't arrive whole. Please try again in a moment.", retry: true });
        return;
      }
      // pdf.js takes the buffer it is given; keep a copy only if it can be downloaded.
      if (w.allowDownload) pdfBytes.current = pdf.slice();
      try {
        const doc = await openPdf(pdf);
        if (!cancelled) setState({ kind: "ready", w, doc });
      } catch {
        if (!cancelled)
          setState({
            kind: "gone",
            message: "Your browser couldn't show this letter. Please try opening the link in an up-to-date Chrome or Safari.",
          });
      }
    })().catch(() => {
      if (!cancelled) setState({ kind: "gone", message: OFFLINE, retry: true });
    });
    return () => {
      cancelled = true;
    };
  }, [copyId]);

  const download = (w: Wrapped) => {
    const bytes = pdfBytes.current;
    if (!bytes) return;
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${w.title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Letter"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const w = state.kind === "loading" || state.kind === "ready" ? state.w : null;

  return (
    <main className="min-h-screen pb-16 pt-[max(2rem,env(safe-area-inset-top))]" style={{ background: PAPER, color: "#2b2420" }}>
      {state.kind === "opening" && (
        <p className="py-32 text-center" style={{ color: SOFT }}>
          Opening your letter…
        </p>
      )}

      {state.kind === "gone" && (
        <div className="mx-4 mt-20 max-w-md rounded-3xl bg-white p-8 text-center shadow-sm sm:mx-auto">
          <p className="text-lg font-bold" style={{ color: INK }}>
            {state.message}
          </p>
          <p className="mt-3 text-sm" style={{ color: SOFT }}>
            Letters are private: each one opens only on its reader's own devices, and is removed after a few weeks. If you'd like a copy, just reply to the message it came in.
          </p>
          {state.retry && (
            <button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex min-h-11 items-center rounded-full px-6 font-bold text-white" style={{ background: INK }}>
              Try again
            </button>
          )}
        </div>
      )}

      {w && (
        <>
          <header className="mx-auto max-w-[40rem] px-5 text-center">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              A letter from {w.sender}
            </p>
            <h1 className="mt-3 text-[1.9rem] font-bold leading-tight sm:text-[2.4rem]" style={{ color: INK, fontFamily: SERIF }}>
              {w.title}
            </h1>
            <p className="mt-3 text-[0.95rem]" style={{ color: SOFT }}>
              Private, just for you{w.hello ? `, ${w.hello}` : ""}. Available until <span className="whitespace-nowrap">{fmtDate(w.expiresAt)}</span>.
            </p>
            {state.kind === "ready" && w.allowDownload && (
              <button
                type="button"
                onClick={() => download(w)}
                className="mt-5 inline-flex min-h-11 items-center rounded-full border border-[#ddd5c7] bg-white px-5 text-[0.95rem] font-bold"
                style={{ color: INK }}
              >
                Download PDF
              </button>
            )}
          </header>

          <div className="mx-auto mt-7 w-full max-w-[56rem] px-3 sm:px-5">
            {state.kind === "loading" && (
              <div className="mx-auto max-w-sm rounded-3xl bg-white p-6 shadow-sm">
                <Bar done={state.got} total={state.total} label={state.got >= state.total ? "Unlocking your letter…" : "Opening your letter…"} />
              </div>
            )}
            {state.kind === "ready" && (
              <Guarded name={w.who || w.hello || "you"} spotlight={w.spotlight !== false} holdToRead={w.holdToRead === true}>
                <PdfPages doc={state.doc} />
              </Guarded>
            )}
          </div>

          {state.kind === "ready" && <Reply copyId={copyId} sender={w.sender} already={extras.praying} prayer={extras.prayer} />}

          <footer className="mx-auto mt-10 max-w-[34rem] px-6 text-center text-[0.85rem] leading-relaxed" style={{ color: SOFT }}>
            <p className="font-bold" style={{ color: INK }}>
              Private by design
            </p>
            <p className="mt-1">
              This letter was encrypted before it was sent, and only the key in your link opens it, here in your browser. The website only ever stores it encrypted, and deletes
              even that after {fmtDate(w.expiresAt)}. Please don't forward your link: it's just for you.
            </p>
          </footer>
        </>
      )}
    </main>
  );
}

/**
 * A reply that takes one tap: "Praying for you", with a line if they want.
 * It reaches the owner's desk (and their inbox); nothing of the letter goes
 * with it. The prayer team's page is linked from here too.
 */
function Reply({ copyId, sender, already, prayer }: { copyId: string; sender: string; already: boolean; prayer: string | null }) {
  const [sent, setSent] = useState(already);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noted, setNoted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const first = shortName(sender);

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await api.react(copyId, note.trim());
      setSent(true);
      setNoted(!!note.trim());
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't go through. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-[34rem] px-4">
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
        {sent && !open ? (
          <>
            <p className="text-2xl" aria-hidden="true">
              🙏
            </p>
            <p className="mt-2 text-lg font-bold" style={{ color: INK, fontFamily: SERIF }}>
              {noted ? `Thank you. ${first} will see your line.` : `Thank you. ${first} will know you're praying.`}
            </p>
            <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-11 text-sm font-semibold" style={{ color: SOFT }}>
              {noted ? "Change your line" : "Add a line"}
            </button>
          </>
        ) : (
          <>
            <p className="text-lg font-bold" style={{ color: INK, fontFamily: SERIF }}>
              {sent ? `A line for ${first}` : `Let ${first} know you're praying`}
            </p>
            <p className="mt-1 text-sm" style={{ color: SOFT }}>
              {sent ? `It goes to ${first} only.` : `One tap is enough. It goes to ${first} only.`}
            </p>
            {open && (
              <textarea
                autoFocus
                aria-label={`A line for ${first}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="A line, if you'd like (optional)"
                className="mt-4 w-full rounded-xl border border-[#ddd5c7] bg-[#faf8f4] px-3 py-2 text-base text-[#2b2420] placeholder:text-[#a49a8f] focus:border-[#8a6a2e] focus:outline-none focus:ring-2 focus:ring-[#8a6a2e]/20"
              />
            )}
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || (sent && !note.trim())}
                className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-[1rem] font-bold text-white disabled:opacity-60"
                style={{ background: INK }}
              >
                <span aria-hidden="true">🙏</span> {busy ? "Sending…" : sent ? "Send the line" : "Praying for you"}
              </button>
              {(!open || sent) && (
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className="inline-flex min-h-12 items-center rounded-full border border-[#ddd5c7] bg-white px-5 text-[0.95rem] font-bold"
                  style={{ color: INK }}
                >
                  {open ? "Cancel" : "Add a line"}
                </button>
              )}
            </div>
          </>
        )}
        {prayer && (
          <p className="mt-5 border-t border-[#f0ebe2] pt-4 text-sm" style={{ color: SOFT }}>
            Praying with us this month?{" "}
            <a href={prayer} className="font-bold underline-offset-2 hover:underline" style={{ color: ACCENT }}>
              See the prayer requests
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * Keeps the letter on the page. No website can stop a screenshot taken by the
 * phone or the computer itself, so this does what a page can: no right-click
 * "Save image" or "Copy image", no long-press save on a phone, no dragging a
 * page out, no selecting, no Save / Print / Copy shortcuts, a blank page when
 * printed, and the letter blurred whenever the window isn't in front (which is
 * when most screenshot tools are open). Each copy also carries the partner's
 * own name, faintly, across every page, so a picture that gets passed on says
 * whose copy it was.
 */
function Guarded({ name, spotlight, holdToRead, children }: { name: string; spotlight: boolean; holdToRead: boolean; children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  // A computer has a mouse; a phone or tablet doesn't.
  const [computer] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches);
  // Spotlight on computers.
  const lens = spotlight && computer;
  // Hold-to-read on phones and tablets: shown only while a finger is on the screen.
  const hold = holdToRead && !computer;
  const [touching, setTouching] = useState(false);
  const [moved, setMoved] = useState(false);
  // The day this copy is being read, for the watermark.
  const [today] = useState(() => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));

  // Spotlight: a mask shows the letter only in a band at the mouse's height;
  // everywhere else is blank paper, so a screenshot has nothing to recover.
  // (A blur was tried first: browsers leave lines readable near the window's
  // edges.) The band is set straight on the element, without a re-render,
  // and kept under the mouse as the page scrolls.
  useEffect(() => {
    if (!lens) return;
    let lastY: number | null = null;
    const place = () => {
      const el = pages.current;
      if (!el) return;
      el.style.setProperty("--y", lastY === null ? "-99999px" : `${lastY - el.getBoundingClientRect().top}px`);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      lastY = e.clientY;
      setMoved(true);
      place();
    };
    const away = () => {
      lastY = null;
      place();
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", away);
    window.addEventListener("blur", away);
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    // The pages load and grow after this runs: follow their size too.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    if (pages.current) ro?.observe(pages.current);
    place();
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", away);
      window.removeEventListener("blur", away);
      window.removeEventListener("scroll", place);
    };
  }, [lens]);

  // Hold-to-read: any finger on the screen shows the letter; the last one
  // lifted (or the phone switching away) blanks it at once. A screenshot
  // taken with the phone's buttons usually has no finger on the screen.
  useEffect(() => {
    if (!hold) return;
    const down = () => setTouching(true);
    const up = (e: TouchEvent) => {
      if (e.touches.length === 0) setTouching(false);
    };
    const off = () => setTouching(false);
    document.addEventListener("touchstart", down, { passive: true });
    document.addEventListener("touchend", up, { passive: true });
    document.addEventListener("touchcancel", up, { passive: true });
    window.addEventListener("blur", off);
    document.addEventListener("visibilitychange", off);
    window.addEventListener("pagehide", off);
    return () => {
      document.removeEventListener("touchstart", down);
      document.removeEventListener("touchend", up);
      document.removeEventListener("touchcancel", up);
      window.removeEventListener("blur", off);
      document.removeEventListener("visibilitychange", off);
      window.removeEventListener("pagehide", off);
    };
  }, [hold]);
  const blank = hold && !touching;

  useEffect(() => {
    const hide = () => setHidden(true);
    const show = () => setHidden(false);
    const onVis = () => (document.hidden ? hide() : show());
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "c", "a"].includes(k)) e.preventDefault();
      // Mac screenshot shortcuts (Cmd+Shift+3/4/5) and PrintScreen: hide at once; the tool may still win the race.
      if ((e.metaKey && e.shiftKey && ["3", "4", "5"].includes(k)) || k === "printscreen") {
        hide();
        window.setTimeout(show, 1500);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      // Windows copies a PrintScreen to the clipboard: clear it where the browser allows.
      if (e.key.toLowerCase() === "printscreen") {
        void navigator.clipboard?.writeText("").catch(() => undefined);
        // Windows 11 opens the Snipping Tool on PrintScreen: keep the letter hidden while it's up.
        hide();
        window.setTimeout(show, 4000);
      }
    };
    const block = (e: Event) => e.preventDefault();
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKeyUp, true);
    document.addEventListener("copy", block);
    window.addEventListener("beforeprint", hide);
    window.addEventListener("afterprint", show);
    return () => {
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKeyUp, true);
      document.removeEventListener("copy", block);
      window.removeEventListener("beforeprint", hide);
      window.removeEventListener("afterprint", show);
    };
  }, []);

  // The name and today's date, repeated diagonally on two offset rows: an SVG
  // tile, so it scales with every page and no part of a page goes without it.
  const label = `${name} · private copy · ${today}`.replace(/[<>&"']/g, "");
  const tile = `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='260'><g transform='rotate(-24 210 130)' font-family='Georgia,serif' font-size='17' fill='rgba(43,26,20,0.12)'><text x='0' y='90'>${label}</text><text x='150' y='210'>${label}</text></g></svg>`,
  )}")`;

  return (
    <div
      ref={box}
      className="letter-guard relative select-none"
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <style>{`@media print { body * { visibility: hidden !important; } body::after { content: "This letter is private and can't be printed."; visibility: visible; display: block; padding: 4rem; font: 18px Georgia, serif; text-align: center; } } .letter-guard canvas, .letter-guard img { -webkit-user-drag: none; pointer-events: none; } .letter-lens { --y: -99999px; --band: max(80px, 11vh); --fade: max(36px, 4vh); -webkit-mask-image: linear-gradient(to bottom, transparent calc(var(--y) - var(--band) - var(--fade)), #000 calc(var(--y) - var(--band)), #000 calc(var(--y) + var(--band)), transparent calc(var(--y) + var(--band) + var(--fade))); mask-image: linear-gradient(to bottom, transparent calc(var(--y) - var(--band) - var(--fade)), #000 calc(var(--y) - var(--band)), #000 calc(var(--y) + var(--band)), transparent calc(var(--y) + var(--band) + var(--fade))); }`}</style>
      {lens && (
        <p className="mb-3 text-center text-sm" style={{ color: SOFT }}>
          Move your mouse down the letter to read it, or keep it still and scroll. Only the lines under the pointer are clear, so the page can't be screenshotted.
        </p>
      )}
      {hold && (
        <p className="mb-3 px-2 text-center text-sm" style={{ color: SOFT }}>
          Keep a finger on the screen while you read, and scroll as usual. The letter goes blank when you let go, so it can't be screenshotted.
        </p>
      )}
      <div className={lens || hold ? "rounded-sm bg-white shadow-[0_1px_3px_rgba(0,0,0,.08)]" : ""}>
        <div
          ref={pages}
          className={lens ? "letter-lens" : ""}
          style={{ filter: hidden ? "blur(28px)" : "none", opacity: blank ? 0 : 1, transition: blank ? "filter .15s" : "filter .15s, opacity .08s" }}
        >
          {children}
        </div>
      </div>
      {lens && !moved && !hidden && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 z-30 flex justify-center">
          <p className="rounded-full bg-white/95 px-5 py-3 text-[0.95rem] font-semibold shadow" style={{ color: INK }}>
            Move your mouse over the letter to read
          </p>
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[25]" style={{ backgroundImage: tile, backgroundRepeat: "repeat" }} />
      {blank && !hidden && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 z-30 flex justify-center px-4">
          <p className="rounded-full bg-white/95 px-5 py-3 text-center text-[0.95rem] font-semibold shadow" style={{ color: INK }}>
            Hold your finger on the screen to read
          </p>
        </div>
      )}
      {hidden && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
          <p className="rounded-full bg-white/90 px-5 py-3 text-[0.95rem] font-semibold shadow" style={{ color: INK }}>
            Tap the letter to keep reading
          </p>
        </div>
      )}
    </div>
  );
}
