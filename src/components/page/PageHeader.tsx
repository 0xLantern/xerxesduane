import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { riseIn, stagger } from "../../lib/motion";

interface PageHeaderProps {
  eyebrow: string;
  /** Optional glyph in the eyebrow — used by the service pages. */
  icon?: LucideIcon;
  title: ReactNode;
  lede?: ReactNode;
  /** Buttons or links, pulled to the upper right on wide screens. */
  actions?: ReactNode;
  /** Small meta line under the title (dates, reading time, breadcrumbs). */
  meta?: ReactNode;
  /** Override the title classes — Arabic needs looser leading than the
      Latin hero scale allows. */
  titleClass?: string;
}

/**
 * The page header, in the same language as the homepage hero: technical
 * eyebrow, oversized Fraunces title on the left, actions anchored to the
 * opposite corner.
 *
 * Left-aligned on purpose — the inner pages used to centre their headings,
 * which read as a separate site next to the fixed rail.
 */
export default function PageHeader({
  eyebrow,
  icon: Icon,
  title,
  lede,
  actions,
  meta,
  titleClass = "text-hero",
}: PageHeaderProps) {
  return (
    <m.header
      id="top"
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mb-4 board:mb-2.5"
    >
      {/*
        From `board` up the actions move onto the eyebrow's row and the title
        spans the full width beneath them. Beside the title they were taking
        ~350px of an 908px header, which pushed two- and three-word headings
        onto extra lines — 48px of vertical room bought with a row that is only
        46px tall. `board:contents` dissolves the title column so the eyebrow,
        title and meta become grid items in their own right.
      */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8 board:grid board:grid-cols-[1fr_auto] board:gap-x-8 board:gap-y-0">
        <div className="min-w-0 board:contents">
          <m.span variants={riseIn} className="eyebrow board:col-start-1 board:row-start-1 board:self-center">
            {Icon ? (
              <Icon size={14} strokeWidth={2.1} aria-hidden />
            ) : (
              <span className="h-px w-6 bg-accent/60" aria-hidden />
            )}
            {eyebrow}
          </m.span>
          <m.h1
            variants={riseIn}
            className={`mt-3 max-w-[20ch] text-balance font-display font-semibold text-fg board:col-span-2 board:row-start-2 board:mt-2 board:max-w-[26ch] ${titleClass}`}
          >
            {title}
          </m.h1>
          {meta && (
            <m.div
              variants={riseIn}
              className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-technical text-xs text-fg-faint board:col-span-2 board:row-start-3 board:mt-2"
            >
              {meta}
            </m.div>
          )}
        </div>

        {actions && (
          <m.div variants={riseIn} className="flex shrink-0 flex-wrap items-center gap-2 board:col-start-2 board:row-start-1 board:justify-end">
            {actions}
          </m.div>
        )}
      </div>

      {lede && (
        <m.p
          variants={riseIn}
          className="mt-4 max-w-[68ch] text-[1.02rem] leading-relaxed text-fg-soft board:mt-2.5 board:text-[0.95rem] board:leading-[1.5]"
        >
          {lede}
        </m.p>
      )}
    </m.header>
  );
}
