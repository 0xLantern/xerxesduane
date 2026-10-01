import type { ReactNode } from "react";
import CanvasLines from "./CanvasLines";
import CursorField from "./CursorField";
import MeshBackground from "./MeshBackground";
import MobileNav from "./MobileNav";
import ProfileSidebar from "./ProfileSidebar";

interface ShellLayoutProps {
  children: ReactNode;
  path: string;
  /** The same page in the other language, for the EN/AR switch. */
  lang: { href: string; label: string };
  locale?: "en" | "ar";
}

/**
 * Page frame: the animated mesh gradient, canvas lines and cursor-reactive
 * dot field behind everything, the profile rail (or the mobile bar),
 * and the content column beside it.
 *
 * `min-w-0` on the content column is load-bearing — without it a wide child
 * (a table, a code block, the tools strip) would stretch the flex track and
 * put the whole page into horizontal overflow.
 */
export default function ShellLayout({ children, path, lang, locale = "en" }: ShellLayoutProps) {
  return (
    <>
      <MeshBackground />
      <CanvasLines />
      <CursorField />
      <MobileNav path={path} lang={lang} locale={locale} />
      <div className="mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-7 board:px-9">
        <div className="flex gap-7 xl:gap-9 board:gap-11">
          <ProfileSidebar path={path} lang={lang} locale={locale} />
          <div className="min-w-0 flex-1 py-6 lg:py-10 board:py-2">{children}</div>
        </div>
      </div>
    </>
  );
}
