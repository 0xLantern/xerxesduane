import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Marquee } from "../vendor/Marquee";
import { TOOLS, type Tool } from "../../data/homeBento";
import { useReducedMotionPref } from "../../lib/usePrefs";

/** Mark height. Width follows from the mark's own shape. */
const MARK = 18;

/**
 * A wordmark stands alone, with no label beside it, so it is set against the
 * row's type rather than against the symbols: 20px puts "odoo"'s x-height at
 * roughly the cap height of the 15.2px labels beside it.
 */
const WORDMARK = 20;

/**
 * One brand mark, set to a common height rather than a common box.
 *
 * Sizing by height is what keeps the row level: the marks are cropped to their
 * ink (see build-tool-logos.mjs), and Odoo and Zoho only publish wordmarks, so
 * a shared square would have set those two three times smaller than everything
 * beside them. They come out wider instead, which is how a wordmark is meant
 * to be set.
 *
 * The colour rides on a custom property rather than a `fill`, so the dark
 * theme can swap it: a handful of these marks are black or near-black and
 * would otherwise vanish on the dark canvas — the generator works out the
 * replacement from real contrast against that canvas.
 *
 * `aria-hidden` throughout: for a symbol the tool's name sits right beside it
 * in text, and for a wordmark the caller carries the name in an `sr-only`
 * span, so in both cases the mark itself is decoration.
 */
function ToolMark({ tool }: { tool: Tool }) {
  const height = tool.wordmark ? WORDMARK : MARK;
  if (!tool.paths) {
    return (
      <span
        aria-hidden
        style={{ height, width: height }}
        className="grid shrink-0 place-items-center rounded-[0.3rem] bg-[#a6410a] text-[0.55rem] font-extrabold leading-none text-white"
      >
        {tool.monogram}
      </span>
    );
  }
  return (
    <svg
      viewBox={tool.viewBox}
      width={Math.round(height * (tool.aspect ?? 1))}
      height={height}
      aria-hidden
      className="shrink-0 text-[color:var(--mark)] dark:text-[color:var(--mark-dark)]"
      style={
        {
          "--mark": `#${tool.hex}`,
          "--mark-dark": `#${tool.darkHex ?? tool.hex}`,
        } as React.CSSProperties
      }
    >
      {tool.paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

/**
 * The stack strip: a fixed label, then a clipped row that scrolls its contents.
 *
 * This is the one track on the homepage that runs continuously — everything on
 * the bento board below waits to be hovered. Built on the vendored Magic UI
 * Marquee (components/vendor/Marquee.tsx), which repeats the list to make the
 * loop seamless and marks the repeats `aria-hidden` + `inert` so each tool is
 * announced and tabbed once.
 *
 * It stops on hover and under `prefers-reduced-motion`. The pause control that
 * used to sit in a bordered cell on the right is gone at the owner's request,
 * but not deleted: a continuously moving element needs an off switch that a
 * keyboard can reach (WCAG 2.2.2), and hover is not one. It is hidden the way
 * the skip link is — off-screen until it takes focus, then a real button over
 * the strip's right edge. Tabbing to the strip is the only way to see it.
 */
export default function ToolsStrip() {
  const reduced = useReducedMotionPref();
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);

  return (
    <section
      aria-label="Tools and platforms I work with"
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
      className="mb-4 board:mb-1 rounded-[2.1rem] bg-gradient-to-r from-canvas-sunk/30 via-wash/45 to-wash-strong/60 p-1.5 board:p-1"
    >
      <div className="flex items-stretch overflow-hidden rounded-[1.7rem] border border-line bg-panel shadow-card">
        {/* Fixed label */}
        <div className="flex shrink-0 flex-col justify-center gap-0.5 border-e border-line px-3 py-2.5 sm:px-6">
          <span className="font-technical text-xs font-extrabold uppercase tracking-[0.14em] text-accent-deep sm:text-eyebrow sm:tracking-[0.16em]">
            Daily drivers
          </span>
          <span className="hidden whitespace-nowrap font-display text-[0.95rem] font-bold text-fg sm:block">
            Tools I work with
          </span>
        </div>

        {/* Clipped, scrolling track */}
        <div className="relative min-w-0 flex-1">
          <Marquee
            pauseOnHover
            paused={paused || reduced || interacting}
            repeat={3}
            className="py-3 [--duration:52s] [--gap:0px] sm:py-3.5 board:py-2"
          >
            {TOOLS.map((tool) => (
              <span
                key={tool.label}
                className="flex shrink-0 items-center gap-2.5 whitespace-nowrap border-e border-line-soft px-4 text-[0.9rem] font-semibold text-fg sm:px-6 sm:text-[0.95rem]"
              >
                <ToolMark tool={tool} />
                {/* Where the mark is the name, printing the label too said it
                    twice. The name stays for a screen reader, which cannot
                    read the artwork. */}
                {tool.wordmark ? <span className="sr-only">{tool.label}</span> : tool.label}
              </span>
            ))}
          </Marquee>
          {/* Fade the clipped edges rather than cutting a label mid-glyph.
              Physical left/right on purpose: the track always travels the same
              way, so the fades must not flip under RTL. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-6"
            style={{ background: "linear-gradient(to right, rgb(var(--c-panel)), transparent)" }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10"
            style={{ background: "linear-gradient(to left, rgb(var(--c-panel)), transparent)" }}
          />

          {/* Off-screen until focused — see the note above. */}
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              aria-pressed={paused}
              aria-label={paused ? "Resume scrolling tools" : "Pause scrolling tools"}
              className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:inset-y-1 focus-visible:right-1 focus-visible:z-10 focus-visible:grid focus-visible:w-10 focus-visible:place-items-center focus-visible:rounded-xl focus-visible:bg-panel-alt focus-visible:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {paused ? <Play size={16} strokeWidth={2.2} /> : <Pause size={16} strokeWidth={2.2} />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
