import { ArrowUpRight } from "lucide-react";
import type { ServicePageData } from "../data/servicePages";
import Reveal from "./ui/Reveal";

/**
 * Only rendered on the three search-visibility pages. They chase overlapping
 * queries, so each one says which of the three is for which job and links the
 * other two with descriptive anchor text — the honest answer to the
 * cannibalisation risk, and useful to anyone who landed on the wrong page.
 */
export default function ServiceCompare({ page }: { page: ServicePageData }) {
  const compare = page.compare;
  if (!compare) return null;

  return (
    <section className="pb-12 sm:pb-16" aria-label="Choosing between SEO, AEO and GEO">
      <div className="container-bl">
        <Reveal className="mx-auto max-w-4xl rounded-card border border-accent/20 bg-accent/[0.05] p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-fg sm:text-3xl">{compare.heading}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{compare.intro}</p>
          <dl className="mt-6 space-y-4">
            {compare.options.map((option) => {
              const here = option.slug === page.slug;
              return (
                <div key={option.slug} className="sm:grid sm:grid-cols-[7.5rem_1fr] sm:gap-5">
                  <dt className="font-technical text-sm font-bold uppercase tracking-[0.12em] text-accent-deep">
                    {here ? (
                      <>
                        {option.label}
                        <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[0.6rem] font-semibold normal-case tracking-normal text-accent-deep">
                          this page
                        </span>
                      </>
                    ) : (
                      <a
                        href={`/${option.slug}`}
                        className="inline-flex items-center gap-1 rounded py-1 underline decoration-accent/40 underline-offset-4 transition hover:decoration-accent"
                      >
                        {option.label}
                        <ArrowUpRight size={13} strokeWidth={2.4} aria-hidden />
                      </a>
                    )}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-cream-dim sm:mt-0">{option.when}</dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-6 border-t border-cream/10 pt-4 text-sm leading-relaxed text-muted">{compare.footnote}</p>
        </Reveal>
      </div>
    </section>
  );
}
