import type { ReactNode } from "react";
import {
  Award,
  BookOpen,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  Church,
  Mail,
  MapPin,
  Phone,
  Quote,
  Users,
} from "lucide-react";
import WhatsAppGlyph from "../components/ui/WhatsAppGlyph";
import FaqList from "../components/FaqList";
import {
  AUDIENCES,
  COMPETENCIES,
  CONTACT_OWEN,
  EMAIL_BODY,
  EMAIL_SUBJECT,
  FACILITATOR,
  FAQS,
  HOW_IT_RUNS,
  NEXT_COHORT,
  OUTCOMES,
  PHASES,
  PROGRAM,
  TAKE_HOME,
  TESTIMONIALS,
  WHATSAPP_MESSAGE,
  YOU,
  type Phase,
} from "../data/leaderInYou";

/**
 * `/leader-in-you`: landing page for Dr. Owen Fernandes's 2-day leadership
 * masterclass in Dubai. Public and indexed (unlike /hack and /ministry).
 *
 * Every word comes from src/data/leaderInYou.ts. Read the note at the top of
 * that file before adding a price, a date or a claim: the source decks are
 * silent or inconsistent on some of them.
 */

const whatsappHref = `https://wa.me/${CONTACT_OWEN.whatsapp}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
const mailHref = `mailto:${CONTACT_OWEN.email}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`;

const ring =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
const btn = `group inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-display text-sm font-extrabold transition duration-300 ease-smooth hover:-translate-y-0.5 ${ring}`;

function WhatsAppButton({ cta, children }: { cta: string; children: ReactNode }) {
  return (
    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" data-cta={cta} className={`${btn} bg-accent text-accent-ink shadow-solid hover:bg-accent-hover`}>
      <WhatsAppGlyph size={16} />
      {children}
    </a>
  );
}

function EmailButton({ cta, children }: { cta: string; children: ReactNode }) {
  return (
    <a href={mailHref} data-cta={cta} className={`${btn} border border-line bg-panel text-fg hover:border-accent/50 hover:text-accent-deep`}>
      <Mail size={16} strokeWidth={2.2} aria-hidden />
      {children}
    </a>
  );
}

function SectionIntro({ id, eyebrow, title, lede }: { id: string; eyebrow: string; title: string; lede?: ReactNode }) {
  return (
    <div className="mb-6 max-w-[62ch]">
      <span className="eyebrow">
        <span className="h-px w-6 bg-accent/60" aria-hidden />
        {eyebrow}
      </span>
      <h2 id={id} className="mt-3 text-balance font-display text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-fg sm:text-[2.1rem]">
        {title}
      </h2>
      {lede && <p className="mt-3 text-[1rem] leading-relaxed text-fg-soft">{lede}</p>}
    </div>
  );
}

const card = "rounded-card border border-line bg-panel p-5 shadow-card";
const section = "mt-16 sm:mt-24 scroll-mt-20";

/* ------------------------------------------------------------------ */
/* hero                                                                */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <header id="top" className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
      <div>
        <span className="eyebrow">
          <span className="h-px w-6 bg-accent/60" aria-hidden />
          2-day leadership masterclass · Dubai
        </span>
        <h1 className="mt-4 text-balance font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-tight text-fg sm:text-[3.4rem]">
          Become the leader you <span className="text-accent-deep">always wanted</span> to be.
        </h1>
        <p className="mt-5 max-w-[56ch] text-[1.05rem] leading-relaxed text-fg-soft">
          <strong className="font-bold text-fg">{PROGRAM.name}</strong> is {PROGRAM.lede.charAt(0).toLowerCase() + PROGRAM.lede.slice(1)}
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <WhatsAppButton cta="leader-hero-whatsapp">Message Dr. Owen</WhatsAppButton>
          <EmailButton cta="leader-hero-email">Ask for the next dates</EmailButton>
        </div>

        <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 font-technical text-[0.82rem] font-semibold text-fg-soft">
          <li className="inline-flex items-center gap-1.5">
            <CalendarDays size={15} strokeWidth={2.2} className="text-accent" aria-hidden />
            {PROGRAM.duration}, in person
          </li>
          <li className="inline-flex items-center gap-1.5">
            <MapPin size={15} strokeWidth={2.2} className="text-accent" aria-hidden />
            {PROGRAM.city}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users size={15} strokeWidth={2.2} className="text-accent" aria-hidden />
            {PROGRAM.seats}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Award size={15} strokeWidth={2.2} className="text-accent" aria-hidden />
            {PROGRAM.certificate}
          </li>
        </ul>
      </div>

      {/* Y.O.U. */}
      <div className="relative">
        <div aria-hidden className="absolute -inset-4 -z-10 rounded-[2rem] bg-accent/10 blur-2xl" />
        <div className="overflow-hidden rounded-[1.6rem] border border-line bg-panel shadow-card-hover">
          <div className="bg-[linear-gradient(135deg,#5a0b43_0%,#8d1569_55%,#c4358f_100%)] px-6 py-6 text-white">
            <p className="font-technical text-[0.72rem] font-bold uppercase tracking-[0.2em] text-white/75">The Y.O.U. in leadership</p>
            <p className="mt-2 font-display text-[1.15rem] font-semibold italic leading-snug text-white/95">
              &ldquo;{PROGRAM.quote}&rdquo;
            </p>
          </div>
          <ol className="divide-y divide-line">
            {YOU.map((y) => (
              <li key={y.letter} className="flex items-center gap-4 px-6 py-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent font-display text-[1.6rem] font-extrabold text-accent-ink">
                  {y.letter}
                </span>
                <span className="font-display text-[1.05rem] font-extrabold text-fg">{y.title}</span>
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-between gap-4 border-t border-line bg-panel-alt px-6 py-4">
            <img
              src="/leader/ascend-higher-logo.webp"
              alt="Ascend Higher: Elevating Success"
              width={334}
              height={240}
              className="h-[3.2rem] w-auto rounded-md"
            />
            <p className="text-right text-[0.8rem] leading-snug text-fg-soft">
              Led by <strong className="text-fg">{FACILITATOR.name}</strong>
              <br />
              {FACILITATOR.company}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* sections                                                            */
/* ------------------------------------------------------------------ */

function WhatItIs() {
  return (
    <section aria-labelledby="what-title" className={section}>
      <SectionIntro
        id="what-title"
        eyebrow="Why it works"
        title="Leadership starts with leading yourself."
        lede="Most leadership training teaches techniques. The Leader in Y.O.U. starts earlier: with the person doing the leading. When you know your strengths, your blind spots and your motivators, your influence over others gets a lot easier."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {YOU.map((y) => (
          <div key={y.letter} className={card}>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent font-display text-[1.6rem] font-extrabold text-accent-ink">
              {y.letter}
            </span>
            <h3 className="mt-4 font-display text-[1.15rem] font-extrabold text-fg">{y.title}</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-fg-soft">{y.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhoFor() {
  const cols = [
    { data: AUDIENCES.work, icon: Briefcase },
    { data: AUDIENCES.church, icon: Church },
  ];
  return (
    <section aria-labelledby="who-title" className={section}>
      <SectionIntro
        id="who-title"
        eyebrow="Who it's for"
        title="For people others look to for direction."
        lede="Whether your team sits in an office or in a church hall, the work is the same: understanding people, starting with yourself."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {cols.map(({ data, icon: Icon }) => (
          <div key={data.title} className={`${card} sm:p-7`}>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-[0.9rem] bg-accent text-accent-ink">
                <Icon size={21} strokeWidth={2.2} aria-hidden />
              </span>
              <h3 className="font-display text-[1.3rem] font-extrabold text-fg">{data.title}</h3>
            </div>
            <p className="mt-3 text-[0.97rem] leading-relaxed text-fg-soft">{data.blurb}</p>
            <ul className="mt-4 divide-y divide-line-soft">
              {data.people.map((p) => (
                <li key={p.role} className="py-3">
                  <p className="font-display text-[0.98rem] font-bold text-fg">{p.role}</p>
                  <p className="mt-0.5 text-[0.9rem] leading-snug text-fg-soft">{p.note}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function PhaseCard({ p }: { p: Phase }) {
  return (
    <li className={`${card} relative`}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-display text-[0.95rem] font-extrabold text-accent-ink">
          {p.n}
        </span>
        <div>
          <h4 className="font-display text-[1.1rem] font-extrabold leading-tight text-fg">{p.name}</h4>
          <p className="font-technical text-[0.78rem] font-semibold text-accent-deep">{p.tag}</p>
        </div>
      </div>
      <p className="mt-3 text-[0.93rem] leading-relaxed text-fg-soft">{p.body}</p>
      <p className="mt-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[0.88rem] leading-snug text-fg">
        <strong className="font-bold">You leave with:</strong> {p.outcome}
      </p>
    </li>
  );
}

function Journey() {
  const days: { day: 1 | 2; title: string; sub: string }[] = [
    { day: 1, title: "Day 1: Know yourself", sub: "Assessment, awareness, alignment" },
    { day: 2, title: "Day 2: Put it into practice", sub: "Activity and accomplishment" },
  ];
  return (
    <section aria-labelledby="journey-title" className={section}>
      <SectionIntro
        id="journey-title"
        eyebrow="The two days"
        title="A five-phase journey from insight to action."
        lede="Each phase builds on the last. By the end of Day 2 you have a clear picture of your leadership, a plan, and new habits you have already started to practise."
      />
      <div className="grid gap-8 lg:grid-cols-2">
        {days.map((d) => (
          <div key={d.day}>
            <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-line pb-2">
              <h3 className="font-display text-[1.25rem] font-extrabold text-fg">{d.title}</h3>
              <span className="font-technical text-[0.78rem] font-semibold text-fg-faint">{d.sub}</span>
            </div>
            <ol className="space-y-4">
              {PHASES.filter((p) => p.day === d.day).map((p) => (
                <PhaseCard key={p.n} p={p} />
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function Competencies() {
  return (
    <section aria-labelledby="comp-title" className={section}>
      <SectionIntro
        id="comp-title"
        eyebrow="What you work on"
        title="Ten core competencies of high-impact leaders."
        lede="Practical, standalone modules you can start using the day you are back at work, or back in your ministry."
      />
      <ol className="grid gap-3 sm:grid-cols-2">
        {COMPETENCIES.map((c, i) => (
          <li key={c.title} className="rounded-card border border-line bg-panel p-4 shadow-card transition duration-300 ease-smooth hover:-translate-y-[3px] hover:border-accent/45 hover:shadow-card-hover">
            <div className="flex items-start gap-3">
              <span className="font-display text-[1.7rem] font-extrabold leading-none text-accent/80">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="font-display text-[1.02rem] font-extrabold leading-tight text-fg">{c.title}</h3>
                <p className="mt-0.5 font-technical text-[0.74rem] font-bold uppercase tracking-[0.1em] text-accent-deep">{c.theme}</p>
              </div>
            </div>
            <p className="mt-2.5 text-[0.9rem] leading-snug text-fg-soft">{c.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {OUTCOMES.map((o) => (
          <div key={o.title} className="rounded-card border border-accent/25 bg-accent-soft p-4">
            <h3 className="font-display text-[1rem] font-extrabold text-fg">{o.title}</h3>
            <p className="mt-1 text-[0.88rem] leading-snug text-fg-soft">{o.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TakeHome() {
  return (
    <section aria-labelledby="home-title" className={section}>
      <SectionIntro
        id="home-title"
        eyebrow="What you take home"
        title="Real feedback, real tools, a certificate."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TAKE_HOME.map((t, i) => {
          const Icon = [ClipboardCheck, BookOpen, BookOpen, Briefcase, Award, Users][i];
          return (
            <div key={t.title} className={card}>
              <span className="grid h-10 w-10 place-items-center rounded-[0.85rem] bg-accent text-accent-ink">
                <Icon size={19} strokeWidth={2.2} aria-hidden />
              </span>
              <h3 className="mt-3 font-display text-[1.05rem] font-extrabold text-fg">{t.title}</h3>
              <p className="mt-1.5 text-[0.92rem] leading-snug text-fg-soft">{t.body}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h3 className="font-display text-[1.2rem] font-extrabold text-fg">How it runs</h3>
        <ol className="mt-4 grid gap-4 md:grid-cols-4">
          {HOW_IT_RUNS.map((s, i) => (
            <li key={s.title} className="relative border-t-2 border-accent pt-3">
              <span className="font-technical text-[0.75rem] font-bold uppercase tracking-[0.14em] text-accent-deep">Step {i + 1}</span>
              <p className="mt-1 font-display text-[1rem] font-extrabold text-fg">{s.title}</p>
              <p className="mt-1 text-[0.9rem] leading-snug text-fg-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Facilitator() {
  return (
    <section aria-labelledby="owen-title" className={section}>
      <div className="grid gap-8 overflow-hidden rounded-[1.6rem] border border-line bg-panel p-6 shadow-card sm:p-9 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col justify-between gap-6">
          <div>
            <span className="eyebrow">
              <span className="h-px w-6 bg-accent/60" aria-hidden />
              Your facilitator
            </span>
            <h2 id="owen-title" className="mt-3 font-display text-[2rem] font-extrabold leading-tight tracking-tight text-fg">
              {FACILITATOR.name}
            </h2>
            <p className="mt-1 font-technical text-[0.9rem] font-semibold text-accent-deep">{FACILITATOR.role}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-3 sm:w-fit">
            <img src="/leader/ascend-higher-logo.webp" alt="Ascend Higher: Elevating Success" width={334} height={240} loading="lazy" className="h-24 w-auto" />
          </div>
        </div>
        <div>
          <p className="text-[1.02rem] leading-relaxed text-fg-soft">{FACILITATOR.bio}</p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {FACILITATOR.credentials.map((c) => (
              <li key={c} className="flex items-start gap-2.5 rounded-xl border border-line-soft bg-panel-alt px-3.5 py-2.5 text-[0.9rem] font-semibold leading-snug text-fg">
                <Award size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[0.9rem] text-fg-soft">
            More about Dr. Owen:{" "}
            <a href={FACILITATOR.personalSite} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-deep underline-offset-2 hover:underline">
              owenfernandes.com
            </a>{" "}
            ·{" "}
            <a href={FACILITATOR.site} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-deep underline-offset-2 hover:underline">
              ascendhigher.ae
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const [lead, ...rest] = TESTIMONIALS;
  return (
    <section aria-labelledby="voices-title" className={section}>
      <SectionIntro
        id="voices-title"
        eyebrow="In their words"
        title="What participants say."
        lede="Feedback from leaders who have attended Dr. Owen's workshops in the UAE, the US, Europe, Africa and Asia."
      />
      <figure className="relative overflow-hidden rounded-[1.6rem] bg-[linear-gradient(135deg,#5a0b43_0%,#8d1569_60%,#b52d85_100%)] p-7 text-white shadow-card-hover sm:p-10">
        <Quote size={44} strokeWidth={1.6} className="absolute right-6 top-6 text-white/15" aria-hidden />
        <blockquote className="max-w-[34ch] text-balance font-display text-[1.6rem] font-bold leading-snug sm:text-[2.1rem]">
          &ldquo;{lead.quote}&rdquo;
        </blockquote>
        <figcaption className="mt-5 font-technical text-[0.9rem] font-semibold text-white/85">
          {lead.who} · {lead.place}
        </figcaption>
      </figure>
      <div className="mt-4 gap-4 space-y-4 md:columns-2 lg:columns-3">
        {rest.map((t) => (
          <figure key={t.who + t.place} className={`${card} break-inside-avoid`}>
            <blockquote className="text-[0.95rem] leading-relaxed text-fg-soft">&ldquo;{t.quote}&rdquo;</blockquote>
            <figcaption className="mt-3 font-technical text-[0.8rem] font-bold text-accent-deep">
              {t.who} · {t.place}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Reserve() {
  return (
    <section id="reserve" aria-labelledby="reserve-title" className="mt-16 scroll-mt-20 sm:mt-24">
      <div className="overflow-hidden rounded-[1.8rem] bg-[linear-gradient(135deg,#46093a_0%,#7c1360_55%,#b02a82_100%)] p-7 text-white shadow-card-hover sm:p-12">
        <span className="font-technical text-[0.75rem] font-bold uppercase tracking-[0.18em] text-white/75">Reserve your seat</span>
        <h2 id="reserve-title" className="mt-3 max-w-[22ch] text-balance font-display text-[2rem] font-extrabold leading-[1.1] tracking-tight sm:text-[2.8rem]">
          Ready to lead from who you really are?
        </h2>
        <p className="mt-4 max-w-[58ch] text-[1.02rem] leading-relaxed text-white/85">
          {NEXT_COHORT
            ? `Next program: ${NEXT_COHORT.dates}.`
            : "Groups are kept to 12, so seats go quickly. Message Dr. Owen for the next dates, the venue and the fee."}{" "}
          Bringing a team from your company or church? Ask about a private program with a co-branded certificate.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="leader-reserve-whatsapp"
            className={`${btn} bg-white text-[#5a0b43] hover:bg-[#fdf2fa]`}
          >
            <WhatsAppGlyph size={16} />
            WhatsApp Dr. Owen
          </a>
          <a href={mailHref} data-cta="leader-reserve-email" className={`${btn} border border-white/40 text-white hover:bg-white/10`}>
            <Mail size={16} strokeWidth={2.2} aria-hidden />
            {CONTACT_OWEN.email}
          </a>
          <a href={CONTACT_OWEN.phoneHref} data-cta="leader-reserve-call" className={`${btn} border border-white/40 text-white hover:bg-white/10`}>
            <Phone size={16} strokeWidth={2.2} aria-hidden />
            {CONTACT_OWEN.phoneDisplay}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function LeaderInYou() {
  return (
    <>
      <Hero />
      <WhatItIs />
      <WhoFor />
      <Journey />
      <Competencies />
      <TakeHome />
      <Facilitator />
      <Testimonials />
      <FaqList heading="Questions, answered" items={FAQS} />
      <Reserve />
    </>
  );
}
