import { m } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { HERO } from "../../data/homeBento";
import { riseIn, stagger } from "../../lib/motion";

/**
 * Oversized headline with the contact button pulled to the upper right, so the
 * two anchor opposite corners of the content column the way the reference does.
 *
 * One element each, placed twice: from `sm` up it is a two-column grid with the
 * button in the top-right cell; below that it collapses to a column and CSS
 * `order` drops the button under the supporting line, which is the reading
 * order a thumb wants. No duplicated markup, so there is one button in the
 * accessibility tree at every width.
 */
export default function HeroBlock() {
  return (
    <m.header
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mb-6 board:mb-1 flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-10 sm:gap-y-0"
    >
      <m.h1
        variants={riseIn}
        className="max-w-[15ch] text-balance font-display text-hero font-extrabold text-fg sm:col-start-1 sm:row-start-1 board:max-w-[32ch]"
      >
        {HERO.headline}
      </m.h1>

      <m.p
        variants={riseIn}
        className="order-1 max-w-[64ch] text-[1.08rem] leading-relaxed text-fg-soft sm:order-none sm:col-start-1 sm:row-start-2 sm:mt-4 board:mt-2 board:text-[1rem]"
      >
        {HERO.subhead}
      </m.p>

      <m.div
        variants={riseIn}
        className="order-2 flex w-fit shrink-0 flex-col items-start gap-1.5 self-start sm:order-none sm:col-start-2 sm:row-start-1"
      >
        <a
          href={HERO.ctaHref}
          data-cta="primary"
          className="group inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3.5 text-[0.95rem] font-bold text-fg-onSolid shadow-solid board:py-2.5 transition duration-300 ease-smooth hover:-translate-y-0.5 hover:bg-navy-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          {HERO.ctaLabel}
          <ArrowUpRight
            size={17}
            strokeWidth={2.6}
            aria-hidden
            className="text-accent transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>
        {/* What happens after the click. A named, bounded offer converts better
            than an open invitation, and this is the same promise /contact makes. */}
        <p className="max-w-[24ch] text-[0.78rem] leading-snug text-fg-faint">{HERO.ctaNote}</p>
      </m.div>
    </m.header>
  );
}
