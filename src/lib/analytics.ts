// Thin wrapper around gtag (loaded in index.html). No-ops if gtag is absent.
declare global {
  interface Window {
    gtag?: (command: string, event: string, params?: Record<string, unknown>) => void;
  }
}

export function track(event: string, params: Record<string, unknown> = {}): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}

/**
 * Delegated click tracking for conversion intents, so we don't have to wire an
 * onClick into every CTA.
 *
 * The audit branch used to test `href.includes("#contact")`. That was right
 * while the form lived in a section on every page; once it was de-duplicated
 * onto /contact and those anchors became plain `/contact` links, the test
 * stopped matching and the primary conversion event stopped firing entirely.
 * Matching the destination rather than a fragment is what makes it survive
 * that kind of move.
 *
 * Nothing here reads a form field, an input value or any text the visitor
 * typed. `label` is the CTA's own wording, which is ours, not theirs.
 */
export function initCtaTracking(): void {
  if (typeof document === "undefined") return;
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href") ?? "";
    const label = (anchor.textContent ?? "").trim().slice(0, 80);
    const where = window.location.pathname;
    // Which CTA on the page, when the markup says so.
    const slot = anchor.getAttribute("data-cta") ?? undefined;

    if (href.includes("wa.me")) {
      track("whatsapp_click", { location: where, label, cta_slot: slot });
    } else if (href.includes("zcal.co")) {
      track("calendar_click", { location: where, label, cta_slot: slot });
    } else if (href.startsWith("mailto:")) {
      track("email_click", { location: where, label, cta_slot: slot });
    } else if (href === "/contact" || href.startsWith("/contact?") || href.includes("#contact")) {
      track("cta_book_audit", { location: where, label, cta_slot: slot });
    }
  });
}
