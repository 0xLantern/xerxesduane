import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface TabView {
  /** Doubles as the URL fragment, so an old #anchor can keep working. */
  id: string;
  label: string;
  /** Small count or qualifier beside the label. */
  note?: string;
  content: ReactNode;
}

interface TabbedViewsProps {
  views: TabView[];
  /** Names the tablist for a screen reader. */
  label: string;
  className?: string;
}

/**
 * One page, several views.
 *
 * Used where a page carries more than a screen of material that does not have
 * to be read at once — the pricing table beside its packages, the About page's
 * four notes. The first view is the default and leaves the URL clean; the rest
 * write their id as the fragment, so every view is linkable and a `#packages`
 * or `#nonprofit` link published before this existed still lands on the right
 * one.
 *
 * Every panel stays in the DOM and only its `hidden` attribute changes, so the
 * prerendered HTML carries all of them as plain text whether or not a visitor
 * ever switches. That is the whole reason this is a disclosure rather than
 * separate routes.
 *
 * A real tablist: `aria-selected` and `aria-controls` are wired, focus roves
 * with the arrow keys, and only the selected tab is in the tab order.
 */
export default function TabbedViews({ views, label, className = "" }: TabbedViewsProps) {
  const first = views[0].id;
  const [active, setActive] = useState(first);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the open tab in view when the row scrolls sideways. Scrolls the row
  // itself, never the page, so it is safe on load and on every switch.
  useEffect(() => {
    const list = listRef.current;
    const tab = tabs.current[views.findIndex((v) => v.id === active)];
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;
    const left = tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active, views]);

  // `views` is rebuilt on every render, so the ids are joined into a plain
  // string the callback can depend on without re-subscribing each time.
  const ids = views.map((v) => v.id).join(",");
  const sync = useCallback(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    // A fragment that names a view opens it, and no fragment means the first.
    // Any other fragment is an in-page anchor elsewhere on the page (e.g.
    // /ministry#partner), and must not snap the reader back to the first view.
    if (!hash) setActive(first);
    else if (ids.split(",").includes(hash)) setActive(hash);
  }, [ids, first]);

  useEffect(() => {
    // The fragment is client state: reading it during render would break
    // hydration, and `hashchange` keeps a pasted link working.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resolve the URL after matching the server snapshot
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [sync]);

  const show = (next: string) => {
    setActive(next);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.hash = next === first ? "" : next;
      window.history.replaceState(null, "", url);
    }
  };

  const onKey = (index: number) => (event: React.KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + views.length) % views.length;
    show(views[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        ref={listRef}
        // One row that swipes sideways on a narrow screen, never a wrap: a
        // wrapped pill row split "Sermons & worship" over three lines and left
        // one tab stranded on a row of its own.
        className="mb-3 flex max-w-full gap-1.5 overflow-x-auto overscroll-x-contain rounded-full border border-line bg-panel p-1 [scrollbar-width:none] sm:w-fit [&::-webkit-scrollbar]:hidden"
      >
        {views.map((view, i) => {
          const on = active === view.id;
          return (
            <button
              key={view.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={view.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`${view.id}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => show(view.id)}
              onKeyDown={onKey(i)}
              className={`flex min-h-10 shrink-0 grow items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition board:min-h-8 board:py-1 sm:min-h-9 sm:grow-0 ${
                on
                  ? "bg-navy text-fg-onSolid shadow-solid"
                  : "text-fg-soft hover:bg-panel-alt hover:text-accent-deep"
              }`}
            >
              {view.label}
              {view.note && (
                <span
                  className={`font-technical text-xs font-semibold ${
                    on ? "text-fg-onSolid/60" : "text-fg-faint"
                  }`}
                >
                  {view.note}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {views.map((view) => (
        <div
          key={view.id}
          id={`${view.id}-panel`}
          role="tabpanel"
          aria-labelledby={view.id}
          hidden={active !== view.id}
          tabIndex={0}
        >
          {view.content}
        </div>
      ))}
    </div>
  );
}
