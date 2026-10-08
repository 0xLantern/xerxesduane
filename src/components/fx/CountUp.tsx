import { useEffect, useRef } from "react";
import { animate, useInView } from "framer-motion";
import { useReducedMotionPref } from "../../lib/usePrefs";

/**
 * A figure like "10,000+" that counts up from 0 the first time it scrolls into
 * view. The final value is what the server renders, so the prerendered HTML,
 * crawlers and a visitor without JavaScript all read the real number. Screen
 * readers get the final value from a hidden copy and never hear the count.
 * Under `prefers-reduced-motion` it simply stays put.
 */
export default function CountUp({ value, duration = 1.2 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotionPref();

  const match = /^(\D*)([\d,]+)(.*)$/.exec(value);
  const prefix = match?.[1] ?? "";
  const target = match ? Number(match[2].replace(/,/g, "")) : NaN;
  const suffix = match?.[3] ?? "";

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduced || !Number.isFinite(target)) return;
    const format = (n: number) => `${prefix}${Math.round(n).toLocaleString("en-US")}${suffix}`;
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        // The text node React rendered, so React never loses track of it.
        if (el.firstChild) el.firstChild.nodeValue = format(n);
      },
    });
    return () => controls.stop();
  }, [inView, reduced, target, prefix, suffix, duration]);

  return (
    <>
      <span ref={ref} aria-hidden className="tabular-nums">
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
