import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../lib/useTheme";
import { useFinePointer, useReducedMotionPref } from "../../lib/usePrefs";
import { afterPageSettles } from "../../lib/afterPageSettles";

/**
 * A cursor-reactive dot field over the mesh gradient, behind every page.
 *
 * A quiet grid of dots at rest. Near the cursor the dots bulge away from it
 * on springs, so they lag and settle as it moves, and warm from ink to the
 * brand orange. A click sends a ripple out through the grid, and a soft
 * accent glow trails the pointer.
 *
 * Two canvases share one simulation. The resting grid and the glow sit behind
 * the page; any dot the cursor or a ripple has warmed is drawn on a second
 * canvas above the content (z-15: over the cards and the sidebar, under the
 * banners, nav, assistant and overlays, which all sit at z-20 or higher or
 * are portaled), so the effect reads over the cards, not only in the gaps.
 * Nothing interactive may render inside `main` above z-auto expecting to
 * cover it; portal overlays to `document.body` instead.
 *
 * Contrast: the glow is the accent at 10% (light) and 12% (dark), the same
 * peach and ember the mesh gradient already uses, and the dots are small
 * (1.4–2.8px) and sparse, so the text contrast measured for the mesh still
 * holds. Make the dots bolder freely; re-measure before touching the glow.
 *
 * Cost:
 * - Fine pointers only, and nothing at all under reduced motion: there is no
 *   cursor to react to on touch, and the field is pure motion.
 * - Plain canvas 2D, no dependency, started after the page settles.
 * - The loop sleeps as soon as everything is at rest and wakes on the next
 *   pointer event, so an idle page costs nothing. The browser pauses it in
 *   a hidden tab.
 * - Dots are drawn in a handful of batched paths, not one call each.
 */

const SPACING = 30;
/** How far from the cursor the dots feel it, in px. */
const REACH = 220;
/** How far a dot right under the cursor is pushed, in px. */
const PUSH = 24;
/** Spring pulling each dot to its target, and the velocity kept per frame. */
const STIFFNESS = 0.08;
const DAMPING = 0.8;

const RIPPLE_SPEED = 0.6; // px per ms
const RIPPLE_WIDTH = 80;
const RIPPLE_LIFE = 1500; // ms
const RIPPLE_PUSH = 16;

/** Dot radius at rest, and how much it grows at full heat, in px. */
const DOT_RADIUS = 1.4;
const DOT_GROWTH = 1.4;

const GLOW_RADIUS = 380;
const MAX_DPR = 2;
/** Brightness steps a dot can take; each is one batched path. */
const LEVELS = 8;
const START_DELAY_MS = 1000;

type Rgb = [number, number, number];

interface Palette {
  dot: Rgb;
  hot: Rgb;
  restAlpha: number;
  hotAlpha: number;
  glowAlpha: number;
}

