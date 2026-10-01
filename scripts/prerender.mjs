// Prerenders every route to a static HTML file in dist/ so crawlers and
// social scrapers receive the full, rendered page instead of an empty shell.
// Also emits a 404.html and a freshly-dated sitemap.xml.
// Runs after `vite build` (client) and `vite build --ssr` (server bundle).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const SITE_ORIGIN = "https://www.xerxesduane.com";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const distDir = join(root, "dist");
const serverEntry = join(root, ".ssr-dist", "entry-server.js");

const { render, allRoutes, routeLastmod, isIndexable } = await import(pathToFileURL(serverEntry).href);

const template = await readFile(join(distDir, "index.html"), "utf-8");

if (!template.includes("<!--app-html-->")) {
  throw new Error("Template is missing the <!--app-html--> placeholder.");
}

const routes = allRoutes();
for (const route of routes) {
  const { html, head } = await render(route);
  let page = template
    .replace("<!--app-head-->", head)
    .replace("<!--app-html-->", html);

  // Arabic routes render right-to-left in Arabic.
  if (route === "/ar" || route.startsWith("/ar/")) {
    page = page.replace('<html lang="en">', '<html lang="ar" dir="rtl">');
  }

  const outPath =
    route === "/"
      ? join(distDir, "index.html")
      : join(distDir, route, "index.html");

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, page, "utf-8");
  console.log(`  prerendered  ${route}  ->  ${outPath.replace(root, ".")}`);
}

// 404 page (Vercel serves /404.html for unmatched routes, with a 404 status).
const notFound = await render("/__not-found__");
const notFoundPage = template
  .replace("<!--app-head-->", notFound.head)
  .replace("<!--app-html-->", notFound.html);
await writeFile(join(distDir, "404.html"), notFoundPage, "utf-8");
console.log("  prerendered  404  ->  ./dist/404.html");

// Sitemap.
//
// `lastmod` used to be the build date on every route that wasn't an article,
// so 36 of 47 URLs claimed to have changed every time the site was deployed —
// which teaches a crawler to ignore the field. It is the date of the last
// commit that touched the content behind the route instead, so it moves when
// the page's words move and not when a stylesheet does.
const today = new Date().toISOString().slice(0, 10);

/** Last commit date (YYYY-MM-DD) touching any of these paths, or null. */
function lastCommitDate(paths) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...paths], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    // No git history (a shallow CI clone, a tarball). Fall back to the build
    // date rather than emitting nothing.
    return null;
  }
}

/** The content file behind a route, for dating it. */
function sourcesFor(route) {
  const slug = route.replace(/^\/+|\/+$/g, "");
  if (slug === "pricing" || slug === "starter") return ["src/data/pricing.ts"];
  if (slug === "ar" || slug.startsWith("ar/")) return ["src/data/servicePagesAr.ts"];
  if (slug === "case-studies" || slug.startsWith("case-studies/")) return ["src/data/content.ts"];
  if (slug === "insights" || slug.startsWith("insights/")) return ["src/data/insights.ts"];
  if (slug === "ai-lab") return ["src/data/aiLab.ts"];
  if (slug === "portfolio" || slug === "showreel" || slug === "projects") {
    return ["src/data/workItems.ts", "src/data/videos.ts"];
  }
  if (slug === "") return ["src/data/homeBento.ts", "src/data/content.ts"];
  // Service pages and the rest of the site's copy.
  return ["src/data/servicePages.ts", "src/data/content.ts"];
}

const dateCache = new Map();
function contentDate(route) {
  const key = sourcesFor(route).join("|");
  if (!dateCache.has(key)) dateCache.set(key, lastCommitDate(sourcesFor(route)) ?? today);
  return dateCache.get(key);
}
// Unlisted and noindex routes are prerendered but never advertised.
const indexableRoutes = routes.filter(isIndexable);
const urls = indexableRoutes
  .map((route) => {
    const loc = route === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${route}`;
    const priority = route === "/" ? "1.0" : "0.8";
    const lastmod = routeLastmod(route, contentDate(route));
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  })
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
await writeFile(join(distDir, "sitemap.xml"), sitemap, "utf-8");
console.log(`  generated    sitemap.xml (${indexableRoutes.length} urls, newest lastmod ${[...new Set(indexableRoutes.map(contentDate))].sort().pop()})`);

console.log(`\nPrerendered ${routes.length} route(s) + 404.`);
