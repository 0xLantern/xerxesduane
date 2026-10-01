import type { Variants } from "framer-motion";

export const EASE = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

/**
 * The entrance for anything above the fold — the page header and the home hero.
 *
 * `fadeUp` starts at `opacity: 0`, and framer writes a variant's initial state
 * into the server render. So the prerendered HTML shipped the `h1` as
 * `style="opacity:0"` and the largest contentful element on every route was
 * invisible until React had hydrated and run a 700ms fade. Measured on
 * `/seo-dubai`: first contentful paint at 160ms, the `h1` still at opacity 0 at
 * 613ms, and LCP recorded at 1348ms — eight times later than the text was
 * actually painted. A visitor whose JS is slow or blocked saw an empty header.
 *
 * This keeps the movement and drops the fade, so the text is legible in the
 * prerendered HTML and from the first paint. `y` is a transform, so it neither
 * hides the element from LCP nor shifts layout around it.
 */
export const riseIn: Variants = {
  hidden: { opacity: 1, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
};

export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};

/**
 * Shared viewport config so sections reveal once, as they enter view.
 *
 * The threshold is intentionally low. `amount` is the fraction of the element's
 * area that must be on screen to trigger the reveal. A tall, single-column
 * section on mobile can be 5–6× the viewport height, so its maximum possible
 * on-screen fraction is only ~0.17 — an `amount` of 0.2 could never be reached
 * and the section would stay hidden forever (this is exactly what broke the
 * home-page service cards on phones). 0.05 reveals as soon as a sliver enters,
 * which is reliable for sections of any height.
 */
export const VIEWPORT = { once: true, amount: 0.05 } as const;

/* ---------------------------------------------------------------------------
 * Motion system tokens — one signature feel, reused everywhere.
 * ------------------------------------------------------------------------- */

export const DUR = { fast: 0.2, base: 0.7, slow: 1.0 } as const;

/** Spring configs for pointer-driven motion (cursor follower, magnetic pull). */
export const SPRING = {
  cursor: { stiffness: 350, damping: 32, mass: 0.6 },
  magnetic: { stiffness: 220, damping: 18, mass: 0.4 },
} as const;

/** Word/line mask reveal — pair with an overflow-hidden wrapper. */
export const maskUp: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.85, ease: EASE } },
};

/** Stagger tuned for kinetic type (words), tighter than section stagger. */
export const kineticStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.1 } },
};

/** Bottom-up clip wipe for media reveals. Animates clip-path only (no layout). */
export const wipeReveal: Variants = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)" },
  show: {
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 0.9, ease: EASE },
  },
};
