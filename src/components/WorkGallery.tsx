import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import type { WorkItem } from "../data/workItems";

/**
 * Is this a whole-page capture rather than a single screen?
 *
 * The archive holds both. A screen fits the viewer as-is; a full-site
 * screenshot does not, and `max-h-[80vh]` on a 1:4 image scaled it to a
 * 176px-wide sliver — the whole design technically on screen and none of it
 * readable. Past this ratio the viewer gives the image a real width and lets
 * it scroll instead, which is the only way a long page can actually be read.
 *
 * 2.2 rather than a plain portrait test: a 3:4 screenshot still reads fine
 * shrunk to fit, and scrolling it would be a downgrade.
 */
const isTall = (item: WorkItem) => item.h / item.w > 2.2;

export default function WorkGallery({ items }: { items: WorkItem[] }) {
  const [active, setActive] = useState<number | null>(null);

  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (d: number) =>
      setActive((cur) =>
        cur === null ? null : (cur + d + items.length) % items.length,
      ),
    [items.length],
  );

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active, close, step]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>figure]:mb-4">
        {items.map((it, i) => (
          <figure key={it.src} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View ${it.title}`}
              data-cursor="view"
              className="glass glass-hover block w-full overflow-hidden rounded-xl transition-transform duration-500 ease-smooth hover:scale-[1.02]"
            >
              <img
                src={it.thumb}
                width={it.w}
                height={it.h}
              loading={i < 6 ? "eager" : "lazy"}
              decoding="async"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                alt={it.title}
                className="w-full"
              />
            </button>
            {it.href && (
              <figcaption className="mt-2 flex items-center justify-between gap-2 px-1 text-xs">
                <span className="text-cream-dim">{it.title}</span>
                <a
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-gold hover:underline"
                >
                  Live site <ArrowUpRight size={12} />
                </a>
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {/* Portaled so no page layer (the cursor field's dots sit above the
          content) can paint over the viewer. */}
      {active !== null &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
            className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-deep/90 p-4 backdrop-blur-sm"
            onClick={close}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-cream/15 text-cream transition-colors hover:border-gold/50 hover:text-gold"
            >
              <X size={20} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              aria-label="Previous"
              className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-cream/15 text-cream transition-colors hover:border-gold/50 hover:text-gold sm:left-6"
            >
              <ChevronLeft size={22} />
            </button>
  
            <div
              className="flex max-h-[90vh] max-w-full flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={
                  isTall(items[active])
                    ? "max-h-[80vh] w-[min(88vw,900px)] overflow-y-auto overscroll-contain rounded-lg shadow-2xl"
                    : "contents"
                }
              >
                <img
                  src={items[active].src}
                  alt={items[active].title}
                  className={
                    isTall(items[active])
                      ? "block w-full rounded-lg"
                      : "max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
                  }
                />
              </div>
              {items[active].href && (
                <a
                  href={items[active].href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink-deep transition-colors hover:bg-gold-soft"
                >
                  Visit {items[active].title.split(", ")[0]} live
                  <ArrowUpRight size={15} strokeWidth={2.5} />
                </a>
              )}
            </div>
  
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              aria-label="Next"
              className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-cream/15 text-cream transition-colors hover:border-gold/50 hover:text-gold sm:right-6"
            >
              <ChevronRight size={22} />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
