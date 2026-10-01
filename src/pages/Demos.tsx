import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Cpu,
  FileSpreadsheet,
  Inbox,
  LayoutGrid,
  MessagesSquare,
  PenLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import Reveal from "../components/ui/Reveal";
import PageHeader from "../components/page/PageHeader";
import Panel from "../components/page/Panel";
import PanelBoard from "../components/page/PanelBoard";
import { PrimaryAction } from "../components/page/PageActions";
import { fadeUp, stagger } from "../lib/motion";
import { track } from "../lib/analytics";
import {
  AI_LAB_CATEGORIES,
  AI_LAB_DEMOS,
  type AiLabCategoryId,
  type AiLabDemo,
} from "../data/aiLab";

// Every demo widget is code-split and only fetched when its card scrolls into
// view (see <LazyDemo/>), so landing on /ai-lab doesn't download ~35 tools'
// worth of JS up front.
const DemoChat = lazy(() => import("../components/demos/DemoChat"));
const DemoAsk = lazy(() => import("../components/demos/DemoAsk"));
const DemoExtract = lazy(() => import("../components/demos/DemoExtract"));
const DemoTranslate = lazy(() => import("../components/demos/DemoTranslate"));
const DemoWhatsApp = lazy(() => import("../components/demos/DemoWhatsApp"));
const DemoReview = lazy(() => import("../components/demos/DemoReview"));
const DemoReply = lazy(() => import("../components/demos/DemoReply"));
const DemoSocial = lazy(() => import("../components/demos/DemoSocial"));
const DemoSeo = lazy(() => import("../components/demos/DemoSeo"));
const DemoSummarize = lazy(() => import("../components/demos/DemoSummarize"));
const DemoLeadCapture = lazy(() => import("../components/demos/DemoLeadCapture"));
const DemoQuote = lazy(() => import("../components/demos/DemoQuote"));
const DemoAds = lazy(() => import("../components/demos/DemoAds"));
const DemoProduct = lazy(() => import("../components/demos/DemoProduct"));
const DemoProperty = lazy(() => import("../components/demos/DemoProperty"));
const DemoMenu = lazy(() => import("../components/demos/DemoMenu"));
const DemoBroadcast = lazy(() => import("../components/demos/DemoBroadcast"));
const DemoTriage = lazy(() => import("../components/demos/DemoTriage"));
const DemoInvoice = lazy(() => import("../components/demos/DemoInvoice"));
const DemoTone = lazy(() => import("../components/demos/DemoTone"));
const DemoAgent = lazy(() => import("../components/demos/DemoAgent"));
const DemoVoice = lazy(() => import("../components/demos/DemoVoice"));
const DemoReceipt = lazy(() => import("../components/demos/DemoReceipt"));
const DemoVisionProduct = lazy(() => import("../components/demos/DemoVisionProduct"));
const DemoOnDevice = lazy(() => import("../components/demos/DemoOnDevice"));
const DemoData = lazy(() => import("../components/demos/DemoData"));
const DemoAeo = lazy(() => import("../components/demos/DemoAeo"));
const DemoSection = lazy(() => import("../components/demos/DemoSection"));
const DemoProcess = lazy(() => import("../components/demos/DemoProcess"));
const DemoPipeline = lazy(() => import("../components/demos/DemoPipeline"));
const DemoRoi = lazy(() => import("../components/demos/DemoRoi"));
const DemoRepurpose = lazy(() => import("../components/demos/DemoRepurpose"));
const DemoLeadResponse = lazy(() => import("../components/demos/DemoLeadResponse"));
const DemoCritique = lazy(() => import("../components/demos/DemoCritique"));

type CatId = AiLabCategoryId;

const CATEGORIES = AI_LAB_CATEGORIES;

type Demo = AiLabDemo & { node: ReactNode };

