import { ArrowLeft, Check, MapPin, UserRoundCheck } from "lucide-react";
import AboutIntro from "../components/about/AboutIntro";
import PageHeader from "../components/page/PageHeader";
import TabbedViews from "../components/page/TabbedViews";
import { GhostAction, PrimaryAction } from "../components/page/PageActions";
import { SHELL_IDENTITY } from "../data/shell";
import { TRUST } from "../data/trust";

const FOCUS = [
  "Start by understanding how your business actually operates",
  "Replace manual, duplicated work with systems that run themselves",
  "Build for scale, so the tools still fit as you grow",
  "Shape everything around your real operations, not a generic template",
];

const PROJECTS = [
  "Construction and manufacturing workflows",
  "E-commerce and lead-management systems",
  "Inventory operations",
  "Website builds and integrations",
  "Marketing automation",
  "Customer-management platforms",
];

/**
 * `/about` — the introduction card, then four notes behind one control.
 *
 * All four are about the same subject and nobody reads them at once, and
 * stacked under the card they put the page 376px past a 900px screen. They are
 * views now, the way /pricing's blocks are: every one stays in the markup and
 * only its `hidden` attribute changes, so the prerendered page still carries
 * the whole bio as plain text.
 *
 * The two standing facts moved up into the header, where they are one line
 * rather than a 76px strip inside the card.
 */
export default function About() {
  return (
    <>
      <PageHeader
        eyebrow="About"
        title={<>Hi, I&rsquo;m Xerxes.</>}
        lede="I build the systems that keep a small business running when nobody is watching them."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <UserRoundCheck size={14} strokeWidth={2.2} aria-hidden className="text-accent" />
              Founder &amp; lead consultant · independent since {TRUST.since}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} strokeWidth={2.2} aria-hidden className="text-accent" />
              {SHELL_IDENTITY.location} · GMT+4 · GCC, NZ &amp; the Philippines
            </span>
          </>
        }
        actions={
          <>
            <PrimaryAction href="/contact">Book a free audit</PrimaryAction>
            <GhostAction href="/" icon={<ArrowLeft size={15} strokeWidth={2.2} aria-hidden />}>
              Home
            </GhostAction>
          </>
        }
      />

      <AboutIntro />

      <TabbedViews
        className="mt-3 board:mt-2"
        label="About Xerxes"
        views={[
          {
            id: "how-i-work",
            label: "How I work",
            content: (
              <div className="max-w-[92ch] space-y-2 text-[0.95rem] leading-snug text-fg-soft">
                <p>
                  I help growing businesses run on systems that actually work together. Instead of
                  a website in one place, spreadsheets in another, and a handful of apps that don't
                  talk to each other, I connect sales, CRM, inventory, purchasing, accounting, your
                  website, and your day-to-day workflows into one platform your team will genuinely
                  use.
                </p>
                <p>
                  My work sits in the gap between off-the-shelf tools that never quite fit and
                  expensive enterprise consultants who bill for layers most businesses don't need.
                  I build practical, scalable systems around how your business really operates,
                  often on flexible platforms like Odoo, but the tool is always chosen to fit the
                  problem rather than the other way around.
                </p>
              </div>
            ),
          },
          {
            id: "my-approach",
            label: "My approach",
            content: (
              <ul className="grid gap-2 sm:grid-cols-2 board:grid-cols-4">
                {FOCUS.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 rounded-card border border-line bg-panel p-3 text-[0.9rem] leading-snug text-fg-soft shadow-card"
                  >
                    <Check size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            ),
          },
          {
            id: "recent-work",
            label: "Recent work spans",
            content: (
              <ul className="grid gap-2 sm:grid-cols-2 board:grid-cols-3">
                {PROJECTS.map((p) => (
                  <li
                    key={p}
                    className="rounded-card border border-line bg-panel px-3 py-2 text-[0.9rem] text-fg-soft shadow-card"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            ),
          },
          {
            id: "why-i-do-it",
            label: "Why I do it",
            content: (
              <p className="max-w-[60ch] rounded-card border border-line bg-panel p-4 font-display text-[1.05rem] italic leading-snug text-fg shadow-card">
                I don't just create things. I help your business run, and I stay for the parts of
                your life it touches. Serving comes first; the build is how I do it.
              </p>
            ),
          },
        ]}
      />

      {/* HIDDEN (re-add later): Fellowship Dubai engagement panel — the client
          card is also commented out in data/content.ts. */}
    </>
  );
}
