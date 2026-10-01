import { m } from "framer-motion";
import {
  Bot,
  Boxes,
  CloudUpload,
  Code2,
  Database,
  LayoutDashboard,
  LineChart,
  Megaphone,
  MessageCircle,
  PanelsTopLeft,
  ScanSearch,
  ShoppingBag,
  Sparkles,
  Target,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import AboutFigure from "./AboutFigure";
import { TRUST } from "../../data/trust";
import { fadeUp, stagger } from "../../lib/motion";

/**
 * The four disciplines, each pointing at the service page that covers it, so
 * the list is a route into the site rather than a decorative résumé. Four
 * glyphs each keeps the icon column a constant width, which is what lets the
 * titles line up down the list. They are lucide marks standing for the tools
 * named in `tools`, not third-party logos, so nothing needs a licence — the
 * tool names ride along as the cluster's accessible label.
 */
const DISCIPLINES: {
  title: string;
  tools: string;
  href: string;
  icons: LucideIcon[];
}[] = [
  {
    title: "Systems, Odoo & CRM",
    tools: "Odoo ERP, CRM, dashboards and reporting",
    href: "/odoo-erp-dubai",
    icons: [Boxes, Users, LayoutDashboard, Database],
  },
  {
    title: "AI automation & agents",
    tools: "Claude, Gemini, Groq and WhatsApp Business",
    href: "/ai-automation-dubai",
    icons: [Bot, Sparkles, Workflow, MessageCircle],
  },
  {
    title: "Web, commerce & apps",
    tools: "React, TypeScript, Tailwind, Vercel and storefronts",
    href: "/web-development-dubai",
    icons: [Code2, PanelsTopLeft, CloudUpload, ShoppingBag],
  },
  {
    title: "Search & paid growth",
    tools: "SEO, AEO, Meta Ads and Google Ads",
    href: "/seo-dubai",
    icons: [ScanSearch, LineChart, Target, Megaphone],
  },
];

/**
 * The About page's opening card.
 *
 * One surface, not two: the card carries a single left-to-right gradient from
 * white into the pale blue, and the figure sits on the blue end with no rule
 * between them. An internal divider there would cut the card in half and lose
 * the "one panel" read the layout depends on.
 *
 * Every claim is one the site already makes elsewhere — the founding year is
 * `TRUST.since`, the team size and the countries come from the published FAQs,
 * and each discipline links to the service page that details it.
 */
export default function AboutIntro() {
  return (
    <m.section
      variants={stagger}
      initial="hidden"
      animate="show"
      aria-label="Introduction"
      className="relative overflow-hidden rounded-[1.75rem] border border-line shadow-card"
      style={{
        background:
          "linear-gradient(102deg, rgb(var(--c-panel)) 0%, rgb(var(--c-panel)) 42%, rgb(var(--c-wash) / 0.5) 74%, rgb(var(--c-wash-strong) / 0.7) 100%)",
      }}
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        {/* ---- the words ----
            `min-w-0`: a grid item defaults to `min-width: auto`, so a long
            unbroken string inside would size the column and overflow the card
            on a phone. */}
        <div className="order-2 min-w-0 p-5 sm:p-6 lg:order-1 lg:py-5 lg:pe-4 lg:ps-8 board:py-3.5">
          <m.p
            variants={fadeUp}
            className="max-w-[44ch] font-display text-[1.4rem] font-extrabold leading-[1.25] tracking-tight text-fg sm:text-[1.65rem]"
          >
            Most small businesses don&rsquo;t need more tools.{" "}
            <span className="text-fg-soft">
              They need the ones they have to start talking to each other.
            </span>
          </m.p>

          <m.p
            variants={fadeUp}
            className="mt-3 max-w-[52ch] text-[0.95rem] leading-snug text-fg-soft board:mt-2"
          >
            <span className="font-bold text-fg">Independent since {TRUST.since}</span>, and
            hands-on. My work sits between off-the-shelf tools that never quite fit and enterprise
            consultants who bill for layers a 2&ndash;10 person team doesn&rsquo;t need. The
            retainer is month to month, and if you don&rsquo;t need me I&rsquo;ll say so.
          </m.p>

          {/* ---- what the work actually is ----
              Two across, and each one a tile rather than a row. As a row the
              four icons, the title and the number shared one line; in a
              two-column grid that left the title 70px at 1536 and 4px at 1280,
              so every discipline read as "System…". The title gets its own
              line now and cannot be squeezed by anything beside it. */}
          <m.ol variants={fadeUp} className="mt-4 grid gap-2 sm:grid-cols-2 board:mt-3">
            {DISCIPLINES.map((item, i) => (
              <li key={item.title}>
                <a
                  href={item.href}
                  className="group flex flex-col gap-1.5 rounded-xl border border-line bg-panel/70 px-3 py-2 transition duration-300 ease-smooth hover:border-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      role="img"
                      aria-label={item.tools}
                      title={item.tools}
                      className="flex shrink-0 gap-1"
                    >
                      {item.icons.map((Glyph, g) => (
                        <span
                          key={g}
                          className="grid h-7 w-7 place-items-center rounded-[0.5rem] border border-line bg-panel text-accent shadow-pill transition duration-300 ease-smooth group-hover:-translate-y-0.5"
                          style={{ transitionDelay: `${g * 40}ms` }}
                        >
                          <Glyph size={14} strokeWidth={2.2} aria-hidden />
                        </span>
                      ))}
                    </span>
                    <span className="shrink-0 font-display text-xs font-bold tabular-nums text-fg-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </span>
                  <span className="text-[0.9rem] font-bold leading-tight text-fg transition-colors group-hover:text-accent-deep">
                    {item.title}
                  </span>
                </a>
              </li>
            ))}
          </m.ol>
        </div>

        {/* ---- the figure, bleeding to the card's bottom edge ---- */}
        <div className="order-1 min-h-[15rem] px-5 pt-6 lg:order-2 lg:min-h-0 lg:px-0 lg:pt-8">
          <AboutFigure />
        </div>
      </div>
    </m.section>
  );
}
