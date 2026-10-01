import { m } from "framer-motion";
import { Check } from "lucide-react";
import PageHeader from "../components/page/PageHeader";
import { PrimaryAction } from "../components/page/PageActions";
import TabbedViews from "../components/page/TabbedViews";
import { PACKAGES } from "../data/content";
import { NONPROFIT, RATE_CARD, aed, priceLabel } from "../data/pricing";
import { PRICING_FAQS } from "../lib/seo";
import { fadeUp, stagger, VIEWPORT } from "../lib/motion";

/**
 * The pricing page.
 *
 * Its job is to be quotable. Most people asking what a website costs in Dubai
 * are not on this site yet, they are asking a search engine or an assistant,
 * and both will only repeat a number they can find as plain text next to the
 * thing it prices. So every figure here is real text in a real table rather
 * than an image, a tooltip or a PDF, the headings are the questions people
 * actually type, and the same numbers go out as Schema.org offers from
 * lib/seo.ts. See RATE_CARD in data/pricing.ts, which both read from.
 *
 * The packages, the rate card and the charity terms do not share a laptop
 * screen. Stacked they ran 1,235px inside a 768px one, and laid out as a board
 * the table was squeezed until the charity column clipped. So they are three
 * views of one page instead, and the rate card is the one that opens, because
 * it is the reason the page exists.
 *
 * Every view stays in the DOM and only its `hidden` attribute changes, so the
 * prerendered HTML still carries every package, every row and the charity
 * terms as plain text whether or not the visitor ever switches.
 */

