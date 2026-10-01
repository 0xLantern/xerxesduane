import { useState } from "react";
import { m } from "framer-motion";
import DeskIllustration from "./DeskIllustration";
import { useReducedMotionPref } from "../../lib/usePrefs";

/**
 * The artwork: you at the desk, keyed to transparency and trimmed to the
 * figure so `items-end` can sit it on the card's bottom edge. If it ever goes
 * missing the drawn SVG stands in, so the page is never broken by a 404.
 */
const FIGURE_SRC = "/brand/about-desk.webp";
const FIGURE_W = 1200;
const FIGURE_H = 851;

/**
 * The About card's figure: your illustration, floating.
 *
 * Two motions, both cheap and both transform-only so they never cause layout
 * work: it rises into place once, then breathes on a slow loop. The loop is
 * deliberately long and shallow — at 6s and 10px it reads as "alive" rather
 * than "animated", which is what a static figure at a desk wants.
 *
 * `prefers-reduced-motion` drops both: `MotionConfig reducedMotion="user"` in
 * App.tsx handles the entrance, and the float is gated on the hook here
 * because a `repeat: Infinity` loop is exactly the thing that setting exists
 * to stop.
 *
 * If the artwork 404s, `onError` falls back to the drawn scene rather than
 * leaving a broken-image icon in the card.
 */
export default function AboutFigure() {
  const reduced = useReducedMotionPref();
  const [missing, setMissing] = useState(false);

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="relative flex h-full w-full items-end justify-center"
    >
      <m.div
        animate={reduced ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
        className="w-full"
      >
        {missing ? (
          <DeskIllustration className="mx-auto w-full board:max-h-[23rem] board:w-auto" />
        ) : (
          <img
            src={FIGURE_SRC}
            alt=""
            aria-hidden
            width={FIGURE_W}
            height={FIGURE_H}
            loading="lazy"
            decoding="async"
            onError={() => setMissing(true)}
            // Fits the column and stands on the card's bottom edge, the way
            // the reference does. Not oversized: the figure runs to 92% of the
            // frame, so any bleed off the card's right edge takes his sleeve
            // with the chair. The artwork carries its own margins.
            //
            // Capped, because `w-full` on an intrinsic aspect meant a wider
            // window bought a taller figure: the card set the page height and
            // /about grew from 853px at 1280 to 933 at 1880. The cap is above
            // the copy column's own height at every width the cap applies to,
            // so the figure still fills the card rather than floating in it.
            className="mx-auto block w-full select-none board:max-h-[23rem] board:w-auto"
            draggable={false}
          />
        )}
      </m.div>
    </m.div>
  );
}
