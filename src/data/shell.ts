import { Bot, Tag, User } from "lucide-react";
import type { ComponentType } from "react";
import { ChatGlyph, FolderGlyph, HomeGlyph, LayersGlyph } from "../components/ui/NavIcons";
import { CONTACT } from "./content";
import { SERVICE_PAGES } from "./servicePages";

/**
 * Nav glyphs are either a lucide icon or one of the local multi-part glyphs
 * that animate on hover — both take the same two props.
 */
export type NavGlyph = ComponentType<{ size?: number; className?: string }>;

/* ---------------------------------------------------------------------------
 * Shell data — the profile sidebar's identity and the site's primary
 * destinations. Presentation lives in components/shell; this file is the only
 * place the nav is defined, so the desktop rail and the mobile bar can never
 * drift apart.
 * ------------------------------------------------------------------------- */

export interface ShellNavItem {
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel?: string;
  /** Arabic label, and a shorter one for the bottom bar. */
  labelAr: string;
  shortLabelAr?: string;
  href: string;
  /**
   * Where this item points on the Arabic side. Only set where an Arabic page
   * or section actually exists — the rest deliberately fall through to the
   * English route rather than 404 on a translation that was never written.
   */
  hrefAr?: string;
  icon: NavGlyph;
  /** Extra paths that should light this item up (e.g. detail routes). */
  matches?: string[];
}

/** The label and href for `item` in the current language. */
export function navLabel(item: ShellNavItem, locale: "en" | "ar", short = false): string {
  if (locale === "ar") return (short && item.shortLabelAr) || item.labelAr;
  return (short && item.shortLabel) || item.label;
}

export function navHref(item: ShellNavItem, locale: "en" | "ar"): string {
  return locale === "ar" ? (item.hrefAr ?? item.href) : item.href;
}

export const SHELL_NAV: ShellNavItem[] = [
  { label: "Home", labelAr: "الرئيسية", href: "/", hrefAr: "/ar", icon: HomeGlyph, matches: ["/", "/ar"] },
  {
    label: "Projects",
    labelAr: "المشاريع",
    href: "/projects",
    icon: FolderGlyph,
    matches: ["/projects", "/case-studies", "/portfolio", "/showreel"],
  },
  {
    label: "Services",
    labelAr: "الخدمات",
    href: "/services",
    hrefAr: "/ar#services",
    icon: LayersGlyph,
    matches: ["/services", ...SERVICE_PAGES.flatMap((page) => [`/${page.slug}`, `/ar/${page.slug}`])],
  },
  { label: "Pricing", labelAr: "الأسعار", href: "/pricing", icon: Tag },
  { label: "AI Lab", labelAr: "مختبر الذكاء الاصطناعي", shortLabelAr: "المختبر", href: "/ai-lab", icon: Bot },
  {
    label: "About",
    labelAr: "نبذة عني",
    href: "/about",
    icon: User,
    matches: ["/about", "/insights"],
  },
  {
    label: "FAQs / Contact",
    shortLabel: "Contact",
    labelAr: "الأسئلة والتواصل",
    shortLabelAr: "تواصل",
    href: "/contact",
    hrefAr: "/ar#contact",
    icon: ChatGlyph,
  },
];

/**
 * The links in the phone's bottom bar, in bar order. The bar's fifth slot is
 * not a link but "Ask", which opens the chat assistant (see MobileTabBar).
 * Contact sits in the middle because it is the raised primary action; About,
 * Pricing and AI Lab stay one tap away in the menu at the top of every page,
 * which keeps every target in the bar thumb-sized.
 *
 * Every href here must match a SHELL_NAV entry exactly: a stale one (the bar
 * once asked for /case-studies after Projects moved to /projects) is silently
 * dropped, which pulled Contact off-centre and left an empty slot.
 */
export const MOBILE_BAR_NAV: ShellNavItem[] = ["/", "/projects", "/contact", "/services"]
  .map((href) => SHELL_NAV.find((item) => item.href === href))
  .filter((item): item is ShellNavItem => Boolean(item));

export const SHELL_IDENTITY = {
  name: "Xerxes Duane",
  handle: "@xerxesduane",
  /** Positioning line — kept factual, no metrics or availability claims. */
  tagline: "Independent systems consultant",
  taglineAr: "استشاري أنظمة مستقل",
  location: "Dubai & the UAE",
  locationAr: "دبي والإمارات",
  /** Shows the owner's brand check beside the name. */
  verified: true,
  portrait: "/brand/portrait-560.webp",
  portraitFallback: "/brand/founder-xerxes.jpg",
};

export interface ShellSocial {
  label: string;
  href: string;
  /** Simple-icons style path is overkill here; lucide covers what we need. */
  kind: "linkedin" | "instagram" | "whatsapp" | "email";
}

/** Only accounts that actually exist. Nothing invented. */
export const SHELL_SOCIALS: ShellSocial[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/xerxesduane", kind: "linkedin" },
  { label: "Instagram", href: "https://www.instagram.com/xerxes.duane", kind: "instagram" },
  { label: "WhatsApp", href: `https://wa.me/${CONTACT.whatsapp}`, kind: "whatsapp" },
  { label: "Email", href: `mailto:${CONTACT.email}`, kind: "email" },
];

/**
 * True when `path` should light up `item`. Exact match for the homepage so
 * every route doesn't inherit it; prefix match for section roots.
 */
export function isNavActive(item: ShellNavItem, path: string): boolean {
  const clean = path.split("#")[0].replace(/\/+$/, "") || "/";
  if (item.href.startsWith("/#")) return false;
  if (item.href === "/") return clean === "/" || clean === "/ar";
  const candidates = item.matches ?? [item.href];
  return candidates.some((c) => clean === c || clean.startsWith(c + "/"));
}