export default function Pricing() {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title={<>What it costs.</>}
        lede="Real starting prices, published up front. Every figure below is a floor a project actually starts at, not a quote: what you pay depends on scope, and you get that in writing after a free audit."
        actions={
          <PrimaryAction href="/contact">Book a free audit</PrimaryAction>
        }
      />

      <TabbedViews
        label="Pricing"
        views={[
          {
            id: "rate-card",
            label: "Rate card",
            note: `${RATE_CARD.length} services`,
            content: (
              <m.section
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={VIEWPORT}
              >
                <h2 className="sr-only">Starting prices by service</h2>
                {/* Split in two so the card sits side by side rather than one column
            deep; the halves are computed from RATE_CARD, so adding or removing
            a service rebalances them. Each half is still its own scroller,
            because the page body must never scroll sideways and a table is the
            one thing allowed to be wider than the screen. */}
                <div className="grid gap-3 board:grid-cols-2">
                  {[
                    RATE_CARD.slice(0, Math.ceil(RATE_CARD.length / 2)),
                    RATE_CARD.slice(Math.ceil(RATE_CARD.length / 2)),
                  ].map((half, h) => (
                    <m.div
                      key={h}
                      variants={fadeUp}
                      className="overflow-x-auto rounded-card border border-line bg-panel shadow-card"
                    >
                      <table className="w-full border-collapse text-start">
                        <caption className="sr-only">
                          Starting prices in UAE dirhams, part {h + 1} of 2
                        </caption>
                        <thead>
                          <tr className="border-b border-line">
                            <th
                              scope="col"
                              className="px-3 py-1.5 text-start font-technical text-eyebrow font-extrabold uppercase tracking-[0.1em] text-accent-deep"
                            >
                              Service
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-1.5 text-end font-technical text-eyebrow font-extrabold uppercase tracking-[0.1em] text-accent-deep"
                            >
                              From
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-1.5 text-end font-technical text-eyebrow font-extrabold uppercase tracking-[0.1em] text-accent-deep"
                            >
                              Charity
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {half.map((point) => (
                            <tr
                              key={point.service}
                              className="border-b border-line-soft last:border-0"
                            >
                              <th
                                scope="row"
                                className="px-3 py-1 text-start text-[0.85rem] font-bold leading-tight text-fg"
                              >
                                {point.service}
                              </th>
                              <td className="whitespace-nowrap px-3 py-1 text-end text-[0.85rem] font-semibold text-fg-soft">
                                {priceLabel(point)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-1 text-end text-[0.85rem] font-semibold text-accent-deep">
                                {aed(point.from * NONPROFIT.rate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </m.div>
                  ))}
                </div>
                <m.p
                  variants={fadeUp}
                  className="mt-2 text-[0.82rem] leading-snug text-fg-soft"
                >
                  Every figure is a starting point. Scope moves it, which is
                  what the free 60-minute audit is for: you leave with a written
                  proposal at a fixed price.
                </m.p>
              </m.section>
            ),
          },
          {
            id: "packages",
            label: "Packages",
            note: `${PACKAGES.length} ways to start`,
            content: (
              <m.section
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={VIEWPORT}
              >
                <h2 className="sr-only">Four ways to start</h2>
                <ul className="grid gap-3 sm:grid-cols-2 board:grid-cols-4">
                  {PACKAGES.map((pkg) => (
                    <m.li
                      key={pkg.name}
                      variants={fadeUp}
                      className={`flex flex-col rounded-card border bg-panel p-4 shadow-card transition duration-300 ease-smooth hover:-translate-y-[2px] hover:shadow-card-hover ${
                        pkg.featured
                          ? "border-accent/60"
                          : "border-line hover:border-accent/45"
                      }`}
                    >
                      <h3 className="font-display text-base font-extrabold leading-tight text-fg">
                        {pkg.name}{" "}
                        <span className="font-technical text-xs font-semibold text-fg-faint">
                          {pkg.pitch}
                        </span>
                      </h3>
                      <p className="mt-1 font-display text-xl font-extrabold leading-none text-accent-deep">
                        {pkg.price}{" "}
                        <span className="font-technical text-xs font-semibold text-fg-faint">
                          {pkg.note}
                        </span>
                      </p>
                      <p className="mt-1.5 text-[0.82rem] leading-snug text-fg-soft">
                        {pkg.body}
                      </p>
                      {/* The Starter carries its own page, so its card sends people to
                  read the scope rather than straight to a form. */}
                      <a
                        href={"href" in pkg && pkg.href ? pkg.href : "/contact"}
                        className="mt-auto inline-block pt-2 text-[0.82rem] font-bold text-accent-deep underline decoration-accent/40 underline-offset-4 transition hover:decoration-accent"
                      >
                        {pkg.cta}
                      </a>
                    </m.li>
                  ))}
                </ul>
              </m.section>
            ),
          },
          {
            id: "questions",
            label: "Common questions",
            note: `${PRICING_FAQS.length} answered`,
            content: (
              <m.section variants={stagger} initial="hidden" whileInView="show" viewport={VIEWPORT}>
                <h2 className="sr-only">Common questions about pricing</h2>
                {/* These are the questions people type into a search box, and
                    the page emits them as FAQPage markup. That markup is only
                    honest while they are on the page, so both read PRICING_FAQS. */}
                <dl className="grid gap-2 board:grid-cols-2">
                  {PRICING_FAQS.map((faq) => (
                    <m.div
                      key={faq.q}
                      variants={fadeUp}
                      className="rounded-card border border-line bg-panel p-4 shadow-card"
                    >
                      <dt className="font-display text-[0.95rem] font-extrabold leading-tight text-fg">
                        {faq.q}
                      </dt>
                      <dd className="mt-1.5 text-[0.85rem] leading-snug text-fg-soft">{faq.a}</dd>
                    </m.div>
                  ))}
                </dl>
              </m.section>
            ),
          },
          {
            id: "nonprofit",
            label: "Charity rates",
            note: "half price",
            content: (
              <m.section
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={VIEWPORT}
              >
                <h2 className="sr-only">
                  Half price for churches and charities
                </h2>
                <m.p
                  variants={fadeUp}
                  className="max-w-[68ch] text-[0.95rem] leading-relaxed text-fg-soft"
                >
                  {NONPROFIT.body}
                </m.p>
                <m.ul
                  variants={fadeUp}
                  className="mt-3 grid gap-2 sm:grid-cols-3"
                >
                  {[
                    "Registered non-profits and NGOs",
                    "Churches and places of worship",
                    "Registered charities and foundations",
                  ].map((who) => (
                    <li
                      key={who}
                      className="flex items-start gap-2 rounded-card border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-fg shadow-card"
                    >
                      <Check
                        size={16}
                        strokeWidth={2.6}
                        aria-hidden
                        className="mt-0.5 shrink-0 text-accent-deep"
                      />
                      {who}
                    </li>
                  ))}
                </m.ul>
              </m.section>
            ),
          },
        ]}
      />
    </>
  );
}