/* The interactive widget for each catalogue entry, keyed by id. */
const NODES: Record<string, ReactNode> = {
  "agent": <DemoAgent />,
  "voice": <DemoVoice />,
  "vision-receipt": <DemoReceipt />,
  "vision-product": <DemoVisionProduct />,
  "ondevice": <DemoOnDevice />,
  "data": <DemoData />,
  "aeo": <DemoAeo />,
  "section": <DemoSection />,
  "process": <DemoProcess />,
  "pipeline": <DemoPipeline />,
  "roi": <DemoRoi />,
  "repurpose": <DemoRepurpose />,
  "leadresponse": <DemoLeadResponse />,
  "critique": <DemoCritique />,
  "assistant": (
      <DemoChat
        demo="assistant"
        greeting="Hi! I'm a demo assistant for a small business. Ask me anything a customer might, hours, services, getting a quote…"
        placeholder="Ask the assistant a question…"
        suggestions={["What services do you offer?", "Are you open on weekends?", "Can I get a quote?"]}
      />
  ),
  "lead": (
      <DemoChat
        demo="lead"
        greeting="Hey, tell me a bit about your business and what's slowing you down, and I'll figure out how I can help."
        placeholder="Tell it about your business…"
        suggestions={[
          "I run a small e-commerce store",
          "My tools don't talk to each other",
          "I need a website that converts",
        ]}
      />
  ),
  "receptionist": (
      <>
        <DemoChat
          demo="receptionist"
          greeting="Hi! I'm a bilingual AI receptionist, اسألني بالعربي أو بالإنجليزي 🙂 I can answer questions or book you an appointment. How can I help?"
          placeholder="Type in English or بالعربية…"
          suggestions={["I'd like to book an appointment", "ما هي ساعات العمل؟", "Where are you located?"]}
        />
        <DemoLeadCapture
          demo="receptionist"
          prompt="Want a bilingual receptionist like this?"
          sub="Drop your WhatsApp or email, I'll show you how it'd handle your customers, in Arabic and English."
        />
      </>
  ),
  "booking": (
      <DemoChat
        demo="booking"
        greeting="Hi! I can book you in 💆 Tell me what you'd like and when, أو راسلني بالعربي."
        placeholder="e.g. a haircut on Saturday afternoon…"
        suggestions={["Book a haircut for Saturday", "أبغى موعد تنظيف بشرة", "Do you have evening slots?"]}
      />
  ),
  "trades": (
      <DemoChat
        demo="trades"
        greeting="Hi! Tell me what's going on and where, and I'll help sort it: AC, plumbing, handyman…"
        placeholder="e.g. AC not cooling, 2BR in JLT…"
        suggestions={["My AC isn't cooling, JLT", "Kitchen sink is leaking", "Need a handyman this week"]}
      />
  ),
  "broadcast": <DemoBroadcast />,
  "whatsapp": <DemoWhatsApp />,
  "reply": <DemoReply />,
  "review": <DemoReview />,
  "translate": <DemoTranslate />,
  "triage": <DemoTriage />,
  "social": <DemoSocial />,
  "seo": <DemoSeo />,
  "ads": <DemoAds />,
  "product": <DemoProduct />,
  "property": <DemoProperty />,
  "menu": <DemoMenu />,
  "tone": <DemoTone />,
  "ask": <DemoAsk />,
  "extract": <DemoExtract />,
  "summarize": <DemoSummarize />,
  "quote": <DemoQuote />,
  "invoice": <DemoInvoice />,
};

const DEMOS: Demo[] = AI_LAB_DEMOS.map((demo) => ({ ...demo, node: NODES[demo.id] }));

function catLabel(id: CatId): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "";
}

/** Neutral placeholder shown while a demo's chunk hasn't been fetched yet. */
function DemoSkeleton() {
  return (
    <div
      aria-hidden
      className="min-h-[180px] animate-pulse rounded-2xl border border-cream/10 bg-ink-deep/40"
    />
  );
}

/**
 * Mounts (and therefore downloads) a demo widget only once its card is within
 * ~500px of the viewport. Keeps the initial /ai-lab payload small. Also fires
 * a one-time `demo_engage` analytics event on the first interaction.
 */
