import { m } from "framer-motion";
import { PROCESS } from "../data/content";
import { fadeUp, stagger, VIEWPORT } from "../lib/motion";
import SectionHeading from "./ui/SectionHeading";
import DottedOrbit from "./fx/DottedOrbit";

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
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          className="relative mt-14 grid gap-4 md:grid-cols-5"
        >
          {/* dotted flow line through the step numbers (desktop) */}
          <span
            aria-hidden
            className="absolute left-0 right-0 top-[2.1rem] hidden border-t-2 border-ink/20 [border-top-style:dotted] md:block"
          />
          {PROCESS.map((step) => (
            <m.li
              key={step.no}
              variants={fadeUp}
              className="relative rounded-2xl border border-ink/10 bg-white/50 p-5 backdrop-blur-sm transition-transform duration-300 ease-smooth hover:-translate-y-1"
            >
              <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink font-mono text-sm font-semibold text-accent ring-4 ring-[#E8E1D2]">
                {step.no}
              </span>
              <h3 className="mt-4 text-lg !text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-ink/65">{step.body}</p>
            </m.li>
          ))}
        </m.ol>
      </div>
    </section>
  );
}
