import { m } from "framer-motion";
import { ArrowUpRight, ArrowLeft, Check, MessageCircle } from "lucide-react";
import { SERVICE_PAGES, type ServicePageData } from "../data/servicePages";
import { getServicePageAr } from "../data/servicePagesAr";
import { CASE_STUDIES, CONTACT, PRICING } from "../data/content";
import { priceForSlug, priceLabel } from "../data/pricing";
import { INSIGHTS } from "../data/insights";
import { fadeUp, stagger, VIEWPORT } from "../lib/motion";
import Reveal from "../components/ui/Reveal";
import Process from "../components/Process";
import Promise from "../components/Promise";
import FaqList from "../components/FaqList";
import PageHeader from "../components/page/PageHeader";
import { GhostAction, PrimaryAction } from "../components/page/PageActions";
import ServiceVisual from "../components/ServiceVisual";
import ServiceCompare from "../components/ServiceCompare";
import ServicePackages from "../components/ServicePackages";

export default function ServicePage({ page }: { page: ServicePageData }) {
  const Icon = page.icon;
  const point = priceForSlug(page.slug);
  const servicePrice = point ? priceLabel(point) : null;
  const proof = page.caseStudyClient
    ? CASE_STUDIES.find((c) => c.client === page.caseStudyClient)
    : undefined;
  const relatedPosts = INSIGHTS.filter((p) =>
    p.relatedServices?.includes(page.slug),
  ).slice(0, 3);
  const hasArabicPage = Boolean(getServicePageAr(page.slug));

  return (
    <>
      <PageHeader
        eyebrow={page.eyebrow}
        icon={Icon}
        title={
          <>
            {page.h1Lead} <span className="italic text-accent-deep">{page.h1Accent}</span>
          </>
        }
        lede={page.lede}
        // Lead with this page's own starting price where there is one, and
        // fall back to how the number gets set where there isn't. SEO and
        // general web development are the two without a published floor.
        meta={
          <span>
            {servicePrice ? (
              <>
                <strong className="font-bold text-accent-deep">{servicePrice}</strong>
                {" · "}
                <a href="/pricing" className="underline decoration-accent/40 underline-offset-4 transition hover:decoration-accent">
                  all pricing
                </a>
                {", including half price for charities"}
              </>
            ) : (
              PRICING.meta
            )}
          </span>
        }
        actions={
          <>
            <PrimaryAction href="/contact">Book a free audit</PrimaryAction>
            {/*
              WhatsApp is the stated second conversion path, and on a phone it
              was two navigations from here: Contact, then scroll, then tap. The
              service pages are where intent is highest, so it belongs in the
              header rather than only on /contact.
            */}
            <GhostAction
              href={`https://wa.me/${CONTACT.whatsapp}`}
              external
              cta="service-header"
              icon={<MessageCircle size={15} strokeWidth={2.2} aria-hidden />}
            >
              WhatsApp
            </GhostAction>
            {hasArabicPage && (
              <GhostAction href={`/ar/${page.slug}`}>
                <span lang="ar">العربية</span>
              </GhostAction>
            )}
            <GhostAction href="/" icon={<ArrowLeft size={15} strokeWidth={2.2} aria-hidden />}>
              Home
            </GhostAction>
          </>
        }
      />

      <ServiceVisual page={page} />

      <ServiceCompare page={page} />

      {page.slug === "ai-automation-dubai" && (
        <section className="pb-10 sm:pb-14">
          <div className="container-bl">
            <Reveal className="mx-auto max-w-4xl">
              <a
                href="/ai-lab"
                className="group flex flex-col justify-between gap-5 rounded-card border border-accent/25 bg-accent/[0.07] p-6 transition-colors hover:border-accent/50 sm:flex-row sm:items-center"
              >
                <div>
                  <span className="font-technical text-[0.62rem] font-bold uppercase tracking-[0.16em] text-accent-deep">Live AI Lab</span>
                  <h2 className="mt-3 font-display text-2xl font-semibold text-fg sm:text-3xl">Try working AI before we talk about building yours.</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                    Test a business assistant, lead qualifier, document Q&amp;A, and structured extraction tool. No sign-up and nothing canned.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-fg-onSolid">
                  Enter AI Lab
                  <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </a>
            </Reveal>
          </div>
        </section>
      )}

      {/* What you get */}
      <section className="py-10 sm:py-14">
        <div className="container-bl">
          <Reveal className="max-w-3xl">
            <h2 className="font-display text-3xl font-semibold text-fg sm:text-4xl">{page.bulletsHeading}</h2>
          </Reveal>

          <m.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={VIEWPORT}
            className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2"
          >
            {page.bullets.map((b) => (
              <m.article
                key={b.title}
                variants={fadeUp}
                className="glass glass-hover rounded-2xl p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
                  <Check size={18} strokeWidth={2.4} />
                </span>
                <h3 className="mt-4 text-lg text-cream">{b.title}</h3>
                <p className="mt-2 text-sm text-muted">{b.body}</p>
              </m.article>
            ))}
          </m.div>

          {/* Who it's for */}
          <Reveal delay={0.1} className="mx-auto mt-12 max-w-2xl">
            <div className="glass rounded-2xl p-7">
              <h3 className="font-mono text-xs uppercase tracking-wider text-gold">
                {page.forWhoHeading}
              </h3>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {page.forWho.map((w) => (
                  <li key={w} className="flex items-start gap-2.5 text-sm text-cream-dim">
                    <Check size={16} className="mt-0.5 shrink-0 text-gold" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Proof */}
          {proof && (
            <Reveal delay={0.15} className="mx-auto mt-6 max-w-2xl">
              <div className="glass border-glow rounded-2xl p-7">
                <span className="font-mono text-xs uppercase tracking-wider text-gold">
                  {proof.location} · {proof.category}
                </span>
                <p className="mt-3 text-base text-cream-dim">{proof.challenge}</p>
                {proof.stats && (
                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {proof.stats.map((s) => (
                      <div key={s.label}>
                        <div className="font-display text-2xl text-gold">{s.value}</div>
                        <div className="mt-1 text-xs text-muted">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {proof.scope && (
                  <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {proof.scope.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-cream-dim">
                        <Check size={15} className="shrink-0 text-gold" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-5 font-display text-base italic text-cream">
                  {proof.takeaway}
                </p>
                <a
                  href={`/case-studies/${proof.slug}`}
                  className="mt-5 inline-flex items-center gap-2 rounded py-1 font-mono text-[11px] uppercase tracking-wider text-gold transition-colors hover:text-gold-soft"
                >
                  Read the full case study
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="container-bl">
          <Reveal className="band-accent mx-auto max-w-4xl rounded-3xl border border-gold/25 p-7 shadow-solid sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-9">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-accent-ink">Before you spend</span>
              <h2 className="mt-3 max-w-2xl text-2xl !text-accent-ink sm:text-3xl">Let’s find the smallest build that creates the biggest useful change.</h2>
            </div>
            <a href="/contact" className="mt-6 inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream sm:mt-0">
              Scope it honestly <ArrowUpRight size={15} />
            </a>
          </Reveal>
        </div>
      </section>

      <Process />
      <ServicePackages page={page} />
      <Promise />

      <FaqList heading={`${page.navLabel} questions, answered`} items={page.faqs} />

      {/* Cross-links to the other services */}
      <section className="py-16 sm:py-20" aria-label="Other services">
        <div className="container-bl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl sm:text-3xl">
              Need more than {page.navLabel}?{" "}
              <span className="text-gradient-gold">It all connects.</span>
            </h2>
          </Reveal>
          <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
            {page.related
              .map((slug) => SERVICE_PAGES.find((p) => p.slug === slug))
              .filter((p): p is ServicePageData => Boolean(p))
              .map((p) => {
                const PIcon = p.icon;
                return (
                  <a
                    key={p.slug}
                    href={`/${p.slug}`}
                    className="glass glass-hover group flex items-center gap-3 rounded-2xl p-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
                      <PIcon size={18} strokeWidth={1.8} />
                    </span>
                    <span className="text-sm font-medium text-cream transition-colors group-hover:text-gold">
                      {p.navLabel}
                      <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-wider text-muted">
                        in Dubai
                      </span>
                    </span>
                  </a>
                );
              })}
          </div>
        </div>
      </section>

      {relatedPosts.length > 0 && (
        <section className="pb-16 sm:pb-20" aria-label="Related reading">
          <div className="container-bl">
            <div className="mx-auto max-w-2xl">
              <h2 className="font-mono text-xs uppercase tracking-wider text-gold">
                From the blog
              </h2>
              <ul className="mt-4 space-y-3">
                {relatedPosts.map((p) => (
                  <li key={p.slug}>
                    <a
                      href={`/insights/${p.slug}`}
                      className="inline-block rounded py-0.5 text-cream-dim transition-colors hover:text-gold"
                    >
                      {p.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

    </>
  );
}
