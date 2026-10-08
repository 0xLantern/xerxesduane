import { ArrowUpRight, Clapperboard, SquarePlay } from "lucide-react";
import VideoGallery from "../components/VideoGallery";
import PageHeader from "../components/page/PageHeader";
import { GhostAction, PrimaryAction } from "../components/page/PageActions";

export default function Showreel() {
  return (
    <>
      <PageHeader
        eyebrow="Showreel · video & motion"
        title={<>Footage into stories that move.</>}
        lede="Video editing, colour grading, animation and social content, cut for events, documentaries and brand work across the UAE and beyond. Tap any thumbnail to play."
        actions={
          <>
            <PrimaryAction href="/contact">Start a video project</PrimaryAction>
            <GhostAction href="/portfolio" icon={<Clapperboard size={15} aria-hidden />}>
              Portfolio
            </GhostAction>
          </>
        }
      />

      <section className="rounded-panel bg-gradient-to-r from-canvas-sunk/30 via-wash/40 to-wash-strong/60 p-3 sm:p-4">
        <VideoGallery />
      </section>

      {/* A whole channel of my work, linked rather than embedded so nothing
             from YouTube loads until someone chooses to go there. */}
      <a
        href="https://www.youtube.com/@camacopinc/videos"
        target="_blank"
        rel="noopener"
        className="group mt-4 flex items-center gap-3 rounded-card border border-line bg-panel p-4 shadow-card transition-colors hover:border-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.85rem] bg-accent text-accent-ink">
          <SquarePlay size={20} strokeWidth={2.2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold text-fg">More on the CAMACOP YouTube channel</span>
          <span className="block text-[0.9rem] leading-snug text-fg-soft">
            I filmed and edited every video on the channel of the Christian and Missionary
            Alliance Churches of the Philippines.
          </span>
        </span>
        <ArrowUpRight
          size={18}
          strokeWidth={2.4}
          aria-hidden
          className="shrink-0 text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </a>

      <p className="mt-4 text-sm text-fg-faint">
        Videos open from YouTube only when you press play, so nothing loads
        until you choose to watch.
      </p>

    </>
  );
}
