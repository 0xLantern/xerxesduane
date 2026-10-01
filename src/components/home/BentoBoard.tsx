import type { ReactNode } from "react";
import { ArrowRight, Bot, BadgeCheck, Star, User } from "lucide-react";
import Panel from "../page/Panel";
import PanelBoard from "../page/PanelBoard";
import { FolderGlyph, LayersGlyph } from "../ui/NavIcons";
import { Marquee } from "../vendor/Marquee";
import { AI_LAB_COUNT, AI_LAB_HOME_ROWS, AI_LAB_TRUST } from "../../data/aiLabHome";
import { CREDENTIALS } from "../../data/credentials";
import { TRUST } from "../../data/trust";
import { CORE_SERVICES, FEATURED_PROJECTS } from "../../data/homeBento";

/** Shared "go deeper" link, used by the panels that can't be links themselves. */
function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="group/more inline-flex items-center gap-1.5 rounded py-1 text-[0.82rem] font-bold text-accent-deep transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
    >
      {children}
      <ArrowRight
        size={14}
        strokeWidth={2.6}
        aria-hidden
        className="rtl-flip transition-transform duration-300 ease-smooth group-hover/more:translate-x-1"
      />
    </a>
  );
}

/**
 * The bento board: a pale-blue washed container holding the entry points.
 *
 * Four real columns once there's the width for them (the `board` breakpoint),
 * two below that, one on a phone. Spans are chosen so both rows fill the track
 * exactly, and the whole board clears a 900px-tall desktop viewport without
 * anything being clipped or shrunk to fit.
 *
 * Each card carries one small motion of its own on top of the shared card
 * hover (see components/page/Panel.tsx). Every one of them is *idle by
 * default* and starts on hover or keyboard focus — unlike the tools strip
 * above the board, which runs continuously because it is a marquee. Pausing is
 * done with `animation-play-state`, so a track resumes from where it stopped
 * rather than snapping back to the start.
 */