function LazyDemo({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Deep links (#demo-id) land on the demo instantly; mount it right away.
  const [show, setShow] = useState(false);
  const engaged = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.location.hash === `#${id}`) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resolve the URL after matching the server snapshot
      setShow(true);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "500px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id]);

  const onEngage = () => {
    if (engaged.current) return;
    engaged.current = true;
    track("demo_engage", { demo: id });
  };

  return (
    <div ref={ref} onPointerDown={onEngage} onKeyDown={onEngage}>
      {show ? <Suspense fallback={<DemoSkeleton />}>{children}</Suspense> : <DemoSkeleton />}
    </div>
  );
}

/** Per-demo conversion link: "build this for my business". */
function DemoCta({ demo }: { demo: Demo }) {
  return (
    <a
      href="/contact"
      data-cursor="link"
      onClick={() => track("demo_cta", { demo: demo.id })}
      className="group mt-5 inline-flex items-center gap-2 py-1 text-sm font-medium text-gold transition-colors hover:text-gold-soft"
    >
      Build this for my business
      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

function DemoCard({ demo }: { demo: Demo }) {
  const Icon = demo.icon;
  return (
    <div id={demo.id} className="scroll-mt-28 glass border-glow rounded-3xl p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold ring-1 ring-gold/20">
          <Icon size={22} strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold/80">{demo.eyebrow}</p>
            <span className="hidden shrink-0 rounded-full border border-cream/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-dark sm:inline">
              {catLabel(demo.category)}
            </span>
          </div>
          <h2 className="mt-1 text-2xl text-cream sm:text-[1.7rem]">{demo.title}</h2>
          <p className="mt-2 text-sm text-muted">{demo.blurb}</p>
        </div>
      </div>
      <div className="mt-6">
        <LazyDemo id={demo.id}>{demo.node}</LazyDemo>
      </div>
      <DemoCta demo={demo} />
    </div>
  );
}

const PIPELINE: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: FileSpreadsheet, title: "Your leads", text: "Connect the Google Sheet, Excel, or CRM your contacts already live in: no migration." },
  { icon: Sparkles, title: "AI personalizes", text: "Every lead gets a unique, on-brand opener with their name, interest and city woven in." },
  { icon: Send, title: "Sent on WhatsApp", text: "Delivered through the official WhatsApp Business API with your pre-approved templates." },
  { icon: Inbox, title: "AI handles replies", text: "Two-way, the AI answers questions, qualifies, and books, then hands you a warm lead. Status synced to your CRM." },
];

function ProductionPipeline() {
  return (
    <div className="relative mt-8 border-t border-cream/10 pt-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold/80">How it works in production</p>
      <h3 className="mt-1.5 text-lg text-cream sm:text-xl">From your spreadsheet to their WhatsApp, on autopilot</h3>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PIPELINE.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="relative rounded-2xl border border-cream/10 bg-ink-deep/40 p-4">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold/10 text-gold ring-1 ring-gold/20">
                  <Icon size={17} strokeWidth={1.7} />
                </span>
                <span className="font-mono text-[11px] text-muted-dark">0{i + 1}</span>
              </div>
              <h4 className="mt-3 text-sm font-semibold text-cream">{s.title}</h4>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">{s.text}</p>
              {i < PIPELINE.length - 1 && (
                <ArrowRight
                  size={16}
                  aria-hidden
                  className="absolute -right-[11px] top-1/2 hidden -translate-y-1/2 text-gold/50 lg:block"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-dark">
          <ShieldCheck size={15} className="mt-px shrink-0 text-gold/70" />
          Runs on the <span className="text-cream-dim">official WhatsApp Business Cloud API</span>, opt-in contacts,
          Meta-approved templates, billed per conversation. Built for you in days, wired into the tools you already use.
        </p>
        <a
          href="/contact"
          data-cursor="link"
          className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink-deep transition-colors hover:bg-navy-hover"
        >
          Book your free audit
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    </div>
  );
}

const FLAGSHIP_FAQ = [
  {
    q: "Will my WhatsApp number get banned?",
    a: "No. It runs on the official WhatsApp Business Cloud API with Meta-approved templates and opt-in contacts, the compliant route, not a grey-market blaster.",
  },
  {
    q: "Isn't this just spam?",
    a: "Only people who opted in get messaged, every message is personalized 1:1, and opting out is one tap. It reads like a person because the AI writes for each lead.",
  },
  {
    q: "What does it cost to run?",
    a: "You pay Meta a small per-conversation fee (cents, not dirhams). The build itself is a one-off, I'll scope it precisely in your free audit.",
  },
  {
    q: "How fast can it go live?",
    a: "Once your WhatsApp number is verified with Meta, a working pilot runs in days, not months.",
  },
];

function FlagshipFAQ() {
  return (
    <div className="relative mt-8 border-t border-cream/10 pt-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold/80">Questions you're probably asking</p>
      <div className="mt-4 flex flex-col gap-2">
        {FLAGSHIP_FAQ.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-cream/10 bg-ink-deep/40 px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-cream [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown size={16} className="shrink-0 text-gold/70 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function FeaturedDemo({ demo }: { demo: Demo }) {
  const Icon = demo.icon;
  return (
    <Reveal>
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[26px] border border-gold/30 bg-[linear-gradient(180deg,rgba(218,164,66,0.10),rgba(218,164,66,0.02)_40%,transparent)] p-6 shadow-solid sm:p-9">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-deep">
          <Sparkles size={12} /> Flagship offer
        </span>
        <div className="relative mt-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/30">
            <Icon size={24} strokeWidth={1.7} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold/80">{demo.eyebrow}</p>
            <h2 className="mt-1.5 text-2xl leading-tight text-cream sm:text-[2rem]">{demo.title}</h2>
            <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted">{demo.blurb}</p>
          </div>
        </div>
        <div className="relative mt-7">
          <LazyDemo id={demo.id}>{demo.node}</LazyDemo>
        </div>
        <ProductionPipeline />
        <FlagshipFAQ />
        <div className="relative">
          <DemoLeadCapture
            demo="whatsapp"
            prompt="Want this running on your lead list?"
            sub="Drop your WhatsApp or email and I'll show you exactly what it takes to set up for your business, free."
          />
        </div>
      </div>
    </Reveal>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-navy text-fg-onSolid shadow-solid"
          : "border border-cream/12 bg-cream/5 text-cream-dim hover:border-gold/40 hover:text-gold"
      }`}
    >
      {children}
    </m.button>
  );
}

/* --------------------------------------------------------------------------
 * Views.
 *
 * Thirty-seven live tools cannot share a screen, so the lab opens as a board of
 * the five categories plus the flagship, and the catalogue sits one click
 * behind it. `?cat=` carries the view so any of them is linkable, and a
 * `#demo-id` deep link (the homepage pills use them) still resolves straight to
 * its tool by opening that tool's category first.
 * ----------------------------------------------------------------------- */

type View = CatId | "all" | "flagship";

const CAT_IDS = new Set<string>(CATEGORIES.map((c) => c.id));
const VIEW_IDS = new Set<string>([...CAT_IDS, "all", "flagship"]);

/** The glyph on each category's hub card. */
const CAT_ICON: Record<CatId, LucideIcon> = {
  frontier: Cpu,
  convert: TrendingUp,
  comms: MessagesSquare,
  create: PenLine,
  automate: Workflow,
};

/** What the URL asks for: a view, and a tool to scroll to once it renders. */
function readUrl(): { view: View | null; demo: string | null } {
  if (typeof window === "undefined") return { view: null, demo: null };
  const hash = window.location.hash.slice(1);
  const target = hash ? DEMOS.find((d) => d.id === hash) : undefined;
  if (target) {
    return { view: target.featured ? "flagship" : target.category, demo: target.id };
  }
  const cat = new URLSearchParams(window.location.search).get("cat");
  return { view: cat && VIEW_IDS.has(cat) ? (cat as View) : null, demo: null };
}

/** A left click with no modifier — the only one we handle ourselves. */
const plain = (event: ReactMouseEvent) =>
  !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0;

export default function Demos() {
  // `null` is the hub. Resolved from the URL after mount so the hydrated
  // markup still matches the prerendered hub.
  const [view, setViewState] = useState<View | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const apply = () => {
      const { view: next, demo } = readUrl();
      setViewState(next);
      if (demo) {
        // The card does not exist until the view above renders; bring it into
        // view on the next frame, once it does.
        requestAnimationFrame(() => document.getElementById(demo)?.scrollIntoView({ block: "start" }));
      }
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);

  // Keep ?cat= in the URL in sync (shareable) and report filter usage.
  const setView = (next: View | null) => {
    setViewState(next);
    setQuery("");
    track("ai_lab_filter", { category: next ?? "overview" });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("cat", next);
      else url.searchParams.delete("cat");
      url.hash = "";
      window.history.pushState(null, "", url);
      window.scrollTo({ top: 0 });
    }
  };

  /** Hub cards are real links, so only plain left clicks switch in place. */
  const open = (next: View) => (event: ReactMouseEvent) => {
    if (plain(event)) {
      event.preventDefault();
      setView(next);
    }
  };

  /** A name in the index: open its category, then bring the tool into view. */
  const openDemo = (demo: Demo) => (event: ReactMouseEvent) => {
    if (!plain(event)) return;
    event.preventDefault();
    setViewState(demo.featured ? "flagship" : demo.category);
    setQuery("");
    track("ai_lab_filter", { category: demo.category });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("cat");
      url.hash = demo.id;
      window.history.pushState(null, "", url);
      requestAnimationFrame(() =>
        document.getElementById(demo.id)?.scrollIntoView({ block: "start" }),
      );
    }
  };

  const featured = DEMOS.find((d) => d.featured);
  const rest = DEMOS.filter((d) => !d.featured);
  const q = query.trim().toLowerCase();
  const searching = q !== "";
  const onHub = !searching && view === null;

  const visible = searching
    ? rest.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.blurb.toLowerCase().includes(q) ||
          d.eyebrow.toLowerCase().includes(q),
      )
    : rest.filter((d) => view === "all" || d.category === view);

  const count = (id: CatId) => rest.filter((d) => d.category === id).length;

  return (
    <>
      {/* The search and the back control ride in the header's meta line
          rather than a row of their own, which cost 58px on a page that has to
          fit one screen.

          The meta line rather than the action slot: actions are shrink-0, so a
          field there narrowed the title column enough to wrap the h1 onto a
          second line at 1440, costing more height than the row it saved.

          Still one field, mounted once: it sits outside every conditional
          below, so typing never swaps it out from under the caret as the view
          changes. */}
      <PageHeader
        eyebrow={`AI Lab · ${DEMOS.length} tools`}
        title={<>Try the AI. Not just read about it.</>}
        lede="Practical AI tools for real business workflows: open a set, type into it, and see what AI does inside sales, service, content and operations."
        meta={
          <>
            <span>Practical demos · No sign-up · Your input isn't stored</span>
            {!onHub && (
              <button
                type="button"
                onClick={() => setView(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream/12 bg-cream/5 px-3 py-1.5 text-xs font-semibold text-cream-dim transition-colors hover:border-gold/40 hover:text-gold"
              >
                <ArrowLeft size={13} aria-hidden /> Overview
              </button>
            )}
            <label htmlFor="ai-lab-search" className="sr-only">
              Search the AI Lab tools
            </label>
            <div className="relative w-full sm:w-[17rem]">
              <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dark"
              />
              <input
                id="ai-lab-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search all ${DEMOS.length} tools…`}
                className="w-full rounded-full border border-cream/12 bg-cream/5 py-1.5 pl-9 pr-3 text-sm text-cream placeholder:text-muted-dark focus:border-gold/50 focus:outline-none"
              />
            </div>
          </>
        }
        actions={<PrimaryAction href="/contact">Book a free audit</PrimaryAction>}
      />

      {onHub && (
        <PanelBoard
          rail
          railLabel="AI Lab tools"
          cols="board:grid-cols-4"
          /* Tighter than the shared default at the board breakpoint only:
             this board carries seven cards where the others carry five, and
             the page has to fit one screen. The arbitrary variant reaches the
             inner grid's gap without changing PanelBoard for every page. */
          className="board:p-2 board:[&>div]:gap-2"
        >
          {featured && (
            <Panel
              icon={featured.icon}
              label={featured.eyebrow}
              blurb={featured.title}
              href="/ai-lab?cat=flagship"
              onClick={open("flagship")}
              span="sm:col-span-2"
              footer={
                <span className="inline-flex items-center gap-1.5 font-technical text-[0.7rem] font-bold uppercase tracking-[0.16em] text-accent-deep">
                  <Sparkles size={13} aria-hidden /> Run the live demo
                </span>
              }
            >
              <p className="text-[0.88rem] leading-snug text-fg-soft">{featured.blurb}</p>
            </Panel>
          )}

          {/* Every tool is named here, not just three per category: the hub is
              the page a crawler and a first-time visitor both land on, and the
              catalogue behind it is only reachable with JavaScript. A panel
              holding links cannot itself be one, so the heading carries the
              link to the category instead of the whole card. */}
          {CATEGORIES.map((c) => {
            const tools = rest.filter((d) => d.category === c.id);
            return (
              <Panel
                key={c.id}
                icon={CAT_ICON[c.id]}
                label={c.label}
                labelHref={`/ai-lab?cat=${c.id}`}
                onLabelClick={open(c.id)}
                className="board:gap-1.5 board:p-3"
              >
                {/* Dense on purpose. Every tool is listed rather than a
                    sample, so the only way to shorten these cards is to make
                    each pill smaller: at the board breakpoint the list is the
                    whole height of the card, and the card sets the height of
                    the row.

                    `min-h-6` is the floor, at every width. The board variants
                    had squeezed the pills to 20px tall, which fails WCAG 2.2
                    Target Size (Minimum) for 36 links with no inline-in-a-
                    sentence exception to lean on. Measured cost of the floor:
                    +19px at 1280, where the page is already over, and nothing
                    at 1440, where it still fits. */}
                <ul className="-mt-1 flex flex-wrap gap-1 board:gap-x-[0.2rem] board:gap-y-[0.12rem]">
                  {tools.map((d) => (
                    <li key={d.id}>
                      <a
                        href={`/ai-lab#${d.id}`}
                        onClick={openDemo(d)}
                        className="inline-flex min-h-6 items-center rounded-full border border-cream/12 bg-cream/5 px-2.5 py-1 text-xs leading-snug text-cream-dim transition hover:border-gold/40 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent board:px-1 board:py-[0.1rem] board:text-[0.68rem]"
                      >
                        {d.eyebrow}
                      </a>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}

          <Panel
            icon={LayoutGrid}
            label="Every tool"
            blurb={`All ${rest.length}, in one list, with the flagship on top.`}
            href="/ai-lab?cat=all"
            onClick={open("all")}
          />
        </PanelBoard>
      )}

      {!onHub && view === "flagship" && !searching && featured && (
        <section className="pb-8">
          <FeaturedDemo demo={featured} />
        </section>
      )}

      {!onHub && !(view === "flagship" && !searching) && (
        <section className="pb-8">
          {!searching && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <FilterPill active={view === "all"} onClick={() => setView("all")}>
                All <span className="opacity-50">{rest.length}</span>
              </FilterPill>
              {CATEGORIES.map((c) => (
                <FilterPill key={c.id} active={view === c.id} onClick={() => setView(c.id)}>
                  {c.label} <span className="opacity-50">{count(c.id)}</span>
                </FilterPill>
              ))}
            </div>
          )}

          {visible.length === 0 && (
            <div className="mx-auto max-w-md rounded-3xl border border-cream/10 bg-ink-deep/40 p-8 text-center">
              <p className="text-cream">No tools match “{query.trim()}”.</p>
              <p className="mt-2 text-sm text-muted">
                Try another word, or{" "}
                <a href="/contact" className="text-gold underline underline-offset-2 hover:text-gold-soft">
                  tell me what you need
                </a>{" "}
                and I'll build it.
              </p>
              <button
                type="button"
                onClick={() => setView(null)}
                className="mt-5 min-h-11 rounded-full border border-cream/12 bg-cream/5 px-4 py-2 text-sm text-cream-dim transition-colors hover:border-gold/40 hover:text-gold"
              >
                Clear search
              </button>
            </div>
          )}

          {/* keyed by view so the list re-staggers in on each change */}
          <m.div
            key={searching ? "search" : (view ?? "all")}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mx-auto flex max-w-3xl flex-col gap-6"
          >
            {visible.map((demo) => (
              <m.div key={demo.id} variants={fadeUp}>
                <DemoCard demo={demo} />
              </m.div>
            ))}
          </m.div>
        </section>
      )}

      {!onHub && (
        <Reveal>
          <div className="mx-auto mb-8 max-w-2xl rounded-3xl border border-gold/20 bg-[linear-gradient(180deg,rgba(218,164,66,0.08),transparent)] p-8 text-center sm:p-10">
            <h2 className="text-2xl text-cream sm:text-3xl">Like one of these? Let's build yours.</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              Every tool here is live and real, and I tune them to your business, your data, and your
              tone, then wire them into what you already use.
            </p>
            <a
              href="/contact"
              data-cursor="link"
              className="group mt-7 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-fg-onSolid shadow-solid transition-colors hover:bg-navy-hover"
            >
              Book your free audit
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </Reveal>
      )}
    </>
  );
}
