// Grounding for the ministry assistant (/api/ministry-assistant).
//
// Reads exactly one page, /ministry, and only the page's own content: the
// story, the talks, the projects and the ways to partner, without the business
// shell (nav, pricing links, consent banner) around it. That content is about
// 17,000 characters of text, so the whole of it fits in context and there is
// nothing to retrieve or rank.
//
// The separation runs both ways. This loader never reads a business page, and
// the business assistant never reads this one (/ministry is not in
// _siteContext's ROUTES), so neither bot can answer from the other's material.
import { htmlToText, isFetchableUrl } from "./_fetchUrl";

const PATH = "/ministry";
/** A little over the page's main text, so an edit that grows it isn't cut. */
const BUDGET = 24_000;

// Static per deployment, so a short in-isolate cache makes a conversation one
// fetch rather than one per turn. A miss costs a fetch, never an error.
const TTL_MS = 15 * 60_000;
let cache: { origin: string; text: string; at: number } | null = null;

/**
 * The page's own content, without the shell around it.
 *
 * The prerender streams each route through a Suspense boundary, so in the
 * static HTML `<main>` holds only a placeholder; the page itself arrives
 * further down as `<div hidden id="S:0">…</div>`, followed by the script that
 * swaps it into place. Falls back to `<main>`, then the whole document, if
 * that ever changes.
 */
function pageContent(html: string): string {
  const start = html.indexOf('<div hidden id="S:0">');
  if (start !== -1) {
    const end = html.indexOf("<script", start);
    return html.slice(start, end === -1 ? undefined : end);
  }
  return /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? html;
}

/** Same site, allowing for the apex/www split (the apex 308s to www). */
function sameSite(a: URL, b: URL): boolean {
  const bare = (u: URL) => u.hostname.replace(/^www\./, "");
  return bare(a) === bare(b);
}

/**
 * Fetch the page's HTML, following redirects by hand and only within this
 * site. `redirect: "error"` is not something every edge runtime supports, and
 * the request can arrive on the apex host, whose first answer is a 308.
 */
async function fetchPageHtml(start: URL, signal: AbortSignal): Promise<string | null> {
  let url = start;
  for (let hop = 0; hop < 3; hop++) {
    const res = await fetch(url.toString(), {
      signal,
      redirect: "manual",
      headers: { "user-agent": "XerxesDuaneMinistryAssistant/1.0" },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      const next = location ? isFetchableUrl(new URL(location, url).toString()) : null;
      if (!next || !sameSite(next, start)) return null;
      url = next;
      continue;
    }
    return res.ok ? await res.text() : null;
  }
  return null;
}

export async function buildMinistryContext(origin: string): Promise<string> {
  if (cache && cache.origin === origin && Date.now() - cache.at < TTL_MS) return cache.text;

  const url = isFetchableUrl(`${origin}${PATH}`);
  if (!url) return "";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const html = await fetchPageHtml(url, ctrl.signal);
    if (!html) {
      console.warn("[ministry-assistant] /ministry did not load");
      return "";
    }
    let text = htmlToText(pageContent(html));
    // If the page's markup ever changes shape and the block above comes back
    // empty, the whole document still beats answering from nothing.
    if (text.length < 500) text = htmlToText(html);
    text = text.slice(0, BUDGET);
    if (text) cache = { origin, text, at: Date.now() };
    return text;
  } catch (err) {
    // The endpoint answers without the page and says so, rather than failing.
    console.warn("[ministry-assistant] /ministry fetch failed", err instanceof Error ? err.message : err);
    return "";
  } finally {
    clearTimeout(timer);
  }
}
