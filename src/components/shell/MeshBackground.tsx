import { Component, lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTheme } from "../../lib/useTheme";
import { useReducedMotionPref } from "../../lib/usePrefs";
import { afterPageSettles } from "../../lib/afterPageSettles";

/**
 * A slow, brand-coloured mesh gradient behind every page (Paper Shaders).
 *
 * The palettes are not decorative guesses. The first version only used tints
 * lighter than the canvas (fg-faint was 4.71:1 on it, no headroom) and was too
 * faint to notice. fg-faint was darkened to 80 95 121 (5.8:1 on the canvas) to
 * make room for real blue and peach. Every colour and blend keeps fg-faint,
 * fg-soft and the accent eyebrow at 4.5:1 or better in both themes. Change a
 * colour and re-measure on rendered frames before shipping it.
 *
 * Cost is kept off the critical path:
 * - Nothing renders on the server, so the prerendered HTML is untouched. The
 *   shader chunk is fetched two seconds after `load`, once the page is idle,
 *   so it never competes with the page's own first paint (see START_DELAY_MS).
 * - It fades in, so it never pops.
 * - Paper pauses the render loop when the tab is hidden.
 * - Pixels are capped: the gradient is soft, so rendering it at a fraction of
 *   a high-DPI phone's resolution is invisible and saves the GPU.
 * - Reduced motion gets a still frame; Save-Data and browsers without WebGL2
 *   get the plain canvas colour, which is what the page had before.
 */

/**
 * A failed chunk (offline, an ad blocker, a stale deploy) must not take the
 * page down with it: an unhandled rejection from `lazy` unmounts the whole
 * app. It resolves to nothing instead, and the plain canvas shows through.
 */
const MeshGradient = lazy(() =>
  import("@paper-design/shaders-react")
    .then((m) => ({ default: m.MeshGradient }))
    .catch(() => ({ default: () => null })),
);

/** Contains anything else the shader throws while rendering. */
class Contained extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const PALETTES = {
  light: ["#f5f3ec", "#ffffff", "#d9e6f8", "#fbdcc4", "#e4ecf9"],
  dark: ["#0c1526", "#172f5a", "#3a2418", "#12223f"],
} as const;

/** About 1000×600. The gradient is a blur, so upscaling it is invisible. */
const MAX_PIXELS = 600_000;

/**
 * How long after `load` to wait before starting. Measured: starting at idle
 * straight after `load` competed with the page's own image paints and pushed
 * LCP on /ministry from ~0.55s to ~1s. Two seconds clears it.
 */
const START_DELAY_MS = 2000;

function canRender(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

export default function MeshBackground() {
  const { theme } = useTheme();
  const reduced = useReducedMotionPref();
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!canRender()) return;
    const start = () => {
      setReady(true);
      // Let the canvas draw its first frame before fading it in.
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    };
    return afterPageSettles(start, START_DELAY_MS);
  }, []);

  if (!ready) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-20 transition-opacity duration-[1200ms] ease-out ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <Contained>
        <Suspense fallback={null}>
          <MeshGradient
            colors={[...PALETTES[theme]]}
            distortion={0.8}
            swirl={0.12}
            speed={reduced ? 0 : 0.35}
            frame={reduced ? 12_000 : 0}
            minPixelRatio={1}
            maxPixelCount={MAX_PIXELS}
            style={{ width: "100%", height: "100%" }}
          />
        </Suspense>
      </Contained>
    </div>
  );
}
