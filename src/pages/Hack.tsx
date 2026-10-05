import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  Check,
  Compass,
  Laptop,
  Lightbulb,
  Link2,
  ListChecks,
  MapPin,
  MessageSquareLock,
  Search,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "../components/page/PageHeader";
import TabbedViews from "../components/page/TabbedViews";
import { GhostAction, PrimaryAction } from "../components/page/PageActions";
import { IconTile } from "../components/page/Panel";
import WhatsAppGlyph from "../components/ui/WhatsAppGlyph";
import {
  AT_A_GLANCE,
  CHAMPION_CONTACTS,
  CHALLENGES,
  CHECK_IN_GOALS,
  EVENTS,
  FAQS,
  GROUND_RULES,
  HACK,
  IF_ASKED,
  INVITE_MESSAGE,
  WHAT_IS,
  JUDGING,
  REGISTRATION,
  ROLES,
  STEPS,
  TOOLS,
  type HackEvent,
} from "../data/hack";

/**
 * `/hack` — #HACK2026 Dubai. UNLISTED, like /ministry, and served on the
 * ministry host (ministry.xerxesduane.com/hack).
 *
 * Kept out of search and AI answers the same way /ministry is: noindex in the
 * head (lib/seo.ts), the ministry host's X-Robots-Tag (vercel.json), a
 * Disallow for AI crawlers (public/robots.txt), no sitemap entry, and no
 * internal link pointing at it. People reach it from the posters and from
 * personal messages, which is how the Dubai Champions invite.
 *
 * Every word comes from src/data/hack.ts. Read the note at the top of that
 * file before adding anything: the internal hack plan does not belong here.
 */

/** The official #HACK palette, from hack.indigitous.org's brand page. */
const BRAND = { yellow: "#EFE974", orange: "#EF4E25", red: "#F43F5E", ink: "#131313", ink2: "#262626" };

/** What each WhatsApp button opens with, after "Hi <name>, ". */
const WA = {
  join: "I'd like to join #HACK2026 Dubai.",
  late: "I missed the #HACK2026 Dubai registration. Is there still a place for me?",
  fee: "I'd like to join #HACK2026 Dubai but the fee is hard for me right now.",
  help: "I'd like to help with #HACK2026 Dubai as a mentor or supporter.",
};
type Topic = keyof typeof WA;

type Contact = (typeof CHAMPION_CONTACTS)[number];
const waLink = (c: Contact, topic: Topic) =>
  `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(`Hi ${c.first}, ${WA[topic]}`)}`;

const CHALLENGE_ICONS: LucideIcon[] = [Compass, MessageSquareLock, ShieldCheck, Search];

const prose = "max-w-[72ch] space-y-3 text-[0.95rem] leading-relaxed text-fg-soft";

/* ------------------------------------------------------------------ */
/* time                                                                */
/* ------------------------------------------------------------------ */

/**
 * The current time, but only in the browser and only after mount.
 *
 * The prerendered HTML is built once and served for weeks, so anything that
 * depends on "now" has to be worked out by the visitor's browser. Until then
 * the page shows the fixed schedule and nothing that could be stale.
 */
function useNow(intervalMs = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only init; intentional SSR-safe pattern
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const DUBAI = "Asia/Dubai";
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: DUBAI });
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: DUBAI });

function when(e: HackEvent): string {
  const start = new Date(e.start);
  const end = new Date(e.end);
  const t = (d: Date) => timeFmt.format(d).replace(" ", "").toLowerCase();
  return `${dayFmt.format(start)} · ${t(start)} to ${t(end)}`;
}

