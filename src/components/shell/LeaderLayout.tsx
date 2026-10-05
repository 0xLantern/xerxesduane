import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import MeshBackground from "./MeshBackground";
import { PROGRAM, FACILITATOR } from "../../data/leaderInYou";

/**
 * The frame for /leader-in-you, in place of ShellLayout.
 *
 * A landing page for one program: no profile rail, no site navigation. A slim
 * bar carries the program name and the one action that matters, and the footer
 * says whose program it is and links back to the site.
 */
export default function LeaderLayout({ children }: { children: ReactNode }) {
  return (
    <div className="theme-ascend">
      <MeshBackground />
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[72rem] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-3" aria-label={`${PROGRAM.name}, back to top`}>
            <span className="grid h-9 w-9 place-items-center rounded-[0.7rem] bg-accent font-display text-[0.95rem] font-extrabold text-accent-ink" aria-hidden>
              Y
            </span>
            <span className="whitespace-nowrap font-display text-[1rem] font-extrabold tracking-tight text-fg sm:text-[1.05rem]">{PROGRAM.name}</span>
          </a>
          <a
            href="#reserve"
            data-cta="leader-bar-reserve"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-4 py-2 font-display text-[0.85rem] font-extrabold text-accent-ink transition duration-300 ease-smooth hover:-translate-y-0.5 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <span className="sm:hidden">Reserve</span>
            <span className="hidden sm:inline">Reserve your seat</span>
            <ArrowUpRight size={15} strokeWidth={2.4} aria-hidden />
          </a>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[72rem] px-4 pb-10 pt-6 sm:px-6 lg:pt-10">{children}</div>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-[72rem] flex-col gap-2 px-4 py-6 text-[0.82rem] text-fg-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            {PROGRAM.fullName} is a program of{" "}
            <a href={FACILITATOR.site} target="_blank" rel="noopener noreferrer" className="text-accent-deep underline-offset-2 hover:underline">
              {FACILITATOR.company}
            </a>
            , Dubai.
          </p>
          <p className="flex items-center gap-3">
            <span>
              Page by{" "}
              <a href="/" className="underline-offset-2 hover:underline">
                Xerxes Duane
              </a>
            </span>
            <a href="/privacy" className="underline-offset-2 hover:underline">
              Privacy
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
