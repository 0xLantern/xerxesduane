import { useCallback, useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { ArrowLeft, Clapperboard, FolderOpen, Grid2X2, LayoutTemplate, Palette, Star } from "lucide-react";
import WorkGallery from "../components/WorkGallery";
import PageHeader from "../components/page/PageHeader";
import Panel from "../components/page/Panel";
import PanelBoard from "../components/page/PanelBoard";
import { GhostAction, PrimaryAction } from "../components/page/PageActions";
import { CASE_STUDIES } from "../data/content";
import { VIDEOS } from "../data/videos";
import { GRAPHIC_DESIGNS, WEB_DESIGNS, WORK_ITEMS, type WorkItem } from "../data/workItems";

type PortfolioFilter = "all" | "web" | "graphic" | "featured";
const INITIAL_ITEMS = 12;
const FILTER_IDS: PortfolioFilter[] = ["all", "web", "graphic", "featured"];

const LABELS: Record<PortfolioFilter, string> = {
  all: "All work",
  web: "Websites & commerce",
  graphic: "Brand & content",
  featured: "Launch & growth",
};

const matches = (item: WorkItem, filter: PortfolioFilter) =>
  filter === "all" ? true : filter === "featured" ? item.featured : item.category === filter;

/** Four covers from a set, as the card's preview strip. */
function Thumbs({ items }: { items: WorkItem[] }) {
  return (
    <ul className="grid grid-cols-4 gap-1.5">
      {items.slice(0, 4).map((item) => (
        <li
          key={item.thumb}
          className="h-12 overflow-hidden rounded-lg border border-line bg-plate"
        >
          <img
            src={item.thumb}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </li>
      ))}
    </ul>
  );
}

/** The published case studies' own client marks, contained so nothing crops. */
function CaseThumbs() {
  const shown = CASE_STUDIES.filter((c) => c.image).slice(0, 4);
  if (shown.length === 0) return null;
  return (
    <ul className="grid grid-cols-4 gap-1.5">
      {shown.map((study) => (
        <li
          key={study.client}
          className="flex h-12 items-center justify-center overflow-hidden rounded-lg border border-line bg-plate"
        >
          <img
            src={study.image}
            alt={study.client}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain p-1"
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * The filter carried in `?cat=`. Read after mount, never during render, so the
 * hydrated markup still matches the prerendered hub.
 */
function filterFromUrl(): PortfolioFilter | null {
  if (typeof window === "undefined") return null;
  const cat = new URLSearchParams(window.location.search).get("cat");
  return cat && (FILTER_IDS as string[]).includes(cat) ? (cat as PortfolioFilter) : null;
}

/**
 * `/portfolio` — the archive, behind a one-screen hub.
 *
 * Thirty pieces will never fit a screen, so the page opens as a board of the
 * kinds of work with real covers and live counts, and the gallery itself is one
 * click behind it. Each card is a genuine `?cat=` link — copyable, shareable,
 * crawlable — that swaps the view in place rather than reloading when clicked
 * normally.
 */
export default function Portfolio() {
  const [filter, setFilter] = useState<PortfolioFilter | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS);

  const sync = useCallback(() => setFilter(filterFromUrl()), []);

  useEffect(() => {
    // The URL is client state: reading it during render would break hydration,
    // and `popstate` keeps Back working now that the view is a history entry.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resolve the URL after matching the server snapshot
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [sync]);

  /** Move between hub and gallery, keeping `?cat=` in step. */
  const show = (next: PortfolioFilter | null) => {
    setFilter(next);
    setVisibleCount(INITIAL_ITEMS);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("cat", next);
      else url.searchParams.delete("cat");
      window.history.pushState(null, "", url);
      window.scrollTo({ top: 0 });
    }
  };

  const open = (next: PortfolioFilter) => (event: MouseEvent) => {
    // Leave modified clicks to the browser so "open in new tab" still works.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    show(next);
  };

  const filteredItems = filter ? WORK_ITEMS.filter((item) => matches(item, filter)) : [];
  const visibleItems = filteredItems.slice(0, visibleCount);

  return (
    <>
      <PageHeader
        eyebrow={`Portfolio · ${WORK_ITEMS.length} pieces`}
        title={<>Work that looks the part and does the job.</>}
        lede="Websites and brand &amp; graphic design for businesses across the UAE and beyond. Open a set to view any piece full size."
        actions={
          <>
            <PrimaryAction href="/case-studies">Case studies</PrimaryAction>
            <GhostAction href="/showreel" icon={<Clapperboard size={15} aria-hidden />}>
              Showreel
            </GhostAction>
          </>
        }
      />

      {filter === null ? (
        <PanelBoard rail railLabel="Portfolio categories" cols="board:grid-cols-4">
          <Panel
            icon={LayoutTemplate}
            label={LABELS.web}
            blurb={`${WEB_DESIGNS.length} builds: sites, stores and landing pages.`}
            href="/portfolio?cat=web"
            onClick={open("web")}
            span="sm:col-span-2"
          >
            <Thumbs items={WEB_DESIGNS} />
          </Panel>

          <Panel
            icon={Palette}
            label={LABELS.graphic}
            blurb={`${GRAPHIC_DESIGNS.length} pieces: identity, print and social.`}
            href="/portfolio?cat=graphic"
            onClick={open("graphic")}
          >
            <Thumbs items={GRAPHIC_DESIGNS} />
          </Panel>

          <Panel
            icon={Star}
            label={LABELS.featured}
            blurb={`${WORK_ITEMS.filter((i) => i.featured).length} pieces I keep coming back to.`}
            href="/portfolio?cat=featured"
            onClick={open("featured")}
          >
            <Thumbs items={WORK_ITEMS.filter((i) => i.featured)} />
          </Panel>

          <Panel
            icon={FolderOpen}
            label="Case studies"
            blurb={`${CASE_STUDIES.length} builds written up with the problem, the work and the outcome.`}
            href="/case-studies"
            span="sm:col-span-2"
          >
            <CaseThumbs />
          </Panel>

          <Panel
            icon={Clapperboard}
            label="Video & motion"
            blurb={`${VIDEOS.length} pieces: editing, grading and animation.`}
            href="/showreel"
          />

          <Panel
            icon={Grid2X2}
            label={LABELS.all}
            blurb={`Everything at once: all ${WORK_ITEMS.length} pieces in one gallery.`}
            href="/portfolio?cat=all"
            onClick={open("all")}
          />
        </PanelBoard>
      ) : (
        <section id="work" className="scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/portfolio"
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  show(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-fg-soft transition hover:border-accent/40 hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <ArrowLeft size={14} aria-hidden /> Overview
              </a>
              {FILTER_IDS.filter((id) => id !== filter).map((id) => (
                <a
                  key={id}
                  href={`/portfolio?cat=${id}`}
                  onClick={open(id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-alt px-3 py-1.5 text-xs font-medium text-fg-soft transition hover:border-accent/40 hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {LABELS[id]}
                  <span className="font-technical text-fg-faint">
                    {WORK_ITEMS.filter((item) => matches(item, id)).length}
                  </span>
                </a>
              ))}
            </div>
            <p className="font-technical text-xs uppercase tracking-[0.16em] text-fg-faint" aria-live="polite">
              {LABELS[filter]} · {visibleItems.length} of {filteredItems.length}
            </p>
          </div>

          <WorkGallery key={filter} items={visibleItems} />

          {visibleCount < filteredItems.length && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + INITIAL_ITEMS)}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-panel px-6 py-2.5 text-sm font-semibold text-fg-soft transition hover:border-accent/45 hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Load more work
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
