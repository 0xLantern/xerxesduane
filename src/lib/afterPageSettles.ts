/**
 * Run `start` once the page has loaded, waited `delayMs`, and gone idle.
 * Decorative layers (the mesh gradient, the cursor field) use this so they
 * never compete with the page's own first paint. Returns a cleanup.
 */
export function afterPageSettles(start: () => void, delayMs: number): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  let timer: number | undefined;
  let idle: number | undefined;

  const schedule = () => {
    timer = window.setTimeout(() => {
      idle = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 2000 }) : undefined;
      if (idle === undefined) start();
    }, delayMs);
  };

  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });

  return () => {
    window.removeEventListener("load", schedule);
    window.clearTimeout(timer);
    if (idle !== undefined) w.cancelIdleCallback?.(idle);
  };
}
