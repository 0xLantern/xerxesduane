import { useEffect, useState } from "react";
import { AR_CHROME } from "../data/servicePagesAr";

const STORAGE_KEY = "tw-consent"; // "granted" | "denied"

type GtagFn = (...args: unknown[]) => void;
interface ClarityWindow extends Window {
  gtag?: GtagFn;
  clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  __CLARITY_ID__?: string;
  __clarityLoaded__?: boolean;
}

/** Load Microsoft Clarity on demand (only after consent). */
function loadClarity() {
  const w = window as ClarityWindow;
  const id = w.__CLARITY_ID__;
  if (!id || w.__clarityLoaded__) return;
  w.__clarityLoaded__ = true;
  w.clarity =
    w.clarity ||
    function (...args: unknown[]) {
      (w.clarity!.q = w.clarity!.q || []).push(args);
    };
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.clarity.ms/tag/" + id;
  document.head.appendChild(s);
}

/** Turn analytics on: update Google Consent Mode + start Clarity. */
function grantConsent() {
  const w = window as ClarityWindow;
  w.gtag?.("consent", "update", { analytics_storage: "granted" });
  loadClarity();
}

export default function ConsentBanner({ locale = "en" }: { locale?: "en" | "ar" }) {
  const ar = locale === "ar";
  const [show, setShow] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage blocked — treat as no decision */
    }
    if (saved === "granted") {
      grantConsent();
    } else if (saved !== "denied") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only init; intentional SSR-safe pattern
      setShow(true);
    }
  }, []);

  const decide = (granted: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, granted ? "granted" : "denied");
    } catch {
      /* ignore */
    }
    if (granted) grantConsent();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label={ar ? AR_CHROME.consentAria : "Cookie consent"}
      aria-live="polite"
      className="relative z-20 mx-auto w-full max-w-shell px-4 pb-4 board:pb-2"
    >
      <div className="nav-surface flex flex-col gap-3 rounded-2xl p-3.5 shadow-card-hover sm:flex-row sm:items-center sm:gap-4 sm:p-4 board:gap-3 board:p-2.5">
        <p className="text-xs leading-relaxed text-cream-dim sm:text-sm">
          {ar
            ? AR_CHROME.consentBody
            : "I use anonymous analytics to improve the site. Nothing is shared or sold. See the"}{" "}
          <a href="/privacy" className="inline-block py-1 font-semibold text-gold underline-offset-2 hover:underline">
            {ar ? AR_CHROME.consentPolicy : "Privacy Policy"}
          </a>
          .
        </p>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => decide(false)}
            className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-fg transition-colors hover:border-fg/40"
          >
            {ar ? AR_CHROME.consentDecline : "Decline"}
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            className="rounded-full bg-navy px-5 py-2 text-xs font-semibold text-fg-onSolid transition-colors hover:bg-navy-hover"
          >
            {ar ? AR_CHROME.consentAccept : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