function until(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d} day${d === 1 ? "" : "s"}, ${h} hour${h === 1 ? "" : "s"}`;
  if (h > 0) return `${h} hour${h === 1 ? "" : "s"}, ${m} min`;
  return `${m} min`;
}

/* ------------------------------------------------------------------ */
/* small parts                                                         */
/* ------------------------------------------------------------------ */

function SectionIntro({ id, eyebrow, title, lede }: { id: string; eyebrow: string; title: string; lede?: ReactNode }) {
  return (
    <div className="mb-3 max-w-[68ch]">
      <span className="eyebrow">
        <span className="h-px w-6 bg-accent/60" aria-hidden />
        {eyebrow}
      </span>
      <h2 id={id} className="mt-2 text-balance font-display text-[1.6rem] font-bold leading-tight text-fg sm:text-[1.85rem]">
        {title}
      </h2>
      {lede && <p className="mt-2 text-[0.95rem] leading-relaxed text-fg-soft">{lede}</p>}
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-panel p-4 shadow-card sm:p-5 ${className}`}>{children}</div>;
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-[1.05rem] font-bold text-fg">{children}</h3>;
}

const pill =
  "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.85rem] font-semibold transition duration-300 ease-smooth hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel";

/** One WhatsApp button per Champion, each opening with that person's name. */
function ChampionPills({ topic, verb = "WhatsApp" }: { topic: Topic; verb?: string }) {
  return (
    <>
      {CHAMPION_CONTACTS.map((c) => (
        <a
          key={c.first}
          href={waLink(c, topic)}
          target="_blank"
          rel="noopener noreferrer"
          data-cta={`hack-wa-${topic}-${c.first.toLowerCase()}`}
          className={`${pill} border border-line bg-panel text-fg hover:border-[#1FA855]/50`}
        >
          <WhatsAppGlyph size={15} className="text-[#1FA855]" />
          {verb} {c.first}
        </a>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* the brand slab: the poster, as a page element                       */
/* ------------------------------------------------------------------ */

/**
 * Fixed colours on purpose: this is the #HACK mark, not the site's theme, so
 * it reads the same in light and dark. Everything around it stays on the
 * site's own tokens.
 */
function BrandSlab({ now }: { now: number | null }) {
  const open = now === null || now < Date.parse(REGISTRATION.closes);
  return (
    <div
      className="relative overflow-hidden rounded-card border border-black/40 p-5 shadow-card sm:p-7"
      style={{
        background: `radial-gradient(120% 90% at 100% 0%, ${BRAND.orange}55 0%, transparent 55%), radial-gradient(90% 80% at 0% 100%, ${BRAND.red}33 0%, transparent 60%), ${BRAND.ink}`,
      }}
    >
      <p className="font-technical text-[0.72rem] uppercase tracking-[0.22em]" style={{ color: BRAND.yellow }}>
        Indigitous · {HACK.city} hub
      </p>
      <p
        className="mt-2 font-display font-extrabold leading-[0.9] tracking-tight"
        style={{ fontSize: "clamp(2.6rem, 9vw, 5.2rem)" }}
        aria-hidden
      >
        <span style={{ color: BRAND.yellow }}>#HACK</span>
        <span style={{ color: BRAND.orange }}>{HACK.year}</span>
      </p>
      <p
        className="mt-3 inline-block rounded-sm px-3 py-1 font-display text-[1.4rem] font-extrabold tracking-[0.4em] text-white sm:text-[1.8rem]"
        style={{ background: BRAND.orange }}
        aria-hidden
      >
        {HACK.city.toUpperCase()}
      </p>

      <dl className="mt-5 grid gap-px overflow-hidden rounded-md sm:grid-cols-2" style={{ background: `${BRAND.yellow}33` }}>
        {AT_A_GLANCE.map((row) => (
          <div key={row.when} className="flex flex-col gap-0.5 px-3.5 py-3" style={{ background: BRAND.ink2 }}>
            <dt className="flex items-center gap-2 font-display text-[1rem] font-bold" style={{ color: BRAND.yellow }}>
              {row.mode === "Online" ? <Laptop size={15} aria-hidden /> : <MapPin size={15} aria-hidden />}
              {row.when} · {row.time}
            </dt>
            <dd className="text-[0.86rem] leading-snug text-white/80">
              {row.what} <span className="font-semibold" style={{ color: BRAND.orange }}>· {row.mode}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {open ? (
          <a
            href={REGISTRATION.url}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="hack-register"
            className="group inline-flex items-center gap-2 rounded-full px-5 py-3 font-display text-[0.95rem] font-extrabold transition duration-300 ease-smooth hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={{ background: BRAND.yellow, color: BRAND.ink }}
          >
            Register · {REGISTRATION.fee}
            <ArrowUpRight size={17} strokeWidth={2.4} aria-hidden />
          </a>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <ChampionPills topic="late" verb="Ask" />
          </div>
        )}
        <p className="font-technical text-[0.75rem] uppercase tracking-[0.16em] text-white/70">
          {open ? `Takes under a minute · closes ${REGISTRATION.closesLabel}` : `Closed ${REGISTRATION.closesLabel}`}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* what's next: works itself out from the schedule                     */
/* ------------------------------------------------------------------ */

function NextUp({ now }: { now: number | null }) {
  if (now === null) return null;
  const closes = Date.parse(REGISTRATION.closes);
  const live = EVENTS.find((e) => now >= Date.parse(e.start) && now < Date.parse(e.end));
  const next = EVENTS.find((e) => Date.parse(e.start) > now);

  let label: string;
  let body: ReactNode;
  if (live) {
    label = "Happening now";
    body = (
      <>
        <strong className="text-fg">{live.title}</strong>, {when(live)}. {live.where}.
      </>
    );
  } else if (next) {
    label = `Next up in ${until(Date.parse(next.start) - now)}`;
    const goal = CHECK_IN_GOALS[next.start.slice(0, 10)];
    body = (
      <>
        <strong className="text-fg">{next.title}</strong>, {when(next)}. {next.where}.
        {goal && <> Aim to have: {goal.charAt(0).toLowerCase() + goal.slice(1)}.</>}
      </>
    );
  } else {
    label = "That's a wrap";
    body = <>#HACK2026 Dubai has finished. Thank you to every team, mentor and host who built with us.</>;
  }

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]" aria-live="polite">
      <Card className="flex items-start gap-3 !py-3.5">
        <IconTile>
          <CalendarDays size={20} strokeWidth={2.2} aria-hidden />
        </IconTile>
        <div>
          <p className="font-technical text-[0.72rem] uppercase tracking-[0.16em] text-accent-deep">{label}</p>
          <p className="mt-1 text-[0.92rem] leading-snug text-fg-soft">{body}</p>
        </div>
      </Card>
      {now < closes && (
        <Card className="flex flex-col justify-center !py-3.5 sm:min-w-[13rem]">
          <p className="font-technical text-[0.72rem] uppercase tracking-[0.16em] text-accent-deep">Registration closes in</p>
          <p className="mt-1 font-display text-[1.25rem] font-extrabold leading-none text-fg">{until(closes - now)}</p>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* media                                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* save the dates, and bring a friend                                  */
/* ------------------------------------------------------------------ */

const INVITE_HREF = `https://wa.me/?text=${encodeURIComponent(`${INVITE_MESSAGE} ${HACK.url}`)}`;

/** Copies the page link, and says so for two seconds. */
function CopyLink() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(HACK.url);
      setCopied(true);
    } catch {
      // No clipboard (an old browser, or permission denied): show the address.
      window.prompt("Copy this link:", HACK.url);
    }
  };
  return (
    <button type="button" onClick={copy} className={`${pill} border border-line bg-panel text-fg hover:border-accent/40`}>
      {copied ? <Check size={15} strokeWidth={2.4} aria-hidden className="text-[#1FA855]" /> : <Link2 size={15} strokeWidth={2.3} aria-hidden />}
      <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
    </button>
  );
}

/**
 * The two things a guest does after reading: put the dates in their calendar,
 * and pass the page to a friend. Invitations travel by personal message, so
 * the share is WhatsApp and a plain link, nothing that posts publicly.
 */
function SaveAndShare() {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <Card className="flex flex-col !py-4">
        <h2 className="font-display text-[1.05rem] font-bold text-fg">Save all 8 dates</h2>
        <p className="mt-1 text-[0.88rem] leading-snug text-fg-soft">
          The kickoff, team dinner, five check-ins and presentations, with a reminder an hour before each.
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <a
            href={HACK.calendarFile}
            download
            data-cta="hack-calendar"
            className={`${pill} bg-navy text-fg-onSolid shadow-solid hover:bg-navy-hover`}
          >
            <CalendarPlus size={15} strokeWidth={2.3} aria-hidden />
            Add to my calendar
          </a>
        </div>
      </Card>
      <Card className="flex flex-col !py-4">
        <h2 className="font-display text-[1.05rem] font-bold text-fg">Bring a friend</h2>
        <p className="mt-1 text-[0.88rem] leading-snug text-fg-soft">
          Know a designer, writer or video maker? Send them the page. Please share it personally rather than posting it.
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <a
            href={INVITE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="hack-invite"
            className={`${pill} border border-line bg-panel text-fg hover:border-[#1FA855]/50`}
          >
            <WhatsAppGlyph size={15} className="text-[#1FA855]" />
            Invite on WhatsApp
          </a>
          <CopyLink />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* what a hackathon is                                                 */
/* ------------------------------------------------------------------ */

function WhatIsHackathon() {
  const d = WHAT_IS.definition;
  return (
    <section aria-labelledby="what-title" className="mt-7 board:mt-5">
      <SectionIntro id="what-title" eyebrow={WHAT_IS.eyebrow} title={WHAT_IS.title} />
      <div className="grid gap-2 lg:grid-cols-[0.9fr_2fr]">
        {/* The dictionary card: the same definition the promo video lands on. */}
        <div
          className="flex flex-col justify-center rounded-card border-2 p-5 shadow-card"
          style={{ borderColor: BRAND.yellow, background: BRAND.ink }}
        >
          <p className="font-technical text-[0.72rem] uppercase tracking-[0.2em]" style={{ color: BRAND.yellow }}>
            <dfn className="not-italic">{d.word}</dfn> {d.say} · {d.kind}
          </p>
          <p className="mt-2 font-display text-[1.35rem] font-bold leading-snug text-white">{d.meaning}</p>
          <p className="mt-3 text-[0.85rem] text-white/70">
            Hack + marathon = <span style={{ color: BRAND.yellow }}>hackathon</span>. Not a coding competition.
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-3">
          {WHAT_IS.points.map((p, i) => (
            <li key={p.title}>
              <Card className="flex h-full flex-col">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[0.8rem] font-extrabold"
                    style={{ background: BRAND.yellow, color: BRAND.ink }}
                    aria-hidden
                  >
                    {i === 0 ? <Lightbulb size={15} strokeWidth={2.4} /> : i + 1}
                  </span>
                  <H3>{p.title}</H3>
                </div>
                <p className="mt-2 text-[0.88rem] leading-snug text-fg-soft">{p.body}</p>
                {p.link && (
                  <p className="mt-auto pt-3">
                    <a href={p.link.href} target="_blank" rel="noopener noreferrer nofollow" className={smallLink}>
                      {p.link.label}
                      <ArrowUpRight size={13} strokeWidth={2.3} aria-hidden />
                    </a>
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Media() {
  return (
    <div className="grid items-start gap-2 sm:grid-cols-3">
      <video
        className="aspect-[9/16] h-auto w-full rounded-card border border-line bg-black object-contain"
        width={720}
        height={1280}
        src="/hack/hack-dubai.mp4"
        poster="/hack/hack-dubai-poster.webp"
        controls
        playsInline
        preload="none"
        aria-label="#HACK2026 Dubai promo video"
      />
      <img
        src="/hack/poster-dark.webp"
        alt="#HACK2026 Dubai poster: You already have the skills. Let's use them for God. Kickoff online Thursday 8 October, team dinner Saturday 17 October, weekly online check-ins, presentations Saturday 21 November."
        width={1122}
        height={1402}
        loading="lazy"
        decoding="async"
        className="h-auto w-full rounded-card border border-line"
      />
      <img
        src="/hack/poster-yellow.webp"
        alt="#HACK2026 is happening in Dubai: poster with the Dubai skyline inside the word Dubai and the program dates."
        width={1122}
        height={1402}
        loading="lazy"
        decoding="async"
        className="h-auto w-full rounded-card border border-line"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* program tabs                                                        */
/* ------------------------------------------------------------------ */

function ProgramTable({ rows }: { rows: { time: string; what: string }[] }) {
  return (
    <table className="w-full text-left text-[0.9rem]">
      <thead className="sr-only">
        <tr>
          <th scope="col">Time</th>
          <th scope="col">What happens</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.time + r.what} className="border-t border-line first:border-t-0">
            <td className="w-16 py-2 pr-3 align-top font-technical text-[0.8rem] text-accent-deep">{r.time}</td>
            <td className="py-2 leading-snug text-fg-soft">{r.what}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A Google Calendar "add event" link, for people who live in Google Calendar. */
function googleCalendarHref(e: HackEvent): string {
  const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${HACK.title}: ${e.title}`,
    dates: `${utc(e.start)}/${utc(e.end)}`,
    details: `Details: ${HACK.url}`,
    location: e.where,
    ctz: "Asia/Dubai",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const smallLink = "inline-flex items-center gap-1 text-[0.8rem] font-semibold text-accent-deep underline-offset-2 hover:underline";

function EventCard({ e }: { e: HackEvent }) {
  return (
    <Card>
      <H3>{e.title}</H3>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 font-technical text-xs text-fg-faint">
        <span>{when(e)}</span>
        <span aria-hidden>·</span>
        <span>{e.where}</span>
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <a href={googleCalendarHref(e)} target="_blank" rel="noopener noreferrer" className={smallLink}>
          <CalendarPlus size={14} strokeWidth={2.2} aria-hidden />
          Google Calendar
        </a>
        <a href={HACK.calendarFile} download className={smallLink}>
          <CalendarPlus size={14} strokeWidth={2.2} aria-hidden />
          All dates (Apple, Outlook)
        </a>
      </p>
      {e.program && (
        <div className="mt-3">
          <ProgramTable rows={e.program} />
        </div>
      )}
    </Card>
  );
}

function Program() {
  const kickoff = EVENTS.find((e) => e.id === "kickoff")!;
  const dinner = EVENTS.find((e) => e.id === "team-dinner")!;
  const finale = EVENTS.find((e) => e.id === "presentations")!;
  const checkIns = EVENTS.filter((e) => e.id.startsWith("check-in"));
  return (
    <TabbedViews
      label="#HACK2026 Dubai program"
      views={[
        { id: "kickoff", label: "Kickoff", note: "8 Oct", content: <EventCard e={kickoff} /> },
        { id: "team-dinner", label: "Team dinner", note: "17 Oct", content: <EventCard e={dinner} /> },
        {
          id: "check-ins",
          label: "Check-ins",
          note: "Thursdays",
          content: (
            <Card>
              <H3>Weekly check-ins</H3>
              <p className="mt-1 font-technical text-xs text-fg-faint">Thursdays · 8:00 to 8:30pm · Google Meet</p>
              <p className="mt-2 text-[0.9rem] text-fg-soft">
                Each team has three minutes: what&rsquo;s done, what&rsquo;s next, and where you&rsquo;re stuck.
              </p>
              <div className="mt-3">
                <ProgramTable
                  rows={checkIns.map((e) => ({
                    time: dayFmt.format(new Date(e.start)).replace(/^\w+ /, ""),
                    what: CHECK_IN_GOALS[e.start.slice(0, 10)],
                  }))}
                />
              </div>
            </Card>
          ),
        },
        { id: "presentations", label: "Presentations", note: "21 Nov", content: <EventCard e={finale} /> },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function Hack() {
  const now = useNow();
  return (
    <>
      <PageHeader
        eyebrow={`${HACK.title} · Indigitous`}
        title={HACK.tagline}
        lede={HACK.lede}
        meta={
          <>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} strokeWidth={2.2} aria-hidden className="text-accent" />
              Online and in person · {HACK.city}, UAE · 8 Oct to 21 Nov 2026
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} strokeWidth={2.2} aria-hidden className="text-accent" />
              Led by {HACK.champions.join(" and ")}, #HACK Champions
            </span>
          </>
        }
        actions={
          <>
            <PrimaryAction href={REGISTRATION.url}>Register</PrimaryAction>
            {CHAMPION_CONTACTS.map((c) => (
              <GhostAction
                key={c.first}
                href={waLink(c, "join")}
                external
                cta={`hack-whatsapp-${c.first.toLowerCase()}`}
                icon={<WhatsAppGlyph size={15} className="text-[#1FA855]" />}
              >
                {c.first}
              </GhostAction>
            ))}
          </>
        }
      />

      <BrandSlab now={now} />
      <NextUp now={now} />
      <SaveAndShare />

      <WhatIsHackathon />

      {/* ---- who ---- */}
      <section aria-labelledby="who-title" className="mt-7 board:mt-5">
        <SectionIntro
          id="who-title"
          eyebrow="Who it's for"
          title="You don't need to be a programmer."
          lede="Every team needs designers, video makers, writers, testers and researchers as much as it needs code. If you're willing to learn, there's a seat for you."
        />
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ROLES.map((r, i) => (
            <li
              key={r}
              className="flex items-baseline gap-2.5 rounded-card border border-line bg-panel px-3.5 py-2.5 shadow-card"
            >
              <span className="font-technical text-[0.75rem] text-accent-deep" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[0.9rem] font-semibold text-fg">{r}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- what we're building ---- */}
      <section aria-labelledby="build-title" className="mt-7 board:mt-5">
        <SectionIntro
          id="build-title"
          eyebrow="The four challenges"
          title="One free website kit, built in four parts"
          lede="Each team builds one part of the kit, using sample content only. You choose your top two in a poll after the kickoff."
        />
        <ul className="grid gap-2 sm:grid-cols-2">
          {CHALLENGES.map((c, i) => {
            const Icon = CHALLENGE_ICONS[i];
            return (
              <li key={c.n}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-center gap-3">
                    <IconTile>
                      <Icon size={20} strokeWidth={2.2} aria-hidden />
                    </IconTile>
                    <div>
                      <p className="font-technical text-[0.7rem] uppercase tracking-[0.16em] text-accent-deep">Challenge {c.n}</p>
                      <H3>{c.title}</H3>
                    </div>
                  </div>
                  <p className="mt-3 text-[0.9rem] leading-snug text-fg-soft">{c.build}</p>
                  <p className="mt-auto pt-3 text-[0.8rem] text-fg-faint">
                    <Users size={13} aria-hidden className="mr-1 inline align-[-2px]" />
                    Good fit: {c.fit}
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[0.85rem] text-fg-faint">
          Tools: {TOOLS} The AI and design subscriptions are covered by your registration.
        </p>
      </section>

      {/* ---- media ---- */}
      <section aria-labelledby="media-title" className="mt-7 board:mt-5">
        <SectionIntro id="media-title" eyebrow="Watch and share" title="Pass it on to a friend who should be there" />
        <Media />
      </section>

      {/* ---- program ---- */}
      <section aria-labelledby="program-title" className="mt-7 board:mt-5">
        <SectionIntro
          id="program-title"
          eyebrow="The program"
          title="Six weeks, four gatherings"
          lede="Plus about three to five hours a week with your team, at times your team chooses. All times are Dubai time."
        />
        <Program />
      </section>

      {/* ---- register ---- */}
      <section id="register" aria-labelledby="register-title" className="mt-7 scroll-mt-24 board:mt-5">
        <SectionIntro id="register-title" eyebrow="Register" title={`${REGISTRATION.fee}, and four things to do now`} />
        <div className="grid gap-2 lg:grid-cols-[1fr_1.1fr]">
          <Card className="flex flex-col">
            <H3>What your {REGISTRATION.fee} covers</H3>
            <div className={`${prose} mt-2`}>
              <p>{REGISTRATION.covers}</p>
              <p>
                Pay by <strong className="text-fg">{REGISTRATION.closesLabel}</strong>. {REGISTRATION.pay}
              </p>
              <p className="text-fg-faint">{REGISTRATION.hardship}</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <a
                href={REGISTRATION.url}
                target="_blank"
                rel="noopener noreferrer"
                data-cta="hack-register-form"
                className={`${pill} bg-navy text-fg-onSolid shadow-solid hover:bg-navy-hover`}
              >
                Open the registration form
                <ArrowUpRight size={15} strokeWidth={2.3} aria-hidden />
              </a>
              <ChampionPills topic="fee" verb="Ask" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <IconTile>
                <ListChecks size={20} strokeWidth={2.2} aria-hidden />
              </IconTile>
              <H3>What to do now</H3>
            </div>
            <ol className="mt-3 space-y-2.5">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-display text-[0.8rem] font-extrabold"
                    style={{ background: BRAND.yellow, color: BRAND.ink }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <p className="text-[0.9rem] leading-snug text-fg-soft">
                    <strong className="text-fg">{s.title}.</strong> {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </section>

      {/* ---- presenting, and the rules ---- */}
      <section aria-labelledby="rules-title" className="mt-7 board:mt-5">
        <SectionIntro
          id="rules-title"
          eyebrow="How it works"
          title="Presenting on 21 November, and the ground rules"
        />
        <div className="grid gap-2 lg:grid-cols-2">
          <Card>
            <H3>Your presentation</H3>
            <div className={`${prose} mt-2`}>
              <p>{JUDGING.intro}</p>
              <p className="font-semibold text-fg">We look at four things:</p>
              <ul className="list-disc space-y-1 pl-5">
                {JUDGING.criteria.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="font-semibold text-fg">Two must-haves:</p>
              <ul className="list-disc space-y-1 pl-5">
                {JUDGING.musts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </Card>
          <Card>
            <H3>Ground rules</H3>
            <ul className={`${prose} mt-2 list-disc space-y-1.5 pl-5`}>
              {GROUND_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <div className="mt-4 rounded-md border-l-4 bg-canvas/60 px-4 py-3" style={{ borderColor: BRAND.yellow }}>
              <p className="font-technical text-[0.7rem] uppercase tracking-[0.16em] text-accent-deep">If someone asks what it's for</p>
              <p className="mt-1 font-display text-[1rem] italic leading-snug text-fg">&ldquo;{IF_ASKED}&rdquo;</p>
              <p className="mt-1 text-[0.85rem] text-fg-faint">That&rsquo;s true, and it&rsquo;s enough.</p>
            </div>
          </Card>
        </div>
      </section>

      {/* ---- questions ---- */}
      <section aria-labelledby="faq-title" className="mt-7 board:mt-5">
        <SectionIntro id="faq-title" eyebrow="Questions" title="Before you ask" />
        <div className="grid gap-2 sm:grid-cols-2">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-card border border-line bg-panel p-4 shadow-card">
              <summary className="cursor-pointer list-none font-display text-[1rem] font-bold text-fg marker:hidden">
                <span className="mr-2 inline-block text-accent transition group-open:rotate-45" aria-hidden>
                  +
                </span>
                {f.q}
              </summary>
              <p className="mt-2 text-[0.9rem] leading-snug text-fg-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---- close ---- */}
      <section aria-labelledby="close-title" className="mt-7 board:mt-5">
        <div className="flex flex-col gap-3 rounded-card border border-line bg-panel p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 id="close-title" className="font-display text-[1.15rem] font-bold text-fg">
              Can&rsquo;t join a team, but want to help?
            </h2>
            <p className="mt-1 text-[0.9rem] text-fg-soft">
              Mentors and people who will cheer the teams on are just as welcome. Message{" "}
              {HACK.champions.map((n) => n.split(" ")[0]).join(" or ")}, #HACK Champions in {HACK.city}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ChampionPills topic="help" />
          </div>
        </div>
      </section>
    </>
  );
}
