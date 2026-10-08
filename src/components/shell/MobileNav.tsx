import { useEffect, useId, useRef, useState } from "react";
import { Languages, Menu, X } from "lucide-react";
import SocialLinks from "./SocialLinks";
import { AR_CHROME } from "../../data/servicePagesAr";
import ThemeToggle from "../ui/ThemeToggle";
import VerifiedTick from "./VerifiedTick";
import { SHELL_IDENTITY, SHELL_NAV, isNavActive, navHref, navLabel } from "../../data/shell";
import { useVisitCount } from "../../lib/useVisitCount";
import { siteHref } from "../../lib/host";

/**
 * Compact navigation for narrow viewports: a sticky identity bar plus a
 * disclosure panel holding the same destinations as the desktop rail.
 *
 * A disclosure (rather than a horizontally scrolling strip) keeps every
 * destination reachable by keyboard in one tab sequence, and avoids the nested
 * scroll region that makes a strip awkward on touch.
 */
export default function MobileNav({
  path,
  lang,
  locale = "en",
}: {
  path: string;
  lang: { href: string; label: string };
  locale?: "en" | "ar";
}) {
  const ar = locale === "ar";
  // Shares the desktop rail's request through a module-level promise, so
  // rendering the number in both places still counts the visit once.
  const visits = useVisitCount();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Escape closes and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <div className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <img
            src={SHELL_IDENTITY.portrait}
            width={40}
            height={40}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full border border-line object-cover object-top"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold text-fg">
              {SHELL_IDENTITY.name}
              {SHELL_IDENTITY.verified && <VerifiedTick size={14} className="ms-1" />}
            </p>
            {/* Handle rather than the positioning line, matching the rail. */}
            <p className="flex items-baseline gap-1.5 text-xs text-fg-soft">
              <span className="truncate" dir="ltr">
                {SHELL_IDENTITY.handle}
              </span>
              {visits !== null && (
                // "this month" doesn't fit this bar without truncating the
                // tagline to nothing, but dropping it would leave a number
                // that reads as all-time. Kept for assistive tech and hover
                // instead of shortened away.
                <span
                  className="shrink-0 tabular-nums text-fg-faint"
                  title={ar ? "زيارة هذا الشهر" : "visits this month"}
                >
                  {visits.toLocaleString("en-US")} {ar ? "زيارة" : "visits"}
                  <span className="sr-only">{ar ? " هذا الشهر" : " this month"}</span>
                </span>
              )}
            </p>
          </div>
          <ThemeToggle />
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? (ar ? AR_CHROME.closeMenu : "Close menu") : ar ? AR_CHROME.openMenu : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-full border border-line bg-panel text-fg shadow-pill transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            {open ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
          </button>
        </div>

        <div id={panelId} hidden={!open} className="border-t border-line px-4 pb-4 pt-3">
          <nav aria-label="Primary" className="flex flex-col gap-1">
            {SHELL_NAV.map((item) => {
              const active = isNavActive(item, path);
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={siteHref(navHref(item, locale))}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[0.95rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
                    active
                      ? "border border-line bg-panel text-fg shadow-pill"
                      : "border border-transparent text-fg-soft"
                  }`}
                >
                  <Icon size={19} className={active ? "text-accent" : "text-fg-faint"} />
                  {navLabel(item, locale)}
                </a>
              );
            })}
            <a
              href={siteHref(lang.href)}
              lang={lang.label === "English" ? "en" : "ar"}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-[0.95rem] font-medium text-fg-soft"
            >
              <Languages size={19} strokeWidth={1.9} aria-hidden className="text-fg-faint" />
              {lang.label}
            </a>
          </nav>
          <div className="mt-4 flex items-center gap-2">
            <SocialLinks />
          </div>

          {/* Same reason as the sidebar: without the footer these three have
              no other link on a phone. */}
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-0 border-t border-line pt-2 text-xs text-fg-faint">
            {!ar && (
              <>
                <a href={siteHref("/cv/freelance")} className="py-1.5 font-semibold text-fg-soft transition-colors hover:text-accent-deep">
                  CV
                </a>
                <a href={siteHref("/privacy")} className="py-1.5 transition-colors hover:text-accent-deep">
                  Privacy
                </a>
                <a href={siteHref("/terms")} className="py-1.5 transition-colors hover:text-accent-deep">
                  Terms
                </a>
              </>
            )}
            <a href={siteHref("/whatsapp-optin.html")} className="py-1.5 transition-colors hover:text-accent-deep">
              {ar ? "تحديثات واتساب" : "WhatsApp updates"}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