export default function BentoBoard() {
  // Narrowed once here: TRUST.google is nullable, and reading it inside the
  // JSX callbacks below would lose the narrowing on every access.
  const google = TRUST.google;

  return (
    <PanelBoard rail railLabel="Explore the site" cols="board:grid-cols-4" className="home-board">
      {/* ---- Projects: a clipped reel of real client-site screenshots ---- */}
      <Panel
        iconNode={<FolderGlyph size={20} />}
        label="Projects"
        blurb="Websites, ERP rollouts and campaigns built for real businesses."
        href="/case-studies"
        span="sm:col-span-2"
        className="home-projects"
      >
        <div className="grid min-h-0 flex-1 items-center gap-3 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <ul className="flex flex-col justify-center gap-3">
            {FEATURED_PROJECTS.map((project) => (
              <li key={project.image} className="min-w-0">
                <p className="text-[0.85rem] font-bold leading-tight text-fg">
                  {project.client}
                </p>
                <p className="mt-1 text-[0.75rem] leading-snug text-fg-faint">
                  {project.descriptor}
                </p>
              </li>
            ))}
          </ul>

          {/* The reel. Clipped to a fixed window; scrolls only while the card
              is hovered or focused, and holds its position when it isn't. */}
          <Marquee
            vertical
            startOnHover
            repeat={2}
            className="project-track h-[12rem] rounded-xl border border-line bg-panel-alt p-1.5 [--duration:18s] [--gap:0.5rem]"
          >
            {FEATURED_PROJECTS.map((project) => (
              <figure
                key={project.image}
                className="shrink-0 overflow-hidden rounded-lg border border-line bg-plate"
              >
                <img
                  src={project.image}
                  alt={`${project.title}, screenshot of the live site`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[1.6] w-full object-cover object-top"
                />
              </figure>
            ))}
          </Marquee>
        </div>
      </Panel>

      {/* ---- About: the portrait on a small fan of cards ---- */}
      <Panel icon={User} label="About" blurb="Who I am, and how the work runs." href="/about">
        {/* The desk illustration rather than the portrait: the same face is
            already in the rail two inches away, and a second copy of it read
            as a duplicate rather than a second thing to look at. */}
        <img
          src="/brand/about-desk.webp"
          alt=""
          width={1200}
          height={851}
          loading="lazy"
          decoding="async"
          className="mx-auto my-0.5 block w-full max-w-[11rem] select-none board:max-w-[8.5rem] transition duration-500 ease-smooth group-hover:-translate-y-1 group-focus-visible:-translate-y-1"
          draggable={false}
        />
      </Panel>

      {/* ---- AI Lab: two rows that slide apart on hover ---- */}
      <Panel
        icon={Bot}
        label="AI Lab"
        blurb="Live demos you can run right here."
        footer={<MoreLink href="/ai-lab">All {AI_LAB_COUNT} tools</MoreLink>}
      >
        <div className="my-auto flex flex-col gap-2.5">
          {AI_LAB_HOME_ROWS.map((row, i) => (
            <Marquee
              key={i}
              startOnHover
              reverse={i % 2 === 1}
              repeat={2}
              className="mask-fade-edges [--duration:24s] [--gap:0.375rem]"
            >
              {row.map(({ demoId, label, demo }) => {
                const Icon = demo.icon;
                return (
                  <a
                    key={demoId}
                    href={`/ai-lab#${demoId}`}
                    className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-panel-alt px-3 py-1.5 text-[0.8rem] font-semibold text-fg-soft transition hover:border-accent/50 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-panel"
                  >
                    <Icon size={14} strokeWidth={2.2} aria-hidden className="text-accent" />
                    {label}
                  </a>
                );
              })}
            </Marquee>
          ))}
        </div>
        <p className="text-xs text-fg-faint board:text-[0.72rem]">{AI_LAB_TRUST.join(" · ")}</p>
      </Panel>

      {/* ---- Credentials: real, verifiable, or absent ----
             CREDENTIALS ships empty (see src/data/credentials.ts). While it
             is, this tile doesn't render at all and Reviews widens to fill the
             row — an empty claim slot is worse than a shorter board. */}
      {CREDENTIALS.length > 0 && (
        <Panel
          icon={BadgeCheck}
          label="Credentials"
          blurb="Certified and verifiable."
          href="/about"
          className="max-sm:hidden"
        >
          <ul className="my-auto space-y-2.5">
            {CREDENTIALS.slice(0, 3).map((item, i) => (
              <li
                key={item.name}
                className="flex items-start gap-2.5 transition-transform duration-500 ease-smooth group-hover:translate-x-1 group-focus-visible:translate-x-1"
                style={{ transitionDelay: `${i * 45}ms` }}
              >
                <BadgeCheck
                  size={15}
                  strokeWidth={2.4}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-accent"
                />
                <span className="min-w-0">
                  <span className="block text-[0.82rem] font-bold leading-tight text-fg">
                    {item.name}
                  </span>
                  <span className="block text-[0.7rem] leading-tight text-fg-faint">
                    {item.issuer}
                    {item.year ? ` · ${item.year}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---- Services ---- */}
      <Panel
        iconNode={<LayersGlyph size={20} />}
        label="Services"
        href="/services"
        span={CREDENTIALS.length > 0 ? "" : "board:col-span-2"}
      >
        <ol className="divide-y divide-line-soft">
          {CORE_SERVICES.map((service, i) => (
            <li
              key={service.title}
              className="flex items-baseline gap-2 py-[0.42rem] transition-transform duration-300 ease-smooth group-hover:translate-x-1 group-focus-visible:translate-x-1"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              <span
                className={`grow text-[0.84rem] leading-snug ${
                  service.fixed ? "font-bold text-accent-deep" : "font-semibold text-fg"
                }`}
              >
                {service.title}
                {/* "fixed" is the whole distinction between this row and the
                    four under it, so it is said rather than implied. */}
                {service.fixed && (
                  <span className="ms-1.5 font-technical text-xs board:text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-fg-faint">
                    fixed
                  </span>
                )}
              </span>
              {/* The starting price, where the row number used to be. Same
                  column, same height, something a visitor can act on. */}
              <span
                className={`shrink-0 font-display text-xs board:text-[0.68rem] font-bold tabular-nums transition-colors duration-300 ${
                  service.fixed ? "text-accent-deep" : "text-fg-faint group-hover:text-accent"
                }`}
              >
                {service.price?.replace(/^from /, "") ?? ""}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      {/* ---- Reviews: the real Google profile, not written testimonials ----
             There are no client quotes on this site because there are no real
             attributable ones (see the note in data/content.ts). What there
             IS: a genuine Google Business Profile. So this shows that rating,
             its real review count, and a link a visitor can check — rather
             than prose nobody said. Widens when Credentials is absent. */}
      <Panel
        icon={Star}
        label="Reviews"
        blurb="What clients rated the work, on Google."
        span="sm:col-span-2"
        className="max-sm:hidden"
        footer={
          google ? (
            <MoreLink href={google.url}>Read them on Google</MoreLink>
          ) : (
            <MoreLink href="/case-studies">See the work instead</MoreLink>
          )
        }
      >
        {google ? (
          <div className="my-auto flex flex-wrap items-center gap-x-6 gap-y-3">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-[2.4rem] font-extrabold leading-none tracking-tight text-fg transition-colors duration-300 group-hover:text-accent-deep">
                {google.rating.toFixed(1)}
              </span>
              <span className="text-[0.78rem] leading-tight text-fg-soft">
                from {google.reviewCount}
                <br />
                Google review{google.reviewCount === 1 ? "" : "s"}
              </span>
            </p>
            <ul className="flex gap-1" aria-hidden>
              {Array.from({ length: 5 }, (_, i) => (
                <li
                  key={i}
                  className="transition duration-500 ease-smooth group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5"
                  style={{ transitionDelay: `${i * 55}ms` }}
                >
                  <Star
                    size={19}
                    strokeWidth={0}
                    className={
                      i < Math.round(google.rating)
                        ? "fill-accent text-accent"
                        : "fill-line text-line"
                    }
                  />
                </li>
              ))}
            </ul>
            <p className="min-w-0 flex-1 text-[0.78rem] leading-snug text-fg-soft">
              Every review is on the public profile, under real names. Nothing
              here is written for the site.
            </p>
          </div>
        ) : (
          <p className="my-auto text-[0.85rem] leading-snug text-fg-soft">
            No public reviews yet.
          </p>
        )}
      </Panel>

    </PanelBoard>
  );
}
