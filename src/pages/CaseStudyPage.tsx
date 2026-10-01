import { ArrowLeft, ArrowUpRight, Check, ExternalLink, Quote, Target, TrendingUp, Wrench } from "lucide-react";
import type { CaseStudy } from "../data/content";
import { SERVICE_PAGES } from "../data/servicePages";
import PageHeader from "../components/page/PageHeader";
import Panel from "../components/page/Panel";
import PanelBoard from "../components/page/PanelBoard";
import { GhostAction, PrimaryAction } from "../components/page/PageActions";

export default function CaseStudyPage({ study }: { study: CaseStudy }) {
  const services = SERVICE_PAGES.filter((service) =>
    study.relatedServices.includes(service.slug),
  );

  return (
    <>
      <PageHeader
        eyebrow={study.category}
        title={study.client}
        lede={study.summary}
        meta={<span>{study.location}</span>}
        actions={
          <>
            <PrimaryAction href="/contact">Book a free audit</PrimaryAction>
            <GhostAction
              href="/case-studies"
              icon={<ArrowLeft size={15} strokeWidth={2.2} aria-hidden />}
            >
              All projects
            </GhostAction>
          </>
        }
      />

      <PanelBoard>
        {/* The problem and the work */}
        <Panel icon={Target} label="What needed to change" span="lg:col-span-7">
          <p className="text-[0.95rem] leading-relaxed text-fg-soft">{study.challenge}</p>
          <div className="mt-2 border-t border-line pt-4">
            <p className="font-technical text-[0.62rem] font-bold uppercase tracking-[0.16em] text-accent-deep">
              What changed
            </p>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {study.approach.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-snug text-fg-soft">
                  <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        {/* Client mark and the proof panel share the right column.
            `stats` and `scope` are mutually exclusive in the data, so exactly
            one of them lands here — together with the mark they fill the
            column beside the tall problem/approach panel, instead of one
            stretched card holding a small logo in a lot of empty space. */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:col-span-5">
          {study.image && (
            <Panel tone="plain">
              <div className="flex items-center justify-center rounded-card border border-line bg-plate px-5 py-5 shadow-card">
                <img
                  src={study.image}
                  alt={`${study.client} project`}
                  loading="lazy"
                  decoding="async"
                  className="max-h-20 w-auto max-w-full object-contain"
                />
              </div>
            </Panel>
          )}

          {study.stats && (
            <Panel icon={TrendingUp} label="Measured result">
              <dl className="grid grid-cols-2 gap-2">
                {study.stats.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-line bg-panel-alt p-3">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span className="font-display text-2xl font-extrabold text-accent-deep">
                        {stat.value}
                      </span>
                      <span className="mt-1 block text-[0.7rem] leading-tight text-fg-soft">
                        {stat.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}

          {study.scope && (
            <Panel icon={Wrench} label="Delivered">
              <ul className="space-y-2">
                {study.scope.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-fg-soft">
                    <Check size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        {/* Outcome */}
        <Panel icon={Quote} label="The outcome" span="lg:col-span-12">
          <p className="font-display text-xl italic leading-relaxed text-fg sm:text-2xl">
            {study.takeaway}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <a
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded py-1 text-sm font-semibold text-accent-deep transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
            >
              Want a result like this? Book your free audit
              <ArrowUpRight size={15} strokeWidth={2.3} aria-hidden />
            </a>
            {study.url && (
              <a
                href={study.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-soft transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
              >
                Visit live site
                <ExternalLink size={14} aria-hidden />
              </a>
            )}
          </div>
        </Panel>

        {/* Related services */}
        {services.map((service) => (
          <Panel
            key={service.slug}
            icon={service.icon}
            label={service.navLabel}
            href={`/${service.slug}`}
            span="lg:col-span-4"
          >
            <span className="font-technical text-[0.62rem] font-bold uppercase tracking-[0.14em] text-fg-faint">
              Explore service
            </span>
          </Panel>
        ))}
      </PanelBoard>

    </>
  );
}
