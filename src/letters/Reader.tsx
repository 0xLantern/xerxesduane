/**
 * A partner's private copy. The key arrives in the link's # fragment, which
 * the browser never sends to the server. It is taken out of the address bar
 * at once (so it isn't left on screen or in a copied URL) and kept for this
 * tab only, so a reload still works.
 */
import { useEffect, useState } from "react";
import LetterView, { INK, SOFT } from "./LetterView";
import { decrypt, fromB64url, importKey, type Letter } from "./shared";

type State = { kind: "loading" } | { kind: "gone"; message: string } | { kind: "ready"; letter: Letter };

export default function Reader({ copyId }: { copyId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [photos, setPhotos] = useState<Record<string, string>>({});

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

    (async () => {
      if (!/^[A-Za-z0-9_-]{40,50}$/.test(raw)) {
        setState({ kind: "gone", message: "This link isn't complete. Please open it straight from the email, without changing it." });
        return;
      }
      const res = await fetch(`/api/letters/read?c=${copyId}`).catch(() => null);
      if (!res || !res.ok) {
        setState({
          kind: "gone",
          message: res?.status === 404 ? "This letter has expired or was withdrawn." : "The letter couldn't be loaded. Please check your connection and try again.",
        });
        return;
      }
      const { ct } = (await res.json()) as { ct: string };
      let letter: Letter;
      try {
        const key = await importKey(raw);
        letter = JSON.parse(new TextDecoder().decode(await decrypt(fromB64url(ct), key))) as Letter;
      } catch {
        setState({ kind: "gone", message: "This link doesn't open this letter. Please open it straight from the email." });
        return;
      }
      if (cancelled) return;
      setState({ kind: "ready", letter });

      // Photos: each is encrypted once for the whole send; its key is inside the letter.
      if (letter.imageKey && letter.sendId && letter.images.length) {
        const ikey = await importKey(letter.imageKey);
        for (const im of letter.images) {
          const r = await fetch(`/api/letters/read?c=${copyId}&s=${letter.sendId}&i=${im.id}`).catch(() => null);
          if (!r?.ok) continue;
          const { ct: ict } = (await r.json()) as { ct: string };
          const bytes = await decrypt(fromB64url(ict), ikey).catch(() => null);
          if (!bytes || cancelled) continue;
          const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/jpeg" }));
          setPhotos((p) => ({ ...p, [im.id]: url }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copyId]);

  return (
    <main className="min-h-screen px-5 pb-20 pt-[max(2.5rem,env(safe-area-inset-top))]" style={{ background: "#f6f3ee" }}>
      {state.kind === "loading" && <p className="py-32 text-center" style={{ color: SOFT }}>Opening your letter…</p>}
      {state.kind === "gone" && (
        <div className="mx-auto mt-24 max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold" style={{ color: INK }}>
            {state.message}
          </p>
          <p className="mt-3 text-sm" style={{ color: SOFT }}>
            Letters are private and are removed after 30 days. If you'd like a copy, just reply to the email it came in.
          </p>
        </div>
      )}
      {state.kind === "ready" && <LetterView letter={state.letter} photo={(id) => photos[id]} />}
    </main>
  );
}
