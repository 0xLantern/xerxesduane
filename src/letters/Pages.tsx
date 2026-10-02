/**
 * A PDF's pages as canvases, each as wide as its column and drawn at the
 * screen's pixel density, so text stays sharp on a phone. Pages are drawn as
 * they come near the screen and redrawn when the width changes (a phone
 * turned on its side). When the reader pinch-zooms, the pages on screen are
 * redrawn with that much more detail, so zoomed text is sharp, not stretched.
 * In a long letter, pages far off screen let go of their pixels, so a phone
 * doesn't run out of memory.
 *
 * Web links in the PDF stay tappable, and each page's text is there for
 * screen readers.
 */
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

type Size = { w: number; h: number };
type Link = { href: string; left: number; top: number; width: number; height: number };

/** The most pixels one canvas may have: iOS Safari refuses larger ones. */
const MAX_PIXELS = 16_000_000;
/** The most for a page redrawn for a pinch-zoom: about 40 MB, one or two at a time. */
const ZOOM_PIXELS = 10_000_000;

/**
 * How far the reader has pinch-zoomed, in steps (1, 1.5, 2 … 4), settled a
 * moment after the fingers stop.
 */
function usePinchZoom(): number {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let t = 0;
    const onResize = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => setZoom(vv.scale < 1.2 ? 1 : Math.min(4, Math.round(vv.scale * 2) / 2)), 250);
    };
    vv.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(t);
      vv.removeEventListener("resize", onResize);
    };
  }, []);
  return zoom;
}

/** All the pages (or the first `limit`), one under another. */
export function PdfPages({ doc, limit, gap = "0.75rem" }: { doc: PDFDocumentProxy; limit?: number; gap?: string }) {
  const count = Math.min(doc.numPages, limit ?? doc.numPages);
  const [sizes, setSizes] = useState<Size[] | null>(null);
  const zoom = usePinchZoom();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Size[] = [];
      for (let n = 1; n <= count; n++) {
        const vp = (await doc.getPage(n)).getViewport({ scale: 1 });
        out.push({ w: vp.width, h: vp.height });
      }
      if (!cancelled) setSizes(out);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [doc, count]);

  if (!sizes) return null;
  return (
    <div className="flex flex-col" style={{ gap }}>
      {sizes.map((s, i) => (
        <PdfPage key={i} doc={doc} n={i + 1} ratio={s.h / s.w} zoom={zoom} release={doc.numPages > 12} />
      ))}
    </div>
  );
}

/**
 * One page, as wide as its container. `ratio` is height over width, for the
 * space it holds before it's drawn; `zoom` is the pinch-zoom to draw for
 * while the page is on screen.
 */
export function PdfPage({ doc, n, ratio = 1.4142, zoom = 1, release = false }: { doc: PDFDocumentProxy; n: number; ratio?: number; zoom?: number; release?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [text, setText] = useState("");
  const extracted = useRef(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    // One screen ahead, so the next page is ready before it's reached.
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "100% 0px" });
    const seen = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    ro.observe(el);
    io.observe(el);
    seen.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
      seen.disconnect();
    };
  }, []);

  const boost = onScreen ? zoom : 1;
  useEffect(() => {
    if (!near || width < 10) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    (async () => {
      const page = await doc.getPage(n);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const area = base.width * base.height;
      const plain = Math.min((width / base.width) * dpr, Math.sqrt(MAX_PIXELS / area));
      const scale = boost > 1 ? Math.max(plain, Math.min(plain * boost, Math.sqrt(ZOOM_PIXELS / area))) : plain;
      const viewport = page.getViewport({ scale });
      // Drawn off to the side and swapped in when done, so a redraw never flashes blank.
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.cssText = "display:block;width:100%;height:100%";
      canvas.setAttribute("aria-hidden", "true");
      task = page.render({ canvas, viewport });
      await task.promise;
      if (cancelled) return;
      const old = holder.current?.querySelector("canvas");
      holder.current?.replaceChildren(canvas);
      // Give the old pixels back now: iOS Safari is slow to on its own.
      if (old) {
        old.width = 0;
        old.height = 0;
      }

      if (!extracted.current) {
        const content = await page.getTextContent();
        const words = content.items.map((i) => ("str" in i ? i.str : "")).join(" ").replace(/\s+/g, " ").trim();
        const annots = (await page.getAnnotations({ intent: "display" })) as { subtype?: string; url?: unknown; rect?: number[] }[];
        const found: Link[] = [];
        for (const a of annots) {
          if (a.subtype !== "Link" || typeof a.url !== "string" || !/^(https?:\/\/|mailto:)/i.test(a.url) || !a.rect) continue;
          const [x1, y1] = base.convertToViewportPoint(a.rect[0], a.rect[1]) as number[];
          const [x2, y2] = base.convertToViewportPoint(a.rect[2], a.rect[3]) as number[];
          found.push({
            href: a.url,
            left: (Math.min(x1, x2) / base.width) * 100,
            top: (Math.min(y1, y2) / base.height) * 100,
            width: (Math.abs(x2 - x1) / base.width) * 100,
            height: (Math.abs(y2 - y1) / base.height) * 100,
          });
        }
        if (!cancelled) {
          extracted.current = true;
          setText(words);
          setLinks(found);
        }
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [near, width, doc, n, boost]);

  // Far off screen in a long letter: give the pixels back.
  useEffect(() => {
    if (near || !release) return;
    const old = holder.current?.querySelector("canvas");
    if (old) {
      old.width = 0;
      old.height = 0;
    }
    holder.current?.replaceChildren();
  }, [near, release]);

  return (
    <section ref={box} aria-label={`Page ${n} of ${doc.numPages}`} className="relative w-full overflow-hidden rounded-[3px] bg-white shadow-[0_1px_3px_rgba(43,26,20,.12),0_12px_30px_-18px_rgba(43,26,20,.35)]" style={{ aspectRatio: `1 / ${ratio}` }}>
      <div ref={holder} className="absolute inset-0" />
      {links.map((l, i) => (
        <a
          key={i}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.href.replace(/^mailto:/i, "")}
          className="absolute rounded-sm focus:outline focus:outline-2 focus:outline-[#8a6a2e]"
          style={{ left: `${l.left}%`, top: `${l.top}%`, width: `${l.width}%`, height: `${l.height}%` }}
        />
      ))}
      {text && <p className="sr-only">{text}</p>}
    </section>
  );
}