function readRgb(name: string): Rgb {
  const parts = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
    .split(/\s+/)
    .map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function readPalette(dark: boolean): Palette {
  return {
    dot: readRgb("--c-fg"),
    hot: readRgb("--c-accent"),
    restAlpha: dark ? 0.2 : 0.22,
    hotAlpha: dark ? 1 : 0.95,
    glowAlpha: dark ? 0.12 : 0.1,
  };
}

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r},${g},${b},${a})`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

interface Ripple {
  x: number;
  y: number;
  born: number;
}

export default function CursorField() {
  const fine = useFinePointer();
  const reduced = useReducedMotionPref();
  const enabled = fine && !reduced;
  const { theme } = useTheme();

  const baseRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef<Palette | null>(null);
  const wakeRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    return afterPageSettles(() => {
      setReady(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    }, START_DELAY_MS);
  }, [enabled]);

  // Re-read the tokens whenever the theme flips, then redraw.
  useEffect(() => {
    paletteRef.current = readPalette(theme === "dark");
    wakeRef.current();
  }, [theme]);

  useEffect(() => {
    const base = baseRef.current;
    const top = topRef.current;
    if (!enabled || !ready || !base || !top) return;
    const ctx = base.getContext("2d");
    const topCtx = top.getContext("2d");
    if (!ctx || !topCtx) return;

    let width = 0;
    let height = 0;
    let count = 0;
    let restX = new Float32Array(0);
    let restY = new Float32Array(0);
    let offX = new Float32Array(0);
    let offY = new Float32Array(0);
    let velX = new Float32Array(0);
    let velY = new Float32Array(0);
    let heat = new Float32Array(0);

    // Pointer, the glow's eased position, and how present the pointer is
    // (fades the influence in and out as it enters and leaves the window).
    let px = -9999;
    let py = -9999;
    let glowX = px;
    let glowY = py;
    let inside = false;
    let presence = 0;
    const ripples: Ripple[] = [];

    let raf = 0;
    let last = 0;

    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = window.innerWidth;
      height = window.innerHeight;
      for (const [canvas, context] of [
        [base, ctx],
        [top, topCtx],
      ] as const) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;
      const x0 = (width - (cols - 1) * SPACING) / 2;
      const y0 = (height - (rows - 1) * SPACING) / 2;
      count = cols * rows;
      restX = new Float32Array(count);
      restY = new Float32Array(count);
      offX = new Float32Array(count);
      offY = new Float32Array(count);
      velX = new Float32Array(count);
      velY = new Float32Array(count);
      heat = new Float32Array(count);
      for (let r = 0, i = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++, i++) {
          restX[i] = x0 + c * SPACING;
          restY[i] = y0 + r * SPACING;
        }
      }
    };

    const frame = (now: number) => {
      raf = 0;
      const palette = paletteRef.current;
      if (!palette) return;
      const dt = last ? Math.min(now - last, 48) / 16.67 : 1;
      last = now;

      presence += ((inside ? 1 : 0) - presence) * Math.min(1, 0.08 * dt);
      if (presence < 0.002 && !inside) presence = 0;
      // Snap the glow on first entry instead of sweeping in from off-screen.
      if (glowX < -1000) {
        glowX = px;
        glowY = py;
      }
      glowX += (px - glowX) * Math.min(1, 0.14 * dt);
      glowY += (py - glowY) * Math.min(1, 0.14 * dt);

      for (let i = ripples.length - 1; i >= 0; i--) {
        if (now - ripples[i].born > RIPPLE_LIFE) ripples.splice(i, 1);
      }

      ctx.clearRect(0, 0, width, height);
      topCtx.clearRect(0, 0, width, height);

      if (presence > 0.01) {
        const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, GLOW_RADIUS);
        glow.addColorStop(0, rgba(palette.hot, palette.glowAlpha * presence));
        glow.addColorStop(1, rgba(palette.hot, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(glowX - GLOW_RADIUS, glowY - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
      }

      const paths: Path2D[] = [];
      for (let l = 0; l <= LEVELS; l++) paths.push(new Path2D());
      const radii: number[] = [];
      for (let l = 0; l <= LEVELS; l++) radii.push(DOT_RADIUS + (l / LEVELS) * DOT_GROWTH);

      const reach2 = REACH * REACH;
      let energy = 0;

      for (let i = 0; i < count; i++) {
        const rx = restX[i];
        const ry = restY[i];
        let tx = 0;
        let ty = 0;
        let target = 0;

        if (presence > 0) {
          const dx = rx - px;
          const dy = ry - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < reach2) {
            const d = Math.sqrt(d2) || 1;
            const f = 1 - d / REACH;
            const e = f * f * presence;
            tx += (dx / d) * PUSH * e;
            ty += (dy / d) * PUSH * e;
            target = e;
          }
        }

        for (let k = 0; k < ripples.length; k++) {
          const rp = ripples[k];
          const age = now - rp.born;
          const dx = rx - rp.x;
          const dy = ry - rp.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const front = Math.abs(d - age * RIPPLE_SPEED);
          if (front < RIPPLE_WIDTH) {
            const k2 = (1 - front / RIPPLE_WIDTH) * (1 - age / RIPPLE_LIFE);
            tx += (dx / d) * RIPPLE_PUSH * k2;
            ty += (dy / d) * RIPPLE_PUSH * k2;
            if (k2 > target) target = k2;
          }
        }

        velX[i] = (velX[i] + (tx - offX[i]) * STIFFNESS * dt) * DAMPING;
        velY[i] = (velY[i] + (ty - offY[i]) * STIFFNESS * dt) * DAMPING;
        offX[i] += velX[i] * dt;
        offY[i] += velY[i] * dt;
        heat[i] += (target - heat[i]) * Math.min(1, 0.2 * dt);

        energy += Math.abs(velX[i]) + Math.abs(velY[i]) + Math.abs(target - heat[i]);

        const level = Math.min(LEVELS, Math.round(heat[i] * LEVELS));
        const r = radii[level];
        const x = rx + offX[i];
        const y = ry + offY[i];
        paths[level].moveTo(x + r, y);
        paths[level].arc(x, y, r, 0, Math.PI * 2);
      }

      // Resting dots stay behind the page; warmed ones go over the content.
      for (let l = 0; l <= LEVELS; l++) {
        const t = l / LEVELS;
        const layer = l === 0 ? ctx : topCtx;
        layer.fillStyle = rgba(
          mix(palette.dot, palette.hot, Math.min(1, t * 1.6)),
          palette.restAlpha + (palette.hotAlpha - palette.restAlpha) * t,
        );
        layer.fill(paths[l]);
      }

      const settling =
        energy > 0.05 ||
        ripples.length > 0 ||
        Math.abs(glowX - px) + Math.abs(glowY - py) > 0.5 ||
        (inside ? presence < 0.995 : presence > 0);
      if (settling) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      px = e.clientX;
      py = e.clientY;
      inside = true;
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      ripples.push({ x: e.clientX, y: e.clientY, born: performance.now() });
      if (ripples.length > 4) ripples.shift();
      wake();
    };
    const onLeave = () => {
      inside = false;
      wake();
    };
    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        layout();
        wake();
      });
    };

    layout();
    wake();

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      wakeRef.current = () => {};
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled, ready]);

  if (!enabled || !ready) return null;

  const fade = `pointer-events-none fixed inset-0 h-full w-full transition-opacity duration-[1200ms] ease-out ${
    shown ? "opacity-100" : "opacity-0"
  }`;
  return (
    <>
      <canvas ref={baseRef} aria-hidden className={`${fade} -z-10`} />
      <canvas ref={topRef} aria-hidden className={`${fade} z-[15]`} />
    </>
  );
}
