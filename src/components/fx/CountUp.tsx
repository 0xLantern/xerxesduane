import { useEffect, useRef } from "react";
import { animate, useInView } from "framer-motion";
import { useReducedMotionPref } from "../../lib/usePrefs";

/**
 * A figure like "10,000+", "8.6K" or "$6.89" that counts up from 0 the first
 * time it scrolls into view, keeping its decimal places. A value with more than
 * one number in it ("8 → 1") is left as it is. The final value is what the server renders, so the prerendered HTML,
 * crawlers and a visitor without JavaScript all read the real number. Screen
 * readers get the final value from a hidden copy and never hear the count.
 * Under `prefers-reduced-motion` it simply stays put.
 */
export default function CountUp({ value, duration = 1.2 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotionPref();

  const match = /^(\D*)(\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(value);
  const prefix = match?.[1] ?? "";
  const target = match ? Number(match[2].replace(/,/g, "")) : NaN;
  const decimals = match?.[2].split(".")[1]?.length ?? 0;
  const suffix = match?.[3] ?? "";

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduced || !Number.isFinite(target)) return;
    const format = (n: number) =>
      `${prefix}${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        // The text node React rendered, so React never loses track of it.
        if (el.firstChild) el.firstChild.nodeValue = format(n);
      },
      // End on the exact string the server rendered, whatever its grouping.
      onComplete: () => {
        if (el.firstChild) el.firstChild.nodeValue = value;
      },
    });
    return () => controls.stop();
  }, [inView, reduced, value, target, decimals, prefix, suffix, duration]);

  return (
    <>
      <span ref={ref} aria-hidden className="tabular-nums">
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
