import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import MeshBackground from "./MeshBackground";
import { HACK, REGISTRATION } from "../../data/hack";
import { siteHref } from "../../lib/host";

/**
 * The frame for /hack, in place of ShellLayout.
 *
 * #HACK2026 Dubai stands on its own: no profile rail, no site navigation, no
 * mobile tab bar. A guest who scans the poster should land on the event, not
 * on a consultancy. What remains is the background, a slim #HACK bar with the
 * one action that matters, the page, and a footer with the Indigitous credit.
 */
export default function HackLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MeshBackground />
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[68rem] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-baseline gap-2 font-display font-extrabold tracking-tight" aria-label={HACK.title}>
            <span className="text-[1.25rem] text-fg">
              #HACK<span style={{ color: "#EF4E25" }}>{HACK.year}</span>
            </span>
            <span className="rounded-sm px-1.5 py-0.5 text-[0.7rem] tracking-[0.3em] text-white" style={{ background: "#EF4E25" }}>
              {HACK.city.toUpperCase()}
            </span>
          </a>
          <a
            href={REGISTRATION.url}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="hack-bar-register"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-display text-[0.85rem] font-extrabold transition duration-300 ease-smooth hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            style={{ background: "#EFE974", color: "#131313" }}
          >
            Register
            <ArrowUpRight size={15} strokeWidth={2.4} aria-hidden />
          </a>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[68rem] px-4 py-6 sm:px-6 lg:py-10">{children}</div>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-[68rem] flex-col gap-2 px-4 py-6 text-[0.82rem] text-fg-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            #HACK is a program of Indigitous, run by local Champions in cities around the world.{" "}
            <a
              href={HACK.global}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-0.5 text-accent underline-offset-2 hover:underline"
            >
              hack.indigitous.org
              <ArrowUpRight size={12} strokeWidth={2.3} aria-hidden />
            </a>
          </p>
          <a href={siteHref("/privacy")} className="underline-offset-2 hover:underline">
            Privacy
          </a>
        </div>
      </footer>
    </>
  );
}
