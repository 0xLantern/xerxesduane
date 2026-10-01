import { next, rewrite } from "@vercel/functions";
// The .js extension is required: Vercel typechecks this file with node16
// module resolution, where an extensionless relative import is an error.
// tsconfig.middleware.json mirrors that, so the local build catches it too.
import { APEX_HOST, MINISTRY_HOST, MINISTRY_ORIGIN, SITE_HOST, WORK_HOST, WORK_ORIGIN } from "./src/lib/host.js";

/**
 * Host routing for the three domains this one project serves.
 *
 * ministry.xerxesduane.com is the ministry page and nothing else. The build
 * still writes that page to /ministry, because the prerenderer works in paths
 * and there is only one filesystem, so the subdomain's root is rewritten onto
 * it. A rewrite rather than a redirect: the visitor's URL stays at the root,
 * which is the whole point of giving the page a host.
 *
 * WHY MIDDLEWARE AND NOT vercel.json. `rewrites` there are only consulted
 * after the filesystem is checked, which is what makes the usual SPA fallback
 * safe. "/" is a real prerendered file, so a rewrite on it would never fire.
 * Middleware runs before the filesystem, so it is the only thing that can
 * serve a different page for the same path on a different host.
 *
 * The matcher keeps this to three paths. Every other request — every asset,
 * every other route, on either host — is untouched and never reaches here.
 */
export const config = {
  matcher: ["/", "/ministry", "/robots.txt", "/work", "/r/:path*", "/gcn"],
  // The edge runtime is deprecated for middleware; the build warns on it.
  // Nothing here needs an edge-only API — it reads a header and returns.
  runtime: "nodejs",
};

export default function middleware(request: Request): Response {
  const url = new URL(request.url);
  // Host carries the port on localhost, and case is not significant in DNS.
  const host = (request.headers.get("host") ?? url.host).toLowerCase().split(":")[0];

  if (host === MINISTRY_HOST) {
    // The page itself, served at the root.
    if (url.pathname === "/") return rewrite(new URL("/ministry", url));

    // robots.txt is per-host, and the rules differ: on the business site the
    // AI crawlers are turned away from /ministry, here from everything.
    if (url.pathname === "/robots.txt") return rewrite(new URL("/robots-ministry.txt", url));

    // Anyone who kept the old path and swapped only the host.
    if (url.pathname === "/ministry") return Response.redirect(new URL("/", url), 308);
  }

  // work.xerxesduane.com is the hours log: work.html at the root and at each
  // client link, /r/<token>. Rewrites, so the address bar keeps the clean URL.
  // Paths outside the matcher (assets, fonts, /api) pass straight through.
  if (host === WORK_HOST) {
    if (url.pathname === "/" || url.pathname.startsWith("/r/") || url.pathname === "/gcn") {
      return rewrite(new URL("/work", url));
    }
    if (url.pathname === "/robots.txt") return rewrite(new URL("/robots-work.txt", url));
    if (url.pathname === "/work") return Response.redirect(new URL("/", url), 308);
    return next();
  }

  // The log has no business on the business site. On previews and localhost
  // it stays reachable at /work and /r/<token>, so it can be tried before release.
  if (host === SITE_HOST || host === APEX_HOST || host === MINISTRY_HOST) {
    if (url.pathname === "/work") return Response.redirect(`${WORK_ORIGIN}/`, 308);
  } else if (url.pathname.startsWith("/r/") || url.pathname === "/gcn") {
    return rewrite(new URL("/work", url));
  }

  // The move itself. Scoped to the live hostnames on purpose: preview
  // deployments and localhost have no ministry subdomain, so /ministry has to
  // keep working there or the page could never be reviewed before release.
  if ((host === SITE_HOST || host === APEX_HOST) && url.pathname === "/ministry") {
    return Response.redirect(`${MINISTRY_ORIGIN}/`, 308);
  }

  return next();
}
