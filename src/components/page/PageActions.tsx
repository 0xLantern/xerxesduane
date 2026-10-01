import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

const base =
  "group inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold board:py-2 transition duration-300 ease-smooth hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

/** Filled action — gold, with ink on it, as the brand button always was. */
export function PrimaryAction({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={`${base} bg-navy text-fg-onSolid shadow-solid hover:bg-navy-hover`}>
      {children}
      <ArrowUpRight size={16} strokeWidth={2.3} aria-hidden className="transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  );
}

/** Outlined action, for the secondary route out of a page. */
export function GhostAction({
  href,
  children,
  icon,
  external = false,
  cta,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  /** Opens in a new tab, for links that leave the site (WhatsApp, calendar). */
  external?: boolean;
  /** Names the slot for `initCtaTracking`, via `data-cta`. */
  cta?: string;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
      {...(cta ? { "data-cta": cta } : {})}
      className={`${base} border border-line bg-panel text-fg hover:border-accent/40 hover:text-accent`}
    >
      {icon}
      {children}
    </a>
  );
}
