import { useEffect, useState } from "react";
import { m, useMotionValue, useSpring, useTransform, useVelocity } from "framer-motion";
import { SPRING, EASE } from "../../lib/motion";
import { useFinePointer, useReducedMotionPref } from "../../lib/usePrefs";

type CursorState = "default" | "link" | "view" | "open" | "play" | "drag" | "hidden";

const LABELS: Partial<Record<CursorState, string>> = {
  view: "View",
  open: "Open",
  play: "Play",
  drag: "Drag",
};

const RING = 34;
const DISC = 68;
const DOT = 6;

/** Ring speed (px/s) at which the squash-and-stretch tops out. */
const STRETCH_AT = 2600;

/**
 * Animated cursor: a precise dot plus a spring-eased ring that trails it,
 * stretching along the direction of travel and settling back to a circle
 * when the pointer stops. Contextual states come from `data-cursor`
 * (already on the gallery, video and demo cards): links open the ring out
 * around the dot, and view / open / play / drag swap it for a labelled disc.
 *
 * The ring and dot are white under `mix-blend-difference`, so they invert
 * whatever is beneath them and read on cream, navy, orange and photos alike.
 * The labelled disc sits on its own layer, outside the blend, so its colours
 * stay true. Blending only works because neither layer is inside a stacking
 * context: keep this mounted directly under the app root.
 *
 * Decorative only: pointer-events-none, aria-hidden, fine pointers only,
 * fully off under reduced motion, never rendered server-side. Focus outlines
 * and keyboard navigation are untouched, and form fields and iframes get the
 * native cursor back.
 */
export default function Cursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotionPref();
  const enabled = fine && !reduced;

  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<CursorState>("default");
  const [pressed, setPressed] = useState(false);
  // The disc keeps its last label while it shrinks away.
  const [discLabel, setDiscLabel] = useState("");

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, SPRING.cursor);
  const ringY = useSpring(y, SPRING.cursor);

  // Squash and stretch: point the ring along its own velocity and elongate
  // it with speed. At rest the scale is 1, so the angle never shows.
  const vx = useVelocity(ringX);
  const vy = useVelocity(ringY);
  const speed = useTransform(() => Math.hypot(vx.get(), vy.get()));
  const angle = useTransform(() => (Math.atan2(vy.get(), vx.get()) * 180) / Math.PI);
  const stretchX = useTransform(speed, [0, STRETCH_AT], [1, 1.5], { clamp: true });
  const stretchY = useTransform(speed, [0, STRETCH_AT], [1, 0.7], { clamp: true });

  useEffect(() => {
    if (!enabled) return;

    document.documentElement.classList.add("tw-cursor");

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      // Native text/form affordances win, and an iframe swallows pointer
      // events, so the custom cursor would freeze at its edge. Hide there.
      if (t.closest("input, textarea, select, iframe, [data-cursor='hidden']")) {
        setState("hidden");
        return;
      }
      const tagged = t.closest<HTMLElement>("[data-cursor]");
      if (tagged) {
        const next = (tagged.dataset.cursor as CursorState) || "link";
        const text = LABELS[next];
        if (text) setDiscLabel(text);
        setState(next);
        return;
      }
      if (t.closest("a, button, [role='button'], label, summary")) {
        setState("link");
        return;
      }
      setState("default");
    };

    const onLeaveDoc = () => setVisible(false);
    const onEnterDoc = () => setVisible(true);
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveDoc);
    document.documentElement.addEventListener("pointerenter", onEnterDoc);
    window.addEventListener("blur", onLeaveDoc);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    return () => {
      document.documentElement.classList.remove("tw-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeaveDoc);
      document.documentElement.removeEventListener("pointerenter", onEnterDoc);
      window.removeEventListener("blur", onLeaveDoc);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const labeled = state in LABELS;
  const hidden = !visible || state === "hidden";
  const link = state === "link";

  const ringScale = hidden || labeled ? 0.4 : link ? (pressed ? 1.2 : 1.5) : pressed ? 0.75 : 1;

  return (
    <>
      {/* Inverting layer: trailing ring and precise dot. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] mix-blend-difference">
        <m.div style={{ x: ringX, y: ringY }} className="absolute left-0 top-0">
          <m.div
            animate={{ opacity: hidden || labeled ? 0 : 1, scale: ringScale }}
            transition={{ duration: 0.3, ease: EASE }}
            className="absolute"
            style={{ width: RING, height: RING, left: -RING / 2, top: -RING / 2 }}
          >
            <m.div
              style={{ rotate: angle, scaleX: stretchX, scaleY: stretchY }}
              className="h-full w-full rounded-full border-[1.5px] border-white"
            />
          </m.div>
        </m.div>
        <m.div
          style={{ x, y, width: DOT, height: DOT, top: -DOT / 2, left: -DOT / 2 }}
          animate={{ opacity: hidden || labeled ? 0 : 1, scale: pressed ? 0.5 : 1 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="absolute rounded-full bg-white"
        />
      </div>

      {/* True-colour layer: the labelled disc for view / open / play / drag. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
        <m.div style={{ x: ringX, y: ringY }} className="absolute left-0 top-0">
          <m.div
            initial={false}
            animate={{
              opacity: labeled && !hidden ? 1 : 0,
              scale: labeled && !hidden ? (pressed ? 0.85 : 1) : 0.2,
            }}
            transition={{ duration: 0.3, ease: EASE }}
            className="absolute flex items-center justify-center rounded-full bg-navy text-fg-onSolid shadow-solid"
            style={{ width: DISC, height: DISC, left: -DISC / 2, top: -DISC / 2 }}
          >
            <span className="font-technical text-[11px] font-semibold uppercase tracking-[0.14em]">
              {discLabel}
            </span>
          </m.div>
        </m.div>
      </div>
    </>
  );
}
