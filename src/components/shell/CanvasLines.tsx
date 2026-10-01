import type { CSSProperties } from "react";

/** Long sweeps that read as one continuous system across the page. */
const SWEEPS = [
  "M -180 720 C 180 700, 300 420, 520 300 S 980 120, 1320 -60",
  "M -140 900 C 260 840, 420 540, 700 420 S 1180 260, 1560 140",
  "M 240 -80 C 300 220, 520 360, 760 420 S 1180 560, 1420 900",
];

/** Wide arcs, echoing the ring around the portrait. */
const ARCS = [
  { cx: 180, cy: 130, r: 230 },
  { cx: 1290, cy: 760, r: 330 },
  { cx: 880, cy: 200, r: 150 },
];

/** Per-line timing, staggered so the sparks never move in step. */
const SWEEP_TIMING = [
  { animationDuration: "11s", animationDelay: "-2s" },
  { animationDuration: "15s", animationDelay: "-9s" },
  { animationDuration: "13s", animationDelay: "-5s" },
] satisfies CSSProperties[];
const ARC_TIMING = [
  { animationDuration: "26s", animationDelay: "-4s" },
  { animationDuration: "34s", animationDelay: "-20s", animationDirection: "reverse" },
  { animationDuration: "20s", animationDelay: "-11s" },
] satisfies CSSProperties[];

/**
 * Thin, low-contrast curved lines behind the page, in slow motion.
 *
 * The whole drawing drifts a few pixels back and forth (a transform on the
 * <svg>, so it runs on the compositor), and small orange sparks travel along
 * the sweeps and orbit the arcs. Sparks use a dash on a path normalised to
 * `pathLength="1"`, so one keyframe fits every line whatever its length; the
 * sweep dash spends most of each cycle off the end of the path, which is the
 * pause between sparks.
 *
 * Pure inline SVG (no image request), fixed and non-interactive, drawn in the
 * foreground colour at very low alpha so it holds up in both themes without a
 * second asset. Under reduced motion the drift ends at rest and the sparks
 * are hidden. Purely decorative, so it is hidden from assistive tech.
 */
export default function CanvasLines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Oversized by 4% a side so the drift never exposes an edge. */}
      <svg
        className="canvas-lines absolute -inset-[4%] h-[108%] w-[108%]"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <g className="text-fg/[0.07]" stroke="currentColor" strokeWidth="1" fill="none">
          {SWEEPS.map((d) => (
            <path key={d} d={d} />
          ))}
          {ARCS.map((c) => (
            <circle key={c.cx} cx={c.cx} cy={c.cy} r={c.r} />
          ))}
        </g>
        <g
          className="text-accent/60 motion-reduce:hidden"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        >
          {SWEEPS.map((d, i) => (
            <path
              key={d}
              d={d}
              pathLength={1}
              className="canvas-lines-spark"
              style={SWEEP_TIMING[i]}
            />
          ))}
          {ARCS.map((c, i) => (
            <circle
              key={c.cx}
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              pathLength={1}
              className="canvas-lines-orbit"
              style={ARC_TIMING[i]}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
