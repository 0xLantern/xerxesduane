import { Bot, Clapperboard, FolderOpen, LayoutTemplate, Palette, TrendingUp } from "lucide-react";
import { AI_LAB_HOME_CARDS } from "../data/aiLabHome";
import { CASE_STUDIES } from "../data/content";
import { FEATURED_RESULTS } from "../data/homeBento";
import { VIDEOS } from "../data/videos";
import { GRAPHIC_DESIGNS, WEB_DESIGNS } from "../data/workItems";
import PageHeader from "../components/page/PageHeader";
import Panel from "../components/page/Panel";
import PanelBoard from "../components/page/PanelBoard";
import { PrimaryAction } from "../components/page/PageActions";

/** Preview strip shared by the work categories. */
function Thumbs({
  items,
  contain = false,
}: {
  items: { src: string | undefined; alt: string }[];
  contain?: boolean;
}) {
  const shown = items.filter((i) => i.src);
  if (shown.length === 0) return null;
  return (
    <ul className="grid grid-cols-4 gap-1.5">
      {shown.map((item) => (
        <li
          key={item.alt}
          className="flex h-12 items-center justify-center overflow-hidden rounded-lg border border-line bg-plate"
        >
          {/* `contain` for client marks so a wordmark is never cropped;
              `cover` for screenshots so they don't letterbox. */}
          <img
            src={item.src}
            alt=""
            loading="lazy"
            decoding="async"
            className={
              contain ? "max-h-full max-w-full object-contain p-1" : "h-full w-full object-cover"
            }
          />
        </li>
      ))}
    </ul>
  );
}

/** Small pill, used for the tool and video-tag lists. */
function Pill({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls =
    "inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-alt px-3 py-1.5 text-xs font-medium text-fg-soft board:text-[0.72rem]";
  return href ? (
    <a
      href={href}
      className={`${cls} transition hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-panel`}
    >
      {children}
    </a>
  ) : (
    <span className={cls}>{children}</span>
  );
}

/**
 * `/projects` — the work at a glance.
 *
 * A hub rather than a list: one card per kind of work, each showing real
 * previews and linking to the full view behind it. Counts are derived from the
 * data so they cannot drift as work is added.
 */
export default function Projects() {
  const videoTags = [...new Set(VIDEOS.map((v) => v.tag))].slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title={<>Real systems, shipped and running.</>}
        lede="Client builds, websites, brand work, video and the live AI tools. Open any card for the full set."
        actions={<PrimaryAction href="/contact">Book a free audit</PrimaryAction>}
      />

      <PanelBoard rail railLabel="Project categories" cols="board:grid-cols-4">
        <Panel
          icon={FolderOpen}
          label="Case studies"
          blurb={`${CASE_STUDIES.length} documented builds, with the problem, the work and the outcome.`}
          href="/case-studies"
          span="sm:col-span-2"
        >
          <Thumbs contain items={CASE_STUDIES.map((c) => ({ src: c.image, alt: c.client }))} />
        </Panel>

        <Panel
          icon={LayoutTemplate}
          label="Websites & commerce"
          blurb={`${WEB_DESIGNS.length} builds: sites, stores and landing pages.`}
          href="/portfolio"
        >
          <Thumbs items={WEB_DESIGNS.slice(0, 4).map((w) => ({ src: w.thumb, alt: w.title }))} />
        </Panel>

        <Panel
          icon={Palette}
          label="Brand & content"
          blurb={`${GRAPHIC_DESIGNS.length} pieces: identity, print and social.`}
          href="/portfolio"
        >
          <Thumbs items={GRAPHIC_DESIGNS.slice(0, 4).map((g) => ({ src: g.thumb, alt: g.title }))} />
        </Panel>

        <Panel
          icon={Bot}
          label="AI Lab"
          blurb="Live tools you can run in the browser, no sign-up."
          span="sm:col-span-2"
        >
          <ul className="flex flex-wrap gap-1.5">
            {AI_LAB_HOME_CARDS.map((card) => (
              <li key={card.demoId}>
                <Pill href={`/ai-lab#${card.demoId}`}>{card.label}</Pill>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          icon={Clapperboard}
          label="Video & motion"
          blurb={`${VIDEOS.length} pieces: editing, grading and animation.`}
          href="/showreel"
        >
          <ul className="flex flex-wrap gap-1.5">
            {videoTags.map((tag) => (
              <li key={tag}>
                <Pill>{tag}</Pill>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          icon={TrendingUp}
          label="Measured results"
          blurb="Numbers from the published case studies."
          href="/case-studies"
        >
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {FEATURED_RESULTS.map((r) => (
              <li key={r.slug} className="rounded-lg border border-line bg-panel-alt px-3 py-2">
                <p className="truncate text-xs font-semibold text-fg board:text-[0.7rem]">{r.client}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-fg-soft board:text-[0.68rem]">
                  {r.stats.slice(0, 2).map((s) => (
                    <span key={s.label}>
                      <span className="font-display font-semibold text-accent-deep">{s.value}</span>{" "}
                      {s.label}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </PanelBoard>
    </>
  );
}
