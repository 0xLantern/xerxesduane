/**
 * Where this visit came from, remembered for the length of the tab session.
 *
 * Every page here is a full page load, so by the time someone reaches /contact
 * `document.referrer` is usually the site's own previous page. The enquiry
 * email then said "referrer: xerxesduane.com/crm-development-dubai", and the
 * fact that the visitor arrived from Google or ChatGPT was gone. This keeps
 * the *first* page of the visit and its external source, so the form and the
 * WhatsApp message can carry them.
 *
 * Nothing here is sent anywhere by itself. It lives in sessionStorage, is read
 * only when the visitor submits the form or chooses to send a WhatsApp message
 * (which shows them the text first), and is never passed to analytics: GA4 has
 * its own session source and does not need a second copy.
 */

const KEY = "xd-landing";

export interface Landing {
  /** First page of the visit, path + query. */
  page: string;
  /** External referrer host, or "" for none. */
  referrer: string;
  /** Plain-language channel: "Google", "ChatGPT", "direct", ... */
  source: string;
}

/** Hosts worth naming, matched on the end of the referrer's hostname. */
const NAMED: [RegExp, string][] = [
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)gemini\.google\.com$/, "Gemini"],
  [/(^|\.)copilot\.microsoft\.com$/, "Copilot"],
  [/(^|\.)claude\.ai$/, "Claude"],
  [/(^|\.)google\.[a-z.]+$/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\.com$/, "Yahoo"],
  [/(^|\.)ecosia\.org$/, "Ecosia"],
  [/(^|\.)(facebook|fb)\.com$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, "LinkedIn"],
  [/(^|\.)t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, "X"],
];

function classify(referrerHost: string, utmSource: string | null): string {
  // An explicit utm_source wins: ChatGPT appends utm_source=chatgpt.com to
  // links it cites, and campaign links are tagged on purpose.
  if (utmSource) {
    const named = NAMED.find(([re]) => re.test(utmSource.toLowerCase()));
    return named ? named[1] : utmSource.slice(0, 40);
  }
  if (!referrerHost) return "direct";
  const named = NAMED.find(([re]) => re.test(referrerHost));
  return named ? named[1] : referrerHost;
}

function isOwnHost(host: string): boolean {
  return host === window.location.hostname || /(^|\.)xerxesduane\.com$/.test(host);
}

/** Record the landing page and source once per tab session. Safe to call on every load. */
export function captureLanding(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(KEY)) return;
    let host = "";
    try {
      host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
    } catch {
      host = "";
    }
    if (host && isOwnHost(host)) host = "";
    const utm = new URLSearchParams(window.location.search).get("utm_source");
    const landing: Landing = {
      page: (window.location.pathname + window.location.search).slice(0, 200),
      referrer: host,
      source: classify(host, utm),
    };
    sessionStorage.setItem(KEY, JSON.stringify(landing));
  } catch {
    /* storage blocked: the form and WhatsApp simply go without it */
  }
}

/** The recorded landing, if there is one. */
export function getLanding(): Landing | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Landing) : null;
  } catch {
    return null;
  }
}
