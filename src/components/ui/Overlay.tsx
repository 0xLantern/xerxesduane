import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  title: string;
  /** Optional supporting line, announced with the title. */
  description?: string;
  /** Show the title visually as well as to assistive tech. */
  showTitle?: boolean;
  presentation?: "panel" | "immersive" | "preview";
  children: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A modal overlay: dimmed, blurred backdrop, one close control, and the
 * keyboard behaviour a dialog owes its user.
 *
 * A first-party overlay, retained after reviewing Aceternity Animated Modal.
 * Focus containment, inert background, Escape, scroll restoration and Lenis
 * coordination are part of this shared primitive, not each showcase.
 *
 * Scroll is locked by pinning `<body>` at its current offset rather than with
 * `overflow: hidden`, because the latter loses the scroll position on iOS.
 */
export default function Overlay({
  open,
  onClose,
  title,
  description,
  showTitle = false,
  presentation = "panel",
  children,
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const id = useId();

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;

    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflowY: body.style.overflowY,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflowY = "scroll";

    const app = document.getElementById("root");
    const wasInert = app?.inert ?? false;
    if (app) app.inert = true;

    // Move focus in once the panel exists.
    const panel = panelRef.current;
    const target = panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
    target?.focus({ preventScroll: true });

    // Escape is also bound on the document: React only sees keydown that
    // happens inside the portal, and focus can legitimately sit on <body>
    // (after a click on a non-focusable element, say).
    const onDocumentKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onDocumentKey);
    const containFocus = (event: FocusEvent) => {
      if (panel && !panel.contains(event.target as Node)) {
        (panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus({ preventScroll: true });
      }
    };
    document.addEventListener("focusin", containFocus);

    return () => {
      document.removeEventListener("keydown", onDocumentKey);
      document.removeEventListener("focusin", containFocus);
      if (app) app.inert = wasInert;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflowY = previous.overflowY;
      window.scrollTo({ top: scrollY, behavior: "instant" });
      restoreTo.current?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center ${presentation === "panel" ? "p-3 sm:p-6" : "showcase-overlay"}`}
      data-presentation={presentation}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="overlay-backdrop absolute inset-0 cursor-default bg-[#081326]/65 backdrop-blur-md"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        className={`overlay-panel relative flex max-h-full w-full flex-col overflow-hidden ${presentation === "panel" ? "max-w-6xl rounded-panel border border-line bg-panel shadow-card-hover" : `showcase-dialog showcase-dialog--${presentation}`}`}
      >
        <div className={`flex items-start justify-between gap-4 ${presentation === "panel" ? "border-b border-line px-4 py-3 sm:px-6 sm:py-4" : "showcase-dialog-header"}`}>
          <div className={showTitle ? "" : "sr-only"}>
            <h2 id={`${id}-title`} className="font-display text-lg font-extrabold text-fg">
              {title}
            </h2>
            {description && (
              <p id={`${id}-desc`} className="mt-0.5 text-[0.85rem] text-fg-soft">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ms-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-panel text-fg-soft transition hover:border-accent/45 hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
          >
            <X size={18} strokeWidth={2.2} aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
