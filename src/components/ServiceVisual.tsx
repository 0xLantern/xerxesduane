import { m, type Variants } from "framer-motion";
import type { ServicePageData } from "../data/servicePages";
import { EASE } from "../lib/motion";
import Reveal from "./ui/Reveal";

/**
 * The stages arrive in order, one after another, the first time the list
 * scrolls into view: each card rises a little and fades in, and its number
 * pops. Transform and opacity only. Under `prefers-reduced-motion`
 * MotionConfig (App.tsx) keeps only the fade, and without JavaScript the
 * reveal fallback in index.html shows everything.
 */
const stages: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const stageCard: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};
const stageNumber: Variants = {
  hidden: { opacity: 0, scale: 0.4 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 420, damping: 16, delay: 0.1 } },
};

/**
 * The flow block under a service page header.
 *
 * It used to render one of six generic templates picked by a substring of the
 * slug, with progress bars at invented percentages, a "live flow" indicator
 * that was not connected to anything, and three fixed icons that meant nothing
 * on any of the thirteen pages. All of that is gone: the stages now come from
 * the page's own `flow` data, so each service describes its own work.
 */
export default function ServiceVisual({ page }: { page: ServicePageData }) {
  const Icon = page.icon;
  const { flow } = page;

  return (
    <section className="pb-16 sm:pb-24" aria-label={`How ${page.navLabel} work runs`}>
      <div className="container-bl">
        <Reveal className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-cream p-6 text-ink shadow-[0_30px_120px_-70px_rgba(218,164,66,0.9)] sm:p-9">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(218,164,66,0.35),transparent_36%),linear-gradient(135deg,rgba(11,15,13,0.04),transparent_45%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
              {/* The inverted half: this column sits directly on the card's
                  surface, which is the page foreground colour. The <ol> beside
                  it is bg-ink, i.e. page-like again, so it keeps the ordinary
                  accent and must stay outside this scope. */}
              <div className="panel-invert">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-gold">
                  <Icon size={24} strokeWidth={1.7} />
                </div>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-deep">{flow.label}</p>
                <h2 className="mt-3 max-w-sm text-3xl leading-tight !text-ink sm:text-4xl">{flow.title}</h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/65">{flow.note}</p>
              </div>
              <m.ol
                variants={stages}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                className="grid gap-3 rounded-2xl border border-ink/10 bg-ink p-4 sm:grid-cols-2 sm:p-5"
              >
                {flow.stages.map((stage, index) => (
                  <m.li
                    key={stage.name}
                    variants={stageCard}
                    className="rounded-xl border border-cream/10 bg-cream/[0.04] p-4"
                  >
                    <m.span variants={stageNumber} className="inline-block origin-left font-mono text-[10px] text-gold">
                      {String(index + 1).padStart(2, "0")}
                    </m.span>
                    <p className="mt-2 text-sm font-semibold text-cream">{stage.name}</p>
                    <p className="mt-1.5 text-[0.8rem] leading-relaxed text-cream/75">{stage.detail}</p>
                  </m.li>
                ))}
              </m.ol>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
