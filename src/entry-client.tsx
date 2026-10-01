import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "./index.css";
import App from "./App";
import { initCtaTracking } from "./lib/analytics";
import { routePath } from "./lib/host";

initCtaTracking();

// Disarm the pre-hydration reveal fallback (see the inline <style> in
// index.html): once the bundle is executing, framer-motion owns the reveals.
document.documentElement.classList.add("js-ready");

const container = document.getElementById("root")!;
const tree = (
  <StrictMode>
    {/* The host is part of the address: ministry.xerxesduane.com serves the
        ministry page at "/", so the path alone would render the home page
        over it. See lib/host.ts and middleware.ts. */}
    <App path={routePath(window.location.hostname, window.location.pathname)} />
  </StrictMode>
);

// The build serves fully prerendered HTML for crawlers and the first paint.
// Framer Motion's client-only state differs from its static markup, so replace
// the snapshot cleanly rather than producing a recoverable hydration error.
container.replaceChildren();
createRoot(container).render(tree);

/**
 * Re-run the browser's scroll-to-fragment.
 *
 * Because the prerendered DOM is replaced, watch for the target to reappear
 * (routes are lazy chunks, so it is not
 * there on the first frame), scroll to it, then correct once more after
 * `load` in case images changed the layout underneath it. `scrollIntoView`
 * respects each section's `scroll-margin-top`, so the offset matches what an
 * in-page link produces. Any real scroll from the visitor cancels the whole
 * thing — they have said where they want to be.
 */
function scrollToHashTarget() {
  if (window.location.hash.length < 2) return;

  let id: string;
  try {
    id = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }

  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", cancel);
  };
  window.addEventListener("wheel", cancel, { passive: true, once: true });
  window.addEventListener("touchstart", cancel, { passive: true, once: true });
  window.addEventListener("keydown", cancel, { once: true });

  const deadline = performance.now() + 4000;
  const settle = (el: Element) => {
    el.scrollIntoView({ block: "start", behavior: "auto" });
  };

  const tick = () => {
    if (cancelled) return;
    const el = document.getElementById(id);
    if (el) {
      settle(el);
      window.addEventListener(
        "load",
        () => {
          if (!cancelled) {
            const again = document.getElementById(id);
            if (again) settle(again);
          }
          cancel();
        },
        { once: true },
      );
      return;
    }
    if (performance.now() < deadline) requestAnimationFrame(tick);
    else cancel();
  };
  requestAnimationFrame(tick);
}

scrollToHashTarget();

const speedInsightsRoot = document.createElement("div");
speedInsightsRoot.id = "speed-insights-root";
document.body.appendChild(speedInsightsRoot);
createRoot(speedInsightsRoot).render(<SpeedInsights />);
