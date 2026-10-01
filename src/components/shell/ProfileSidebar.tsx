import { m } from "framer-motion";
import { Languages } from "lucide-react";
import SocialLinks from "./SocialLinks";
import VerifiedTick from "./VerifiedTick";
import ThemeToggle from "../ui/ThemeToggle";
import { LogoMark } from "../ui/Wordmark";
import { SHELL_IDENTITY, SHELL_NAV, isNavActive, navHref, navLabel } from "../../data/shell";
import { fadeUp, stagger } from "../../lib/motion";
import { useVisitCount } from "../../lib/useVisitCount";

interface ProfileSidebarProps {
  /** Current path, for the active nav state. */
  path: string;
  /** The same page in the other language. */
  lang: { href: string; label: string };
  locale?: "en" | "ar";
}

/**
 * The persistent profile rail: portrait, identity, socials, then the primary
 * navigation. Desktop only — MobileNav covers narrow viewports, and both read
 * SHELL_NAV so they can't drift.
 *
 * Sizing is deliberately budgeted so the whole rail — including the last nav
 * item — fits inside a 720px-tall viewport without a nested scrollbar. It used
 * to be 724px on a board, which put a floor under every page: six routes were
 * over a 1280x720 screen by 4px for reasons that had nothing to do with their
 * own content. It is ~644 now, so the page is what decides.
 */
export default function ProfileSidebar({ path, lang, locale = "en" }: ProfileSidebarProps) {
  const ar = locale === "ar";
  const tagline = ar ? SHELL_IDENTITY.taglineAr : SHELL_IDENTITY.tagline;
  const visits = useVisitCount();
  return (
    <m.aside
      variants={stagger}
      initial="hidden"
      animate="show"
      aria-label="Profile and site navigation"
      className="hidden shrink-0 lg:block lg:w-[15rem] xl:w-[16.5rem] board:w-[18rem]"
    >
      <div className="sticky top-0 flex flex-col gap-4 py-8 pe-1 board:gap-2 board:py-3">
        {/* Portrait + identity, as one link home. The logo mark rides the
            portrait's corner so the brand asset stays present without a
            second lockup competing with the name below it. */}
        <m.a
          variants={fadeUp}
          href="/"
          aria-label={`${SHELL_IDENTITY.name}, home`}
          className="group flex flex-col items-center rounded-3xl px-2 pt-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
        >
          <span className="relative">
            <img
              src={SHELL_IDENTITY.portrait}
              width={144}
              height={144}
              alt={`${SHELL_IDENTITY.name}, ${tagline}`}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="h-[7.5rem] w-[7.5rem] rounded-full border border-line bg-panel object-cover object-top shadow-card transition duration-500 ease-smooth board:h-[5.75rem] board:w-[5.75rem] group-hover:-translate-y-0.5"
            />
            <span
              aria-hidden
              className="absolute -bottom-0.5 -end-0.5 grid h-9 w-9 place-items-center rounded-full border border-line bg-panel shadow-pill"
            >
              <LogoMark size={20} />
            </span>
          </span>

          {/* Branding, not a section heading. As an <h2> this sat in the rail
              on all 47 routes, which put "Xerxes Duane" above every page's own
              <h1> in the document outline — so each page announced the site
              name before it announced what the page was about. Same type, same
              weight, no longer a heading. */}
          <p className="mt-4 board:mt-2.5 flex items-center justify-center gap-1.5 font-display text-[1.6rem] board:text-[1.3rem] font-extrabold leading-none tracking-tight text-fg">
            {SHELL_IDENTITY.name}
            {SHELL_IDENTITY.verified && <VerifiedTick size={19} />}
          </p>
          {/* Handle only. The location and the positioning line came off:
              on a one-screen home every line has to earn its space, and the
              board says what the work is better than a job title does.
              The handle is a Latin token, so pin it LTR — otherwise RTL bidi
              throws the "@" to the far end of the line. */}
          <p className="mt-1.5 text-[0.8rem] font-medium text-fg-faint">
            <span dir="ltr">{SHELL_IDENTITY.handle}</span>
          </p>
          <p className="mt-1.5 h-[1.05rem] text-[0.72rem] font-medium tabular-nums text-fg-faint">
            {visits !== null && (ar ? `${visits.toLocaleString("en-US")} زيارة هذا الشهر` : `${visits.toLocaleString("en-US")} visits this month`)}
          </p>
        </m.a>

        {/* Socials + theme switch, centred under the identity block. */}
        <m.div variants={fadeUp} className="flex items-center justify-center gap-2">
          <SocialLinks />
          <ThemeToggle />
        </m.div>

        <div className="hairline" aria-hidden />

        {/* Primary navigation */}
        <m.nav variants={fadeUp} aria-label="Primary" className="flex flex-col gap-0.5">
          {SHELL_NAV.map((item) => {
            const active = isNavActive(item, path);
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={navHref(item, locale)}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[0.95rem] font-semibold transition duration-300 ease-smooth board:py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
                  active
                    ? "border border-line bg-panel text-fg shadow-pill"
                    : "border border-transparent text-fg-soft hover:bg-panel hover:text-fg"
                }`}
              >
                <Icon
                  size={19}
                  className={
                    active
                      ? "text-accent"
                      : "text-fg-faint transition-colors duration-300 group-hover:text-accent"
                  }
                />
                <span className="transition-transform duration-300 ease-smooth group-hover:translate-x-0.5">
                  {navLabel(item, locale)}
                </span>
              </a>
            );
          })}
          <a
            href={lang.href}
            lang={lang.label === "English" ? "en" : "ar"}
            className="group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-2.5 text-[0.95rem] font-semibold text-fg-soft transition duration-300 ease-smooth board:py-1.5 hover:bg-panel hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <Languages size={19} strokeWidth={2} aria-hidden className="text-fg-faint" />
            <span className="transition-transform duration-300 ease-smooth group-hover:translate-x-0.5">
              {lang.label}
            </span>
          </a>
        </m.nav>

        {/* The footer used to carry these. It is gone, and /terms and the
            WhatsApp opt-in page had no other link on the site — the opt-in one
            is how a contact gives consent to be messaged, so it has to stay
            reachable from every page. Arabic keeps the split the footer had:
            the opt-in line is translated, the English-only legal pages are
            not surfaced there. */}
        <m.div variants={fadeUp} className="pt-1 text-center">
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0 text-xs text-fg-faint board:text-[0.7rem]">
            {!ar && (
              <>
                <a href="/privacy" className="py-1 transition-colors hover:text-accent-deep">
                  Privacy
                </a>
                <span aria-hidden>·</span>
                <a href="/terms" className="py-1 transition-colors hover:text-accent-deep">
                  Terms
                </a>
                <span aria-hidden>·</span>
              </>
            )}
            <a href="/whatsapp-optin.html" className="py-1 transition-colors hover:text-accent-deep">
              {ar ? "تحديثات واتساب" : "WhatsApp updates"}
            </a>
          </p>
          <p className="text-xs text-fg-faint board:text-[0.7rem]">
            © {new Date().getFullYear()} {SHELL_IDENTITY.name}
          </p>
        </m.div>
      </div>
    </m.aside>
  );
}
