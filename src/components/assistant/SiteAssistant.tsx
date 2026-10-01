import { Suspense, lazy, useEffect, useId, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ChatGlyph } from "../ui/NavIcons";
import { assistantConfig, type AssistantVariant } from "../../data/assistant";
import { useAssistantOpen } from "../../lib/assistantStore";

// The chat only exists for visitors who open it, so it ships as its own chunk
// rather than in the bundle every page loads. Suspense sits outside
// AnimatePresence — inside, it would remount on resolve and eat the exit.
const AssistantPanel = lazy(() => import("./AssistantPanel"));

/**
 * The chat launcher in the corner of every page, and the panel it opens.
 *
 * This replaced the floating WhatsApp button. WhatsApp didn't go away — it
 * moved inside, pinned above the composer, where it now arrives with the
 * visitor's question already attached. The trade is deliberate: the old button
 * was one destination, this is a question answered *and* the same destination
 * one tap further on.
 *
 * The launcher stays mounted while the panel is open, faded out and untabbable
 * rather than unmounted, so closing can hand focus straight back to it.
 *
 * On phones and tablets the floating launcher is hidden: the bottom bar's
 * "Ask" slot opens the same panel (the open state is shared through
 * lib/assistantStore), so there is one chat button instead of two orange
 * circles, and nothing floats over the content. Closing then hands focus back
 * to whatever opened it.
 */
export default function SiteAssistant({
  locale = "en",
  variant = "site",
}: {
  locale?: "en" | "ar";
  /** "ministry" on /ministry: its own assistant, grounded in that page only. */
  variant?: AssistantVariant;
}) {
  const { copy } = assistantConfig(variant, locale);
  const [open, setOpen] = useAssistantOpen();
  const fabRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (open && !wasOpen.current) {
      const active = document.activeElement;
      opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
    }
    if (wasOpen.current && !open) {
      // The launcher when it is on screen, otherwise whatever opened the chat
      // (the bottom bar's "Ask" on a phone).
      const fab = fabRef.current;
      const target = fab && fab.offsetParent !== null ? fab : opener.current;
      target?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open]);

  // Close on unmount, so the shared state never outlives the panel.
  useEffect(() => () => setOpen(false), [setOpen]);

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? copy.closeLabel : copy.openLabel}
        title={open ? copy.closeLabel : copy.openLabel}
        tabIndex={open ? -1 : undefined}
        aria-hidden={open || undefined}
        className={`group fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-4 z-40 hidden h-14 w-14 place-items-center rounded-full bg-accent text-accent-ink shadow-card-hover ring-1 ring-white/20 transition duration-300 ease-smooth hover:scale-105 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas lg:bottom-7 lg:end-7 lg:grid ${
          open ? "pointer-events-none scale-90 opacity-0" : ""
        }`}
      >
        {open ? <X size={22} strokeWidth={2.4} aria-hidden /> : <ChatGlyph size={24} />}
      </button>

      <Suspense fallback={null}>
        <AnimatePresence>
          {open && (
            <AssistantPanel
              locale={locale}
              variant={variant}
              onClose={() => setOpen(false)}
              labelledBy={titleId}
            />
          )}
        </AnimatePresence>
      </Suspense>
    </>
  );
}
