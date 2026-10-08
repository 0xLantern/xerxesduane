import { m, type Variants } from "framer-motion";
import { Check } from "lucide-react";
import { PROCESS } from "../data/content";
import { EASE, VIEWPORT } from "../lib/motion";
import SectionHeading from "./ui/SectionHeading";
import DottedOrbit from "./fx/DottedOrbit";

/**
 * The five steps check off in order the first time the band scrolls into
 * view, the way the old intro overlay did, but in the page where it can be
 * read: a solid line fills along the dotted one, each card rises in as the
 * line reaches it, its number pops and a small check ticks on. Transform and
 * opacity only, once. Under `prefers-reduced-motion` MotionConfig (App.tsx)
 * keeps only the fades, so the line and checks simply appear.
 */
const STEP_GAP = 0.22;
const START = 0.1;
/** When the filling line reaches step i, measured from the moment the band enters view. */
const at = (i: number) => START + i * STEP_GAP;

// Every delay is explicit and keyed to the step index (`custom`), not left to
// staggerChildren: framer does not carry a parent's stagger into variants
// nested inside each card, so the checks were all firing together.
const steps: Variants = { hidden: {}, show: {} };
const fill: Variants = {
  hidden: { scaleX: 0 },
  show: {
    scaleX: 1,
    transition: { delay: START, duration: STEP_GAP * (PROCESS.length - 1) + 0.25, ease: "linear" },
  },
};
const card: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: at(i), duration: 0.6, ease: EASE } }),
};
const pop: Variants = {
  hidden: { scale: 0.5, opacity: 0 },
  show: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: { delay: at(i) + 0.05, type: "spring", stiffness: 420, damping: 16 },
  }),
};
const tick: Variants = {
  hidden: { scale: 0, opacity: 0 },
  show: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: { delay: at(i) + 0.35, type: "spring", stiffness: 520, damping: 18 },
  }),
};

export default function Process() {
  return (
    <section
      id="process"
      className="band-paper relative scroll-mt-24 overflow-hidden border-y border-ink/10 py-20 sm:py-28"
    >
      {/* dotted-orbit motif, ink-toned for the light band */}
      <DottedOrbit
        tone="ink"
        className="absolute -right-44 -top-44 hidden h-[34rem] w-[34rem] opacity-50 sm:block"
      />
      <DottedOrbit
        tone="ink"
        className="absolute -bottom-56 -left-56 hidden h-[30rem] w-[30rem] opacity-40 sm:block"
      />

      <div className="container-bl relative">
        <SectionHeading
          tone="light"
          eyebrow="How I work"
          title={
            <>
              Listen deeply. Plan honestly.{" "}
              <span className="text-gold-deep">Build calmly.</span>
            </>
          }
          subtitle="From 'I think I need this' to 'I can't believe we ran the business without it.'"
        />

        <m.ol
          variants={steps}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          className="relative mt-14 grid gap-4 md:grid-cols-5"
        >
          {/* dotted flow line through the step numbers (desktop), and the
              solid line that fills along it */}
          <span
            aria-hidden
            className="absolute left-0 right-0 top-[2.1rem] hidden border-t-2 border-ink/20 [border-top-style:dotted] md:block"
          />
          <m.span
            aria-hidden
            variants={fill}
            className="absolute left-0 right-0 top-[2.1rem] hidden h-0.5 origin-left rounded-full bg-accent-deep md:block rtl:origin-right"
          />
          {PROCESS.map((step, i) => (
            <m.li
              key={step.no}
              custom={i}
              variants={card}
              className="relative rounded-2xl border border-ink/10 bg-white/50 p-5 backdrop-blur-sm"
            >
              <m.span
                custom={i}
                variants={pop}
                className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink font-mono text-sm font-semibold text-accent ring-4 ring-[#E8E1D2]"
              >
                {step.no}
                <m.span
                  aria-hidden
                  custom={i}
                  variants={tick}
                  className="absolute -bottom-1 -end-1 grid h-4 w-4 place-items-center rounded-full bg-accent-deep text-white ring-2 ring-[#E8E1D2]"
                >
                  <Check size={10} strokeWidth={3.4} />
                </m.span>
              </m.span>
              <h3 className="mt-4 text-lg !text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-ink/65">{step.body}</p>
            </m.li>
          ))}
        </m.ol>
      </div>
    </section>
  );
}
