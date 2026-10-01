import { m } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { stagger, VIEWPORT } from "../../lib/motion";

interface PanelBoardProps {
  children: ReactNode;
  /** Grid template applied from lg up. Defaults to the 12-column board. */
  cols?: string;
  className?: string;
  /** `false` drops the washed container — for boards that sit inside one. */
  washed?: boolean;
  /**
   * Below `sm`, lay the panels out as a horizontally snapped rail instead of
   * stacking them. Used by the homepage: on a phone the board reads as an
   * Explore rail you swipe, with the next card peeking in as the affordance.
   */
  rail?: boolean;
  /**
   * Names the rail for the keyboard user who focuses it. Required in practice
   * whenever `rail` is set — a focusable scroll region with no name is just an
   * unexplained tab stop.
   */
  railLabel?: string;
}

/**
 * The washed container the panels sit on. Shared by the homepage board and the
 * inner pages so the bento rhythm is identical everywhere.
 *
 * The wash is a pale-blue bloom anchored to the right edge — it lifts the board
 * off the cream page without turning into a coloured slab behind the cards.
 *
 * `animate` is not used here: the board reveals on scroll, and on pages where
 * it is the first thing below the header that still fires immediately because
 * VIEWPORT's threshold is deliberately low.
 */
export const BOARD_WASH =
  // Halved from the original alphas so the page's mesh gradient shows through.
  "radial-gradient(125% 135% at 100% 22%, rgb(var(--c-wash-strong) / 0.45) 0%, rgb(var(--c-wash) / 0.34) 30%, rgb(var(--c-canvas-sunk) / 0.2) 62%, rgb(var(--c-canvas-sunk) / 0.06) 100%)";

export default function PanelBoard({
  children,
  cols = "lg:grid-cols-12",
  className = "",
  washed = true,
  rail = false,
  railLabel,
}: PanelBoardProps) {
  // A scroll container that is not focusable and whose cards are not all
  // focusable cannot be scrolled with a keyboard, so anything past the first
  // card is unreachable. Most cards here are themselves anchors, which carries
  // it by accident; the /ar board has one that is not, and nothing guarantees
  // the next card added anywhere will be a link.
  //
  // Measured rather than always on: above `sm` the rail is an ordinary grid
  // with nothing to scroll, and a tab stop there would stop nothing.
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !rail) return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [rail]);

  const layout = rail
    ? // A rail below sm; the ordinary grid from sm up. `snap-mandatory` plus a
      // sub-full card width means one card always settles in view with the
      // next one peeking, and the scrollbar is hidden because the peek is the
      // affordance.
      `flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] max-sm:[&>*]:w-[84%] max-sm:[&>*]:shrink-0 max-sm:[&>*]:snap-center [&::-webkit-scrollbar]:hidden sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible board:gap-3 ${cols}`
    : `grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 board:gap-3 ${cols}`;
  return (
    <m.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      style={washed ? { background: BOARD_WASH } : undefined}
      className={washed ? `rounded-panel p-3 sm:p-4 board:p-1.5 ${className}` : className}
    >
      <div
        ref={scroller}
        className={
          scrollable
            ? `${layout} rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas`
            : layout
        }
        {...(scrollable ? { tabIndex: 0, role: "group", "aria-label": railLabel } : {})}
      >
        {children}
      </div>
    </m.div>
  );
}
