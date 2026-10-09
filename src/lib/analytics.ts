// Thin wrapper around gtag (loaded in index.html). No-ops if gtag is absent.
import { getLanding } from "./attribution";
import { onMinistryHost } from "./host";
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
 * A bare wa.me link opens an empty chat, so a WhatsApp enquiry arrived with no
 * clue which page it started on or how the visitor found the site, and could
 * not be matched to anything in analytics. This fills in a short opening line
 * and a reference before the chat opens. The visitor sees the text and can
 * edit or delete it before sending; nothing is sent until they press send.
 *
 * Links that already carry their own `text` (the contact form, the assistant,
 * the case-study and Arabic CTAs) are left exactly as written. The ministry
 * pages are left alone too: those conversations are not business enquiries.
 */
function withEnquiryContext(anchor: HTMLAnchorElement): void {
  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return;
  }
  if (url.hostname !== "wa.me" || url.searchParams.has("text")) return;
  if (onMinistryHost() || /^\/(ministry|hack)(\/|$)/.test(window.location.pathname)) return;

  const landing = getLanding();
  const ref = [
    `page ${window.location.pathname}`,
    landing && landing.source !== "direct" ? `via ${landing.source}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const text = `Hi Xerxes, I'm getting in touch from your website about my business.\n\n(Ref: ${ref})`;
  // encodeURIComponent, as every other wa.me link on the site is built, rather
  // than URLSearchParams, which writes spaces as "+".
  anchor.href = `https://wa.me${url.pathname}?text=${encodeURIComponent(text)}`;
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
      // A tap that opens WhatsApp, not an enquiry: nothing is known to have
      // been sent. Report it as intent and count enquiries from the inbox.
      track("whatsapp_click", { location: where, label, cta_slot: slot });
      withEnquiryContext(anchor);
    } else if (href.includes("zcal.co")) {
      track("calendar_click", { location: where, label, cta_slot: slot });
    } else if (href.startsWith("mailto:")) {
      track("email_click", { location: where, label, cta_slot: slot });
    } else if (href === "/contact" || href.startsWith("/contact?") || href.includes("#contact")) {
      track("cta_book_audit", { location: where, label, cta_slot: slot });
    } else if (/\/cv\/[^/]+\.pdf$/.test(href)) {
      track("cv_download", { location: where, label, cta_slot: slot });
    } else if (/\/cv\/freelance\/?$/.test(href)) {
      track("cv_view", { location: where, label, cta_slot: slot });
    }
  });
}
