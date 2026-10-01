/// <reference types="node" />
import { renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import App from "./App";
import { buildHeadTags } from "./lib/seo";

export { allRoutes, routeLastmod, isIndexable } from "./lib/seo";

/**
 * Called by scripts/prerender.mjs for each route at build time.
 *
 * Uses the streaming renderer with `onAllReady`, which waits for every
 * Suspense / React.lazy boundary to resolve before we capture the HTML. That
 * keeps the prerendered output complete (full content for crawlers and social
 * scrapers) even though the routes are code-split — the browser only downloads
 * the JS chunk for the route it's actually on.
 */
export function render(path: string): Promise<{ html: string; head: string }> {
  return new Promise((resolvePromise, reject) => {
    let html = "";
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        html += chunk.toString();
        callback();
      },
      final(callback) {
        callback();
      },
    });
    writable.on("finish", () =>
      resolvePromise({ html, head: buildHeadTags(path) }),
    );
    writable.on("error", reject);

    const { pipe } = renderToPipeableStream(<App path={path} />, {
      onAllReady() {
        pipe(writable);
      },
      onError(error) {
        reject(error);
      },
    });
  });
}
