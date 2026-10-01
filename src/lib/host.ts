/**
 * Which host a page is being served from, and what that changes.
 *
 * The site is one Vercel project serving two hostnames. www.xerxesduane.com is
 * the business site. ministry.xerxesduane.com serves exactly one page — the
 * ministry page, at its root — because that page is a different thing to a
 * different audience, and handing someone a subdomain is kinder than handing
 * them a path.
 *
 * Both hosts share one filesystem, so the host has to be read at the edge
 * (middleware.ts) and again in the browser. This file is the one place either
 * can get the names from, and it deliberately imports nothing: middleware runs
 * in the edge runtime, where dragging in the site's data modules would be both
 * slow and pointless.
 */

/** The business site. Canonical URLs are built from this. */
export const SITE_HOST = "www.xerxesduane.com";
export const SITE_ORIGIN = `https://${SITE_HOST}`;

/** The same site without the www, which the registrar also answers on. */
export const APEX_HOST = "xerxesduane.com";

/** The ministry page's own host. Serves that page at `/`, nothing else. */
export const MINISTRY_HOST = "ministry.xerxesduane.com";
export const MINISTRY_ORIGIN = `https://${MINISTRY_HOST}`;

/**
 * The hours log's own host (see work.html and api/work/). It shares this
 * project and its database but none of the site's pages.
 */
export const WORK_HOST = "work.xerxesduane.com";
export const WORK_ORIGIN = `https://${WORK_HOST}`;

/** The route a (host, path) pair actually names. */
export function routePath(hostname: string, pathname: string): string {
  if (hostname.toLowerCase() === MINISTRY_HOST && pathname === "/") return "/ministry";
  return pathname;
}

/**
 * True when this code is running in a browser on the ministry host.
 *
 * Safe to call during render: the client entry replaces the prerendered DOM
 * and renders fresh rather than hydrating it (see entry-client.tsx), so a
 * first client render that differs from the static HTML is not a mismatch.
 * On the server it is always false, which is what keeps the prerendered HTML
 * host-agnostic — the same file is served on both hosts and on previews.
 */
export function onMinistryHost(): boolean {
  return typeof window !== "undefined" && window.location.hostname.toLowerCase() === MINISTRY_HOST;
}

/**
 * A link to the business site, as rendered on whichever host we are on.
 *
 * The shell's navigation is shared by every page, ministry included. On the
 * ministry host a bare "/about" would resolve against that host, which serves
 * one page — so site links go absolute there and relative everywhere else.
 * Anchors, mailto: and absolute URLs are returned untouched.
 */
export function siteHref(href: string): string {
  if (!href.startsWith("/")) return href;
  return onMinistryHost() ? `${SITE_ORIGIN}${href}` : href;
}
