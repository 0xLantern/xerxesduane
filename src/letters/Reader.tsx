/**
 * A partner's private copy, at /l/<copyId>#<linkKey>.
 *
 * The key arrives in the link's # fragment, which the browser never sends to
 * the server. It is taken out of the address bar at once (so it isn't left on
 * screen or in a copied URL) and kept for this tab only, so a reload still
 * works. With it the page opens the copy, which holds the file key, fetches
 * the encrypted PDF piece by piece, decrypts it here, and shows its pages.
 */
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { api } from "./api";
import { PdfPages } from "./Pages";
import { openPdf, pdfjs } from "./pdf";
import { LINK_KEY, decrypt, fmtDate, fromB64url, importKey, type Wrapped } from "./shared";
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

/** Fetch with one quiet retry, for a phone on a patchy connection. */
async function get(url: string): Promise<Response | null> {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url, { credentials: "omit", cache: "no-store" }).catch(() => null);
    if (res && (res.ok || res.status === 404)) return res;
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
      history.replaceState(null, "", window.location.pathname);
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
      const res = await get(`/api/letters/read?c=${copyId}`);
      if (cancelled) return;
      if (!res || !res.ok) {
        setState(res?.status === 404 ? { kind: "gone", message: GONE } : { kind: "gone", message: OFFLINE, retry: true });
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
            const r = await get(`/api/letters/read?c=${copyId}&f=${copy.letterId}&n=${n}`);
            if (!r || !r.ok) {
              fail.why = r?.status === 404 ? "gone" : "offline";
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
            Letters are private and are removed after 30 days. If you'd like a copy, just reply to the message it came in.
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
              Private, just for you{w.hello ? `, ${w.hello}` : ""}. Available until {fmtDate(w.expiresAt)}.
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
            {state.kind === "ready" && <PdfPages doc={state.doc} />}
          </div>

          {state.kind === "ready" && <Reply copyId={copyId} sender={w.sender} already={extras.praying} prayer={extras.prayer} />}

          <footer className="mx-auto mt-10 max-w-[34rem] px-6 text-center text-[0.85rem] leading-relaxed" style={{ color: SOFT }}>
            <p className="font-bold" style={{ color: INK }}>
              Private by design
            </p>
            <p className="mt-1">
              This letter was encrypted before it was sent, and only the key in your link opens it, here in your browser. The website never has a copy it can read, and deletes even
              the encrypted one after {fmtDate(w.expiresAt)}. Please don't forward your link: it's just for you.
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const first = sender.split(" ")[0] || sender;

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await api.react(copyId, note.trim());
      setSent(true);
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
              Thank you. {first} will know you're praying.
            </p>
            <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-11 text-sm font-semibold" style={{ color: SOFT }}>
              Add a line
            </button>
          </>
        ) : (
          <>
            <p className="text-lg font-bold" style={{ color: INK, fontFamily: SERIF }}>
              Let {first} know you're praying
            </p>
            <p className="mt-1 text-sm" style={{ color: SOFT }}>
              One tap is enough. It goes to {first} only.
            </p>
            {open && (
              <textarea
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
                disabled={busy}
                className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-[1rem] font-bold text-white disabled:opacity-60"
                style={{ background: INK }}
              >
                <span aria-hidden="true">🙏</span> {busy ? "Sending…" : sent ? "Send the line" : "Praying for you"}
              </button>
              {!open && (
                <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 items-center rounded-full border border-[#ddd5c7] bg-white px-5 text-[0.95rem] font-bold" style={{ color: INK }}>
                  Add a line
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
