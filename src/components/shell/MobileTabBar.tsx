import { Phone } from "lucide-react";
import { MOBILE_BAR_NAV, isNavActive, navHref, navLabel } from "../../data/shell";
import { useAssistantOpen } from "../../lib/assistantStore";
import { ChatGlyph } from "../ui/NavIcons";

/**
 * The phone's fixed bottom bar.
 *
 * Home, Projects, Contact, Services, and Ask. Contact is raised into the
 * middle as the primary action — the one thing a visitor on a phone is most
 * likely to want — and carries a phone glyph, so it no longer reads as a
 * second chat button. Ask opens the chat assistant in place of the floating
 * launcher, which is hidden below `lg` (see SiteAssistant): one chat button,
 * and nothing floating over the content. About, Pricing and AI Lab stay one
 * tap away in the menu at the top of every page.
 *
 * `env(safe-area-inset-bottom)` keeps the row clear of the iOS home indicator,
 * and App.tsx reserves the matching height at the end of the document so the
 * footer is never trapped underneath.
 */
export default function MobileTabBar({
  path,
  locale = "en",
}: {
  path: string;
  locale?: "en" | "ar";
}) {
  const [assistantOpen, setAssistantOpen] = useAssistantOpen();
  const askLabel = locale === "ar" ? "اسأل" : "Ask";

  return (
    <nav
      aria-label="Primary, compact"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-1.5">
        {MOBILE_BAR_NAV.map((item) => {
          const Icon = item.icon;
          const label = navLabel(item, locale, true);
          const href = navHref(item, locale);
          const isContact = item.href === "/contact";
          const active = isNavActive(item, path);

          if (isContact) {
            return (
              <li key={item.href} className="flex justify-center">
                <a
                  href={href}
                  className="group -mt-6 flex w-full flex-col items-center gap-1 rounded-2xl pb-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-full border-4 border-panel bg-accent text-accent-ink shadow-card-hover transition duration-300 ease-smooth group-active:scale-95">
                    <Phone size={21} strokeWidth={2.2} aria-hidden />
                  </span>
                  <span className="text-[0.68rem] font-bold text-fg">{label}</span>
                </a>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <a
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1 pb-1.5 pt-1 text-[0.68rem] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active ? "text-accent-deep" : "text-fg-soft"
                }`}
              >
                <Icon size={21} className={active ? "text-accent" : "text-fg-faint"} />
                <span className="max-w-full truncate">{label}</span>
              </a>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setAssistantOpen((v) => !v)}
            aria-expanded={assistantOpen}
            aria-haspopup="dialog"
            className={`group flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 rounded-xl px-1 pb-1.5 pt-1 text-[0.68rem] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              assistantOpen ? "text-accent-deep" : "text-fg-soft"
            }`}
          >
            <ChatGlyph size={21} className={assistantOpen ? "text-accent" : "text-fg-faint"} />
            <span className="max-w-full truncate">{askLabel}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
