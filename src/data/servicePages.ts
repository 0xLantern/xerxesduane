import {
  Boxes,
  Code2,
  Bot,
  Search,
  ScanSearch,
  Sparkles,
  LayoutDashboard,
  Smartphone,
  ShoppingBag,
  Target,
  Palette,
  Film,
  type LucideIcon,
} from "lucide-react";

export interface ServiceBullet {
  title: string;
  body: string;
}

export interface ServiceFlow {
  /** Small label above the block heading. */
  label: string;
  /** The block heading. */
  title: string;
  /** One sentence of context under it. */
  note: string;
  /**
   * The four stages this particular service moves through. These are
   * descriptions of the work, not measurements — the block used to render
   * progress bars at made-up percentages, which meant nothing on any page.
   */
  stages: { name: string; detail: string }[];
}

export interface ServicePageData {
  slug: string;
  navLabel: string;
  icon: LucideIcon;
  /** <title> tag */
  metaTitle: string;
  /** meta description + og/twitter description */
  metaDescription: string;
  /** og:title / twitter:title */
  ogTitle: string;
  /** Service schema name for JSON-LD */
  jsonLdName: string;
  eyebrow: string;
  h1Lead: string;
  h1Accent: string;
  lede: string;
  /** Page-specific flow rendered under the header. */
  flow: ServiceFlow;
  bulletsHeading: string;
  bullets: ServiceBullet[];
  forWhoHeading: string;
  forWho: string[];
  /**
   * Sibling services worth a link from this one. It used to be the first six
   * entries of SERVICE_PAGES on every page, so /video-editing-dubai pointed at
   * Odoo and GEO and never at branding, and all thirteen pages shipped the same
   * six links.
   */
  related: string[];
  /**
   * Only the three search-visibility pages carry this. They compete for
   * overlapping queries, so each one states plainly what all three are for and
   * which to start with, rather than each quietly claiming the same ground.
   */
  compare?: {
    heading: string;
    intro: string;
    options: { slug: string; label: string; when: string }[];
    footnote: string;
  };
  /**
   * The client whose case study renders as proof on this page. Must match a
   * `CASE_STUDIES` entry exactly.
   *
   * It is a plain `string` because the type-level alternatives cost more than
   * they are worth: a `: CaseStudy[]` annotation widens `client` to `string`,
   * `satisfies` alone does not stop that widening, and `as const` turns the
   * array into a tuple whose members no longer share the optional `scope` and
   * `stats` fields that `ServicePage` reads. So the join is asserted in
   * `npm run check:pricing` instead, which is where the other silent data joins
   * are checked. It needed to be: `/ecommerce-development-dubai` named "Gilani
   * Mobility", a portfolio client with no case study, so `CASE_STUDIES.find`
   * returned undefined and the page rendered no proof while the source looked
   * as though it had some.
   */
  caseStudyClient?: string;
  /** Service-specific FAQs (rendered on the page + FAQPage JSON-LD). */
  faqs: { q: string; a: string }[];
}

export const SERVICE_PAGES: ServicePageData[] = [
  {
    slug: "odoo-erp-dubai",
    related: ["crm-development-dubai", "custom-software-development-dubai", "ai-automation-dubai"],
    navLabel: "Odoo / ERP",
    icon: Boxes,
    metaTitle: "Odoo ERP Implementation in Dubai - Xerxes Duane",
    metaDescription:
      "Odoo ERP setup and support in Dubai: inventory, sales, invoicing, CRM, and operations connected in one practical system. Book a free audit.",
    ogTitle: "Odoo ERP Implementation in Dubai",
    jsonLdName: "Odoo ERP Implementation & Administration",
    eyebrow: "Odoo & ERP · Dubai",
    h1Lead: "Run your whole business on one system,",
    h1Accent: "not five that don't talk.",
    lede: "Odoo ERP implementation in Dubai, set up and run properly. I wire inventory, sales, purchasing, invoicing, and CRM into a single source of truth, then stay on to support it. No bloated rollout you can't use, no consultant who disappears after go-live.",
    flow: {
      label: "One record, four stages",
      title: "What a single Odoo record passes through.",
      note: "The same order object carries through every stage, so nobody re-types a number that already exists.",
      stages: [
        { name: "Enquiry", detail: "A lead or order is raised once, against a customer record the whole system shares." },
        { name: "Quotation", detail: "Pricing, revisions and approvals stay attached to that record instead of scattering across email." },
        { name: "Inventory", detail: "Stock is committed when the order confirms, so the system and the shelf agree." },
        { name: "Delivery", detail: "The delivery note and invoice are generated from the order, not rebuilt by hand." },
      ],
    },
    bulletsHeading: "What an Odoo build with me looks like",
    bullets: [
      {
        title: "Scoped to how you actually work",
        body: "I configure Odoo around your real workflow, not a generic template. Only the modules you need, switched on in the right order.",
      },
      {
        title: "One source of truth",
        body: "Inventory, sales, purchasing, accounting, and customer data finally live in one place, so nothing falls through the cracks and you stop re-keying the same numbers.",
      },
      {
        title: "Migrated without the chaos",
        body: "I move your existing data in cleanly and test it before launch. Your team keeps working while I build in the background.",
      },
      {
        title: "Run and supported, not abandoned",
        body: "As your Odoo systems administrator, I handle updates, fixes, and new modules as you grow. One number to call, for years.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Small businesses outgrowing spreadsheets and disconnected apps",
      "Trading, retail, and service companies in the UAE",
      "Teams that need inventory, invoicing, and CRM in one place",
      "Owners who want Odoo run for them, not dumped on them",
    ],
    caseStudyClient: "Blocktec Philippines",
    faqs: [
      {
        q: "How long does an Odoo implementation take?",
        a: "A focused rollout of the core modules usually takes a few weeks. I phase it so your team keeps working while I build, and you see value before everything is switched on.",
      },
      {
        q: "Do I need Odoo Enterprise, or is Community enough?",
        a: "It depends on the modules you actually need. I'll tell you honestly which edition fits, so you're not paying for licenses you won't use.",
      },
      {
        q: "Can you connect Odoo to tools I already use?",
        a: "Yes. I integrate Odoo with your website, payment, and accounting tools so data flows automatically instead of being re-keyed by hand.",
      },
      {
        q: "I already started with Odoo and it's a mess. Can you help?",
        a: "Very common. I audit what's there, fix the configuration, and clean up the data rather than forcing you to start from scratch.",
      },
    ],
  },
  {
    slug: "web-development-dubai",
    related: ["landing-page-design-dubai", "ecommerce-development-dubai", "seo-dubai"],
    navLabel: "Web Development",
    icon: Code2,
    metaTitle: "Web Development in Dubai - Xerxes Duane",
    metaDescription:
      "Websites, web apps and landing pages for Dubai small businesses. Fast, mobile-first and search-ready, with fixed quotes and no lock-in. Book a free systems audit.",
    ogTitle: "Web Development in Dubai",
    jsonLdName: "Web Development & Web Applications",
    eyebrow: "Web Development · Dubai",
    h1Lead: "A website that brings in customers,",
    h1Accent: "not one that just sits there.",
    lede: "Web development in Dubai for small businesses that need their site to do real work. Fast, mobile-first websites, custom web apps, and landing pages that load quickly, rank well, and turn visitors into booked enquiries, built honestly, by one trusted partner.",
    flow: {
      label: "What the site has to carry",
      title: "From first tap to a booked enquiry.",
      note: "Each stage is a place a visitor can quietly leave, so each one gets built and tested on its own.",
      stages: [
        { name: "Load", detail: "Built mobile-first and kept light, so the page is usable before the visitor decides to wait." },
        { name: "Understand", detail: "The offer, the proof and the price sit where someone scanning can find them." },
        { name: "Trust", detail: "Real work, real names and clear terms, rather than stock claims." },
        { name: "Enquire", detail: "One obvious next step, wired to a form, a calendar or WhatsApp that actually reaches me." },
      ],
    },
    bulletsHeading: "What I build",
    bullets: [
      {
        title: "Websites that convert",
        body: "Clear, fast, mobile-first sites designed around one job: turning the right visitor into a lead. Built on solid foundations you own outright.",
      },
      {
        title: "Custom web apps",
        body: "Booking platforms, client portals, member areas, and internal tools, built around the way you run instead of forcing you into someone else's software.",
      },
      {
        title: "Landing pages & funnels",
        body: "Conversion-optimised pages wired to analytics, lead capture, and your CRM, so you can see exactly what your ad spend is doing.",
      },
      {
        title: "Built to be found",
        body: "Server-rendered, fast, and structured for search from day one. The site you're reading is built the same way.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Businesses whose current site brings in nothing",
      "Owners launching a new product, service, or location",
      "Teams that need a web app or portal, not just a brochure site",
      "Anyone tired of agencies who lock them out of their own site",
    ],
    faqs: [
      {
        q: "How much does a website cost?",
        a: "Every project gets a fixed quote up front after a short scope call, no hourly surprises. Most small-business sites start from a defined package.",
      },
      {
        q: "Will I own the site and the code?",
        a: "Yes, always. Everything is set up in your name and you keep full access to the site, hosting, and accounts, start to finish.",
      },
      {
        q: "Can you work with my existing website?",
        a: "Often, yes. I keep what's worth keeping and rebuild what isn't, rather than forcing a full restart.",
      },
      {
        q: "Is the site mobile-first and built to be found?",
        a: "Yes. Fast, mobile-first, and structured for search from day one, the site you're reading is built the same way.",
      },
    ],
  },
  {
    slug: "ai-automation-dubai",
    related: ["crm-development-dubai", "odoo-erp-dubai", "custom-software-development-dubai"],
    navLabel: "AI Automation",
    icon: Bot,
    metaTitle: "AI Automation in Dubai - Xerxes Duane",
    metaDescription:
      "AI automation in Dubai for small businesses: chatbots, workflows, and assistants that qualify leads, answer questions, and remove busywork.",
    ogTitle: "AI Automation in Dubai",
    jsonLdName: "AI Automation & Custom AI Workflows",
    eyebrow: "AI & Automation · Dubai",
    h1Lead: "Let AI do the repetitive work,",
    h1Accent: "so you can do the real work.",
    lede: "AI automation in Dubai, built around your business instead of bolted on for show. I design AI workflows, chatbots, and custom assistants that quietly run in the background, answering questions, qualifying leads, and giving you back the hours you've been losing.",
    flow: {
      label: "Where the automation sits",
      title: "What happens between the trigger and you.",
      note: "Automation earns its place only where a step is repetitive and the rules are clear enough to write down.",
      stages: [
        { name: "Trigger", detail: "A form, an inbox, a WhatsApp message or a scheduled run starts the workflow." },
        { name: "Read", detail: "The model extracts what matters from the message, document or record." },
        { name: "Decide", detail: "Rules you set decide what happens next, with the edge cases routed to a person." },
        { name: "Hand off", detail: "The result lands in your CRM, sheet or inbox with a trail you can check." },
      ],
    },
    bulletsHeading: "Where AI actually pays off",
    bullets: [
      {
        title: "Lead qualification on autopilot",
        body: "An assistant that answers common questions, captures details, and routes hot leads to you, day and night, so nothing sits unanswered.",
      },
      {
        title: "Workflows that remove busywork",
        body: "Automate the copy-paste between your tools: enquiries to CRM, invoices to accounting, follow-ups that send themselves.",
      },
      {
        title: "Custom assistants for your team",
        body: "Internal AI tools trained on how your business works, so your staff get answers in seconds instead of digging through documents.",
      },
      {
        title: "Honest about what AI can't do",
        body: "I'll tell you where AI helps and where it's hype. You get the advantage without paying for buzzwords.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Owners drowning in repetitive admin and enquiries",
      "Teams losing leads because nobody replies fast enough",
      "Businesses curious about AI but unsure where it's worth it",
      "Anyone who wants automation that's actually maintained",
    ],
    faqs: [
      {
        q: "Is AI automation actually worth it for a small business?",
        a: "When it removes repetitive work or catches leads you'd otherwise miss, yes. I'll tell you where it pays off and where it's just hype.",
      },
      {
        q: "Will AI replace my team?",
        a: "No. It handles the repetitive parts so your team spends time on the work that genuinely needs a human.",
      },
      {
        q: "Is my data safe with AI tools?",
        a: "I design around tools and configurations that keep your data private and in your control, and I explain exactly what gets sent where.",
      },
      {
        q: "How do we start with automation?",
        a: "I map your current workflows in the free audit, then automate the highest-impact, lowest-risk steps first.",
      },
    ],
  },
  {
    slug: "seo-dubai",
    related: ["answer-engine-optimization-dubai", "generative-engine-optimization-dubai", "web-development-dubai"],
    compare: {
      heading: "SEO, AEO or GEO: which one do you actually need?",
      intro:
        "The three overlap more than the acronyms suggest, and almost nobody needs all three at once. Here is the split, in the order I would do them.",
      options: [
        {
          slug: "seo-dubai",
          label: "SEO",
          when: "You want to show up in the blue links and on Google Maps for the searches people type when they are ready to buy. If you are only doing one of the three, it is this one.",
        },
        {
          slug: "answer-engine-optimization-dubai",
          label: "AEO",
          when: "You already show up, and you want to be a candidate for the answer box above the links, where a question gets answered before anyone scrolls.",
        },
        {
          slug: "generative-engine-optimization-dubai",
          label: "GEO",
          when: "Your buyers research in ChatGPT, Gemini or Perplexity, and what those tools say about you matters as much as where you sit on a results page.",
        },
      ],
      footnote:
        "Most of the underlying work is shared — the technical foundations, the content and the entity signals feed all three — so starting with one is not wasted if you add another later.",
    },
    navLabel: "SEO",
    icon: Search,
    metaTitle: "SEO Services in Dubai - Xerxes Duane",
    metaDescription:
      "SEO in Dubai for keywords that convert: technical SEO, local search, and content for small businesses, with plain-English reporting.",
    ogTitle: "SEO Services in Dubai",
    jsonLdName: "Search Engine Optimisation (SEO)",
    eyebrow: "SEO · Dubai",
    h1Lead: "Get found by people ready to buy,",
    h1Accent: "not just ready to browse.",
    lede: "SEO in Dubai focused on the keywords that actually bring in customers. I fix the technical foundations, sharpen your local search presence, and build content that ranks, then show you, in plain numbers, what it's doing for the business.",
    flow: {
      label: "The order the work runs in",
      title: "Foundations first, then the pages that earn the click.",
      note: "Ranking is decided by search engines, so the work targets the things on your side of the line.",
      stages: [
        { name: "Fix", detail: "Crawlability, speed, duplicate pages, broken metadata and anything blocking indexing." },
        { name: "Local", detail: "Your Google Business Profile, service pages and location signals made consistent." },
        { name: "Content", detail: "Pages written for the searches that come from people ready to buy, not vanity terms." },
        { name: "Report", detail: "What moved, what did not, and what I would change next, in plain numbers." },
      ],
    },
    bulletsHeading: "How I approach SEO",
    bullets: [
      {
        title: "Technical foundations first",
        body: "Fast load times, crawlable pages, clean structured data, and mobile-first builds. The boring fixes that quietly decide whether you rank at all.",
      },
      {
        title: "Local search that wins Dubai",
        body: "Google Business Profile, local landing pages, and the on-page signals that put you in front of nearby customers searching right now.",
      },
      {
        title: "Keywords that convert",
        body: "I target search terms with real buying intent, the ones your competitors waste, instead of chasing traffic that never becomes a customer.",
      },
      {
        title: "Reporting in plain English",
        body: "You see rankings, traffic, and leads in numbers that mean something, with no jargon and no smoke and mirrors.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Local Dubai businesses invisible in search results",
      "Owners paying for ads but with no organic foundation",
      "Sites that look fine but never get found",
      "Anyone burned by SEO agencies that promised page one",
    ],
    caseStudyClient: "Wellington Cash for Cars",
    faqs: [
      {
        q: "How long until SEO shows results?",
        a: "Technical fixes can help within weeks; competitive rankings typically build over a few months. I focus on keywords that convert, not vanity traffic.",
      },
      {
        q: "Do you guarantee page-one rankings?",
        a: "No one credible can guarantee rankings. I guarantee the right work, transparent reporting, and a focus on terms that actually bring customers.",
      },
      {
        q: "What's included in your SEO work?",
        a: "Technical foundations, local search (Google Business Profile), on-page optimization, and content, all reported in plain numbers you can act on.",
      },
      {
        q: "Can you run Google Ads alongside SEO?",
        a: "Yes. I run Google and Meta ads alongside SEO so you get traffic now and compounding organic growth over time.",
      },
    ],
  },
  {
    slug: "answer-engine-optimization-dubai",
    related: ["seo-dubai", "generative-engine-optimization-dubai", "web-development-dubai"],
    compare: {
      heading: "SEO, AEO or GEO: which one do you actually need?",
      intro:
        "The three overlap more than the acronyms suggest, and almost nobody needs all three at once. Here is the split, in the order I would do them.",
      options: [
        {
          slug: "seo-dubai",
          label: "SEO",
          when: "You want to show up in the blue links and on Google Maps for the searches people type when they are ready to buy. If you are only doing one of the three, it is this one.",
        },
        {
          slug: "answer-engine-optimization-dubai",
          label: "AEO",
          when: "You already show up, and you want to be a candidate for the answer box above the links, where a question gets answered before anyone scrolls.",
        },
        {
          slug: "generative-engine-optimization-dubai",
          label: "GEO",
          when: "Your buyers research in ChatGPT, Gemini or Perplexity, and what those tools say about you matters as much as where you sit on a results page.",
        },
      ],
      footnote:
        "Most of the underlying work is shared — the technical foundations, the content and the entity signals feed all three — so starting with one is not wasted if you add another later.",
    },
    navLabel: "AEO",
    icon: ScanSearch,
    metaTitle: "Answer Engine Optimization (AEO) in Dubai - Xerxes Duane",
    metaDescription:
      "AEO in Dubai: get quoted by Google AI Overviews, voice assistants, and featured snippets with answer-first content and structured data.",
    ogTitle: "Answer Engine Optimization (AEO) in Dubai",
    jsonLdName: "Answer Engine Optimization (AEO)",
    eyebrow: "AEO · Dubai",
    h1Lead: "Be the answer customers hear,",
    h1Accent: "not the link they scroll past.",
    lede: "Answer Engine Optimization (AEO) in Dubai. When someone asks a question your business can answer, the box above the links is what they read. I structure your pages to be a candidate for it: question-led headings, the answer in the first sentence, and markup an engine can parse. Whether it quotes you on a given day is the engine's decision, not a promise I can make.",
    flow: {
      label: "How a page becomes a candidate",
      title: "Structured so the answer is easy to lift.",
      note: "Whether an engine quotes you on a given day is its decision. This is the part that is in your control.",
      stages: [
        { name: "Question", detail: "The page is built around a question a buyer actually types, phrased the way they type it." },
        { name: "Answer", detail: "The answer sits in the first sentence under the heading, complete on its own." },
        { name: "Markup", detail: "Schema describes what is visibly on the page, so the markup and the content agree." },
        { name: "Check", detail: "The questions get re-run over time to see what the engines are showing instead." },
      ],
    },
    bulletsHeading: "What the work involves",
    bullets: [
      {
        title: "Answer-first content",
        body: "I reshape your key pages to answer real questions clearly and concisely, the exact format answer engines lift word-for-word.",
      },
      {
        title: "Structured data that matches the page",
        body: "I mark up what the page actually shows, so an engine can parse your answers rather than guess at them. Note that FAQ rich results have been limited to well-known government and health sites since Google's August 2023 change, so FAQ markup here is for machine readability, not a snippet tactic.",
      },
      {
        title: "Topic & entity authority",
        body: "I build the depth and internal links that make your site the obvious source on the questions that matter to your buyers.",
      },
      {
        title: "Aimed at the questions, not the keyword",
        body: "I work from the questions your buyers actually type, including the 'People Also Ask' cluster around them, so the page answers the thing being asked rather than ranking for a phrase near it.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Businesses losing clicks to Google's AI answer boxes",
      "Service providers people find by asking questions",
      "Owners who want to show up in voice search",
      "Anyone whose FAQs could be earning snippets",
    ],
    faqs: [
      {
        q: "What's the difference between SEO and AEO?",
        a: "SEO gets you ranked in the list of links. AEO gets you quoted as the answer above them, in featured snippets, voice results, and Google's AI Overviews. They work best together.",
      },
      {
        q: "How is AEO different from GEO?",
        a: "AEO targets search answer features (snippets, voice, AI Overviews). GEO targets generative chatbots like ChatGPT and Perplexity. I often run both.",
      },
      {
        q: "Do I need brand-new content for AEO?",
        a: "Usually not. I reshape what you already have into clear, structured answers and add schema, rather than starting from scratch.",
      },
      {
        q: "How do you measure AEO results?",
        a: "I track snippet and 'People Also Ask' wins, Search Console impressions, and where your answers appear, all in plain reporting.",
      },
    ],
  },
  {
    slug: "generative-engine-optimization-dubai",
    related: ["seo-dubai", "answer-engine-optimization-dubai", "web-development-dubai"],
    compare: {
      heading: "SEO, AEO or GEO: which one do you actually need?",
      intro:
        "The three overlap more than the acronyms suggest, and almost nobody needs all three at once. Here is the split, in the order I would do them.",
      options: [
        {
          slug: "seo-dubai",
          label: "SEO",
          when: "You want to show up in the blue links and on Google Maps for the searches people type when they are ready to buy. If you are only doing one of the three, it is this one.",
        },
        {
          slug: "answer-engine-optimization-dubai",
          label: "AEO",
          when: "You already show up, and you want to be a candidate for the answer box above the links, where a question gets answered before anyone scrolls.",
        },
        {
          slug: "generative-engine-optimization-dubai",
          label: "GEO",
          when: "Your buyers research in ChatGPT, Gemini or Perplexity, and what those tools say about you matters as much as where you sit on a results page.",
        },
      ],
      footnote:
        "Most of the underlying work is shared — the technical foundations, the content and the entity signals feed all three — so starting with one is not wasted if you add another later.",
    },
    navLabel: "GEO",
    icon: Sparkles,
    metaTitle: "Generative Engine Optimization (GEO) in Dubai - Xerxes Duane",
    metaDescription:
      "GEO in Dubai. I shape your content, entities and citations so ChatGPT, Gemini and Perplexity have accurate material to draw on. Book a free systems audit.",
    ogTitle: "Generative Engine Optimization (GEO) in Dubai",
    jsonLdName: "Generative Engine Optimization (GEO)",
    eyebrow: "GEO · Dubai",
    h1Lead: "Be accurate where the AI tools",
    h1Accent: "your customers ask are reading.",
    lede: "Generative Engine Optimization (GEO) in Dubai. Some buyers now research with ChatGPT, Gemini or Perplexity before they open a search box at all. I shape your content, entities and citations so those engines have something accurate to draw on when your category comes up. No one controls what a model outputs, so this is measured by how often and how accurately you are surfaced, and reported either way.",
    flow: {
      label: "What a model can draw on",
      title: "Accurate source material, checked over time.",
      note: "No one controls what a model outputs. What can be controlled is whether the material it reads is right.",
      stages: [
        { name: "Source", detail: "Pages that state facts plainly, so a summary of them is still accurate." },
        { name: "Entity", detail: "Name, services, location and links made consistent everywhere they appear." },
        { name: "Presence", detail: "Profiles, directories and third-party pages corrected where they already exist." },
        { name: "Monitor", detail: "Real prompts re-run on a schedule, and reported whether the answer flatters you or not." },
      ],
    },
    bulletsHeading: "What the work involves",
    bullets: [
      {
        title: "Content worth citing",
        body: "Clear, factual, sourced content with the specifics a model needs — real figures, real scope, real limits. Vague copy gives an engine nothing to quote.",
      },
      {
        title: "Entity & authority signals",
        body: "I strengthen how AI models understand who you are, what you do, and why you're credible, across the web, not just your own site.",
      },
      {
        title: "Presence where models read",
        body: "I get your business represented in the directories, profiles, and sources these engines actually draw their answers from.",
      },
      {
        title: "Prompt testing and monitoring",
        body: "I run the prompts your buyers actually use across the major engines and record what comes back, including the runs where you are not mentioned. Answers shift between runs, so this is a trend line, not a scoreboard.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Businesses whose buyers research with ChatGPT or Perplexity",
      "Owners who've noticed AI tools never mention them",
      "Brands that want to be the AI-recommended option",
      "Anyone future-proofing beyond traditional search",
    ],
    faqs: [
      {
        q: "Is GEO real, or just hype?",
        a: "It's early but real: a growing share of buyers ask AI tools for recommendations before they ever Google. GEO makes sure you're in those answers. I'm honest that it's an emerging channel, not a magic switch.",
      },
      {
        q: "How is GEO different from SEO and AEO?",
        a: "SEO ranks you in search; AEO wins answer features; GEO gets you surfaced and cited inside generative chatbots like ChatGPT and Perplexity. They overlap and reinforce each other.",
      },
      {
        q: "Can you guarantee ChatGPT will recommend me?",
        a: "No one credible can guarantee what a model outputs. What I can do is meaningfully improve how often and how accurately the major engines surface you, and report on it.",
      },
      {
        q: "How do you measure GEO?",
        a: "I test real buyer prompts across the major AI engines and track mentions, accuracy, and citations over time.",
      },
    ],
  },
  {
    slug: "custom-software-development-dubai",
    related: ["odoo-erp-dubai", "crm-development-dubai", "mobile-app-development-dubai"],
    navLabel: "Custom Software",
    icon: Code2,
    metaTitle: "Custom Software Development in Dubai - Xerxes Duane",
    metaDescription:
      "Custom software development in Dubai: internal tools, client portals, workflow systems and integrations built around how your team actually works.",
    ogTitle: "Custom Software Development in Dubai",
    jsonLdName: "Custom Software Development",
    eyebrow: "Custom Software · Dubai",
    h1Lead: "Software shaped around your business,",
    h1Accent: "not the other way around.",
    lede: "Custom software development in Dubai for businesses that have outgrown generic tools. I build practical internal systems, client portals, workflow platforms, and integrations around how your team already operates, then keep them maintainable as you grow.",
    flow: {
      label: "Where a custom build fits",
      title: "Built around the work, not around a template.",
      note: "Most of this is deciding what not to build. The smallest system that removes the bottleneck wins.",
      stages: [
        { name: "Map", detail: "I sit with the actual process, including the spreadsheet everyone pretends is temporary." },
        { name: "Prototype", detail: "A rough version you can click, so the disagreements happen before the code does." },
        { name: "Build", detail: "The working system, with the integrations to whatever you already run." },
        { name: "Hand over", detail: "Documented and explained, so another developer could pick it up if you ever needed one." },
      ],
    },
    bulletsHeading: "What custom software can solve",
    bullets: [
      {
        title: "Internal tools that fit the work",
        body: "Replace spreadsheets and repetitive admin with focused tools designed around your actual process, permissions, and reporting needs.",
      },
      {
        title: "Client and partner portals",
        body: "Give customers, suppliers, or partners one secure place to submit requests, track progress, access documents, and communicate.",
      },
      {
        title: "Systems that connect",
        body: "Join your website, CRM, accounting, ERP, and third-party platforms so data moves automatically instead of being copied by hand.",
      },
      {
        title: "Built to remain understandable",
        body: "You get clear ownership, documentation, and a maintainable foundation, not a mysterious system only one developer can touch.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Businesses forcing generic software to fit a unique workflow",
      "Teams running important operations through spreadsheets",
      "Owners who need a portal, internal tool, or connected platform",
      "Growing companies ready to replace manual work properly",
    ],
    faqs: [
      {
        q: "How do I know if I need custom software?",
        a: "If your team repeatedly works around the limitations of existing tools, copies the same data between systems, or relies on fragile spreadsheets for core operations, a focused custom system may be worthwhile.",
      },
      {
        q: "How much does custom software development cost?",
        a: "It depends on the roles, the data and what the tool has to talk to. After the free audit I define the smallest useful version and put a fixed price in writing before any development starts, a range now would only be a guess.",
      },
      {
        q: "Can you improve an existing custom system?",
        a: "Yes. I first assess its code, hosting, security, and business fit, then recommend whether to repair, extend, or replace it.",
      },
      {
        q: "Will I own the software?",
        a: "Yes. Your agreement clearly defines ownership, access, hosting, and any third-party services before the project starts.",
      },
    ],
  },
  {
    slug: "crm-development-dubai",
    related: ["odoo-erp-dubai", "ai-automation-dubai", "custom-software-development-dubai"],
    navLabel: "CRM & Dashboards",
    icon: LayoutDashboard,
    metaTitle: "CRM Development & Setup in Dubai - Xerxes Duane",
    metaDescription:
      "CRM setup and development in Dubai: connected lead pipelines, customer databases, dashboards, and follow-up automation for growing small businesses.",
    ogTitle: "CRM Development & Setup in Dubai",
    jsonLdName: "CRM Development, Setup & Dashboards",
    eyebrow: "CRM & Dashboards · Dubai",
    h1Lead: "Know every lead, customer, and next step,",
    h1Accent: "without chasing spreadsheets.",
    lede: "CRM development and setup in Dubai for growing businesses that need a clear view of sales and customers. I organise your pipeline, connect your enquiry sources, automate follow-ups, and build dashboards your team will actually use.",
    flow: {
      label: "The path a lead takes",
      title: "One record, one pipeline, one place to look.",
      note: "A CRM is only worth having if the next action on every deal is visible without asking anyone.",
      stages: [
        { name: "Capture", detail: "Website forms, WhatsApp, calls and referrals all land as one record, not four." },
        { name: "Qualify", detail: "The questions that decide whether a lead is worth time are asked in the same order every time." },
        { name: "Assign", detail: "Ownership is explicit, so no enquiry sits waiting for someone else to pick it up." },
        { name: "Follow up", detail: "Reminders and sequences fire on the record, and the dashboard shows what has stalled." },
      ],
    },
    bulletsHeading: "What a useful CRM should give you",
    bullets: [
      {
        title: "One clean customer record",
        body: "Every enquiry, conversation, document, and next action sits in one place instead of being scattered across inboxes and spreadsheets.",
      },
      {
        title: "A pipeline everyone understands",
        body: "Clear stages, ownership, reminders, and follow-up rules make it obvious what needs attention and what is likely to close.",
      },
      {
        title: "Connected lead capture",
        body: "Website forms, ads, WhatsApp enquiries, and imports flow into the right pipeline with the source recorded automatically.",
      },
      {
        title: "Dashboards that answer real questions",
        body: "See lead volume, response time, conversion, revenue, and team activity without assembling a report by hand.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Teams losing leads between WhatsApp, email, and spreadsheets",
      "Owners who cannot see the real sales pipeline",
      "Businesses with a CRM nobody consistently uses",
      "Growing sales teams that need repeatable follow-up",
    ],
    // "CRM, Web & Brand ... a clearer lead-to-demo journey, organised around the
    // way the sales team actually works" is this page's promise, written down
    // by a client. It was reachable only from /case-studies.
    caseStudyClient: "Saladmaster UAE",
    faqs: [
      {
        q: "Which CRM should my business use?",
        a: "That depends on your workflow, team size, integrations, and budget. I assess the process first, then recommend whether Odoo, HubSpot, Zoho, or a focused custom solution fits best.",
      },
      {
        q: "Can you clean up our existing CRM?",
        a: "Yes. I can remove duplicates, simplify stages, improve fields and permissions, reconnect lead sources, and make reporting useful again.",
      },
      {
        q: "Can a CRM connect to WhatsApp and our website?",
        a: "Usually, yes. The exact integration depends on your CRM and WhatsApp setup, but capturing website enquiries and recording conversations is a common part of my work.",
      },
      {
        q: "How long does CRM setup take?",
        a: "A focused setup can take a few weeks. More complex migrations and integrations are phased so your team can start using the core pipeline early.",
      },
    ],
  },
  {
    slug: "mobile-app-development-dubai",
    related: ["custom-software-development-dubai", "web-development-dubai", "ecommerce-development-dubai"],
    navLabel: "Mobile & Web Apps",
    icon: Smartphone,
    metaTitle: "Mobile App Development in Dubai - Xerxes Duane",
    metaDescription:
      "Mobile and web app development in Dubai for booking, customer portals, memberships, and internal operations. Practical apps built to launch and grow.",
    ogTitle: "Mobile App Development in Dubai",
    jsonLdName: "Mobile & Web App Development",
    eyebrow: "Mobile & Web Apps · Dubai",
    h1Lead: "An app people have a reason to use,",
    h1Accent: "built for the work it needs to do.",
    lede: "Mobile and web app development in Dubai for businesses that need more than a website. I build booking platforms, customer portals, membership experiences, and internal apps with a focused first release and a clear path to grow.",
    flow: {
      label: "What ships in release one",
      title: "A first release small enough to finish.",
      note: "The first version exists to be used by real people, not to contain everything on the wishlist.",
      stages: [
        { name: "Core journey", detail: "The one thing the app must do well, built properly before anything else is added." },
        { name: "Accounts & data", detail: "Sign-in, records and the backend behind the screens people see." },
        { name: "Release", detail: "Store submission, review notes, and the unglamorous parts of actually shipping." },
        { name: "Iterate", detail: "What people do with it decides the next build, rather than what we assumed." },
      ],
    },
    bulletsHeading: "What I build into the right app",
    bullets: [
      {
        title: "A focused first release",
        body: "I define the smallest version that solves a real problem, so you can launch, learn, and improve without funding unnecessary features.",
      },
      {
        title: "Simple, purposeful journeys",
        body: "Every screen and action is designed around what the user needs to complete, with less friction and fewer dead ends.",
      },
      {
        title: "The systems behind the interface",
        body: "Authentication, notifications, payments, admin tools, analytics, and integrations are planned as part of the product, not afterthoughts.",
      },
      {
        title: "A foundation ready to grow",
        body: "I choose architecture and technology that fit the product, expected usage, and your ability to maintain it after launch.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Businesses launching a booking or membership platform",
      "Teams that need a customer or employee portal",
      "Founders validating a practical app idea",
      "Companies replacing a slow manual process with an app",
    ],
    faqs: [
      {
        q: "Should I build a mobile app or a web app?",
        a: "A web app is often the fastest and most economical starting point. Native mobile apps make sense when device features, app-store presence, or frequent mobile use are genuinely important.",
      },
      {
        q: "How much does app development cost?",
        a: "It depends on user roles, integrations, payments, notifications and how much goes into the first release. You get a fixed price in writing after the audit, once the scope is real, rather than a number now that moves later.",
      },
      {
        q: "Can you help define the app before building it?",
        a: "Yes. I map the users, core workflows, risks, and first-release features before development, so the project starts with a defensible scope.",
      },
      {
        q: "Do you provide support after launch?",
        a: "Yes. I can maintain, monitor, and improve the app after launch under a clear ongoing support arrangement.",
      },
    ],
  },
  {
    slug: "ecommerce-development-dubai",
    related: ["web-development-dubai", "odoo-erp-dubai", "landing-page-design-dubai"],
    navLabel: "E-Commerce",
    icon: ShoppingBag,
    metaTitle: "E-Commerce Development in Dubai - Xerxes Duane",
    metaDescription:
      "E-commerce development in Dubai: fast online stores, secure UAE payments, inventory connections, order workflows, and conversion-focused customer journeys.",
    ogTitle: "E-Commerce Development in Dubai",
    jsonLdName: "E-Commerce Development",
    eyebrow: "E-Commerce · Dubai",
    h1Lead: "An online store that makes buying easy,",
    h1Accent: "and running it manageable.",
    lede: "E-commerce development in Dubai for businesses that need the storefront and the operations behind it to work together. I build fast customer journeys, connect payments and inventory, and reduce the manual work between order and delivery.",
    flow: {
      label: "Order to doorstep",
      title: "The storefront and the operations behind it.",
      note: "Most store problems sit after the checkout button, where the customer cannot see them but feels them.",
      stages: [
        { name: "Browse", detail: "Search, filters and product pages that answer the question before it is asked." },
        { name: "Checkout", detail: "UAE payment methods and a checkout with as few steps as the order really needs." },
        { name: "Fulfil", detail: "Stock, order status and delivery connected, so the team is not copying orders by hand." },
        { name: "Measure", detail: "Tracking that shows where orders are lost, set up to respect analytics consent." },
      ],
    },
    bulletsHeading: "What a strong online store needs",
    bullets: [
      {
        title: "A smoother path to checkout",
        body: "Clear products, useful search and filtering, trusted payment options, and fewer distractions help more visitors complete their order.",
      },
      {
        title: "UAE-ready payments and delivery",
        body: "I configure suitable payment gateways, shipping rules, taxes, and customer communication around how you actually fulfil orders.",
      },
      {
        title: "Connected inventory and orders",
        body: "Your store can connect with ERP, accounting, CRM, and fulfilment workflows so the team does less copying and correcting.",
      },
      {
        title: "Measurement after launch",
        body: "Analytics, conversion tracking, and reporting show where customers drop out and which products or campaigns drive revenue.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Retailers launching or rebuilding an online store",
      "Businesses whose store and inventory do not match",
      "Teams manually processing online orders",
      "Brands that need better checkout conversion and reporting",
    ],
    faqs: [
      {
        q: "Which e-commerce platform should I use?",
        a: "It depends on your catalogue, operations, integrations, and internal team. I recommend the platform after understanding the business, rather than forcing every store onto the same stack.",
      },
      {
        q: "Can you connect the store to inventory or accounting?",
        a: "Yes. Connecting the storefront to ERP, inventory, CRM, accounting, or fulfilment tools is often where the biggest operational value sits.",
      },
      {
        q: "Can you improve an existing e-commerce store?",
        a: "Yes. I can audit its speed, user journey, analytics, checkout, product structure, and integrations before recommending focused improvements or a rebuild.",
      },
      {
        q: "Will the store work well on mobile?",
        a: "Yes. Mobile usability, speed, product discovery, and checkout are treated as core requirements, not a smaller version of desktop.",
      },
    ],
  },
  {
    slug: "landing-page-design-dubai",
    related: ["web-development-dubai", "seo-dubai", "branding-graphic-design-dubai"],
    navLabel: "Landing Pages",
    icon: Target,
    metaTitle: "Landing Page Design in Dubai - Xerxes Duane",
    metaDescription:
      "Landing page design in Dubai for campaigns, launches, and lead generation. Conversion-focused pages connected to analytics, forms, CRM, and follow-up.",
    ogTitle: "Landing Page Design in Dubai",
    jsonLdName: "Landing Page Design & Sales Funnels",
    eyebrow: "Landing Pages & Funnels · Dubai",
    h1Lead: "Turn campaign clicks into enquiries,",
    h1Accent: "not expensive exits.",
    lede: "Landing page design in Dubai for campaigns that need a clear job and measurable result. I shape the offer, remove distractions, connect lead capture and analytics, and make the follow-up happen quickly.",
    flow: {
      label: "One page, one job",
      title: "Everything on the page serves one action.",
      note: "A landing page fails at whichever step is weakest, so all four get built together rather than in turn.",
      stages: [
        { name: "Offer", detail: "What is being offered, to whom, and why now, decided before any design starts." },
        { name: "Page", detail: "A fast, single-purpose page with the distractions and extra links removed." },
        { name: "Capture", detail: "The form or booking step wired to wherever your leads are actually worked." },
        { name: "Follow up", detail: "The reply that goes out immediately, so interest is not left to cool." },
      ],
    },
    bulletsHeading: "What makes the page convert",
    bullets: [
      {
        title: "One clear offer",
        body: "The message, proof, and call to action are built around the visitor and campaign, instead of asking one page to say everything.",
      },
      {
        title: "Fast, focused design",
        body: "Mobile-first layouts, strong hierarchy, and fast loading keep attention on the next action and reduce campaign waste.",
      },
      {
        title: "Lead capture that connects",
        body: "Forms, WhatsApp, booking tools, CRM, and follow-up automation work together so leads do not disappear after submitting.",
      },
      {
        title: "Tracking you can trust",
        body: "Analytics and conversion events are set up clearly, so you can judge the campaign by leads and sales rather than clicks alone.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Businesses running Google or Meta campaigns",
      "Teams launching a product, event, or new service",
      "Owners whose homepage is trying to sell too many things",
      "Campaigns generating clicks but too few enquiries",
    ],
    faqs: [
      {
        q: "How is a landing page different from a website page?",
        a: "A landing page is designed around one audience, offer, and action. It removes the choices and general information that can distract campaign visitors.",
      },
      {
        q: "Can you write the landing page copy?",
        a: "Yes. I can shape the offer, structure the message, and refine the copy using your business knowledge, audience, and campaign intent.",
      },
      {
        q: "Can you connect it to my CRM or booking tool?",
        a: "Yes. Lead routing, CRM capture, calendar booking, WhatsApp, email follow-up, and conversion tracking can all be included.",
      },
      {
        q: "Can you improve an existing landing page?",
        a: "Yes. I review the offer, message hierarchy, mobile experience, speed, tracking, and follow-up before prioritising changes.",
      },
    ],
  },
  {
    slug: "branding-graphic-design-dubai",
    related: ["video-editing-dubai", "landing-page-design-dubai", "web-development-dubai"],
    navLabel: "Branding & Design",
    icon: Palette,
    metaTitle: "Branding & Graphic Design in Dubai - Xerxes Duane",
    metaDescription:
      "Branding and graphic design in Dubai for growing businesses: practical identities, marketing collateral, campaign graphics, and consistent visual systems.",
    ogTitle: "Branding & Graphic Design in Dubai",
    jsonLdName: "Branding & Graphic Design",
    eyebrow: "Branding & Graphic Design · Dubai",
    h1Lead: "Look as credible as the work",
    h1Accent: "you already deliver.",
    lede: "Branding and graphic design in Dubai for businesses that need clarity and consistency, not decoration for its own sake. I build useful visual identities and everyday marketing assets that help people recognise, understand, and trust you.",
    flow: {
      label: "From idea to everyday use",
      title: "A system your team can keep using without me.",
      note: "An identity is only finished when someone who was not in the room can apply it correctly.",
      stages: [
        { name: "Foundations", detail: "Logo, type, colour and the rules for using them, kept short enough to be read." },
        { name: "Core assets", detail: "The pieces you use constantly: profile, proposal, deck, social frames." },
        { name: "Templates", detail: "Editable files so routine work does not come back to a designer every time." },
        { name: "Handover", detail: "Source files, fonts and a guide that lives with you, not with me." },
      ],
    },
    bulletsHeading: "Design that earns its place",
    bullets: [
      {
        title: "Practical brand foundations",
        body: "Logo, typography, colour, visual direction, and simple usage rules give the business a recognisable and repeatable identity.",
      },
      {
        title: "Marketing collateral that stays consistent",
        body: "Presentations, brochures, proposals, signage, and sales materials feel like one business instead of unrelated files.",
      },
      {
        title: "Campaign and social graphics",
        body: "Flexible systems and templates help your team produce regular content without the brand slowly falling apart.",
      },
      {
        title: "Designed around the audience",
        body: "Every visual decision supports what the customer needs to understand, feel, or do next.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Growing businesses whose visuals no longer match their quality",
      "New brands that need a useful identity system",
      "Teams producing inconsistent marketing materials",
      "Campaigns that need clear, professional creative assets",
    ],
    faqs: [
      {
        q: "Do you only design logos?",
        a: "No. A logo can be part of the work, but the useful outcome is a coherent visual system your team can apply across real customer touchpoints.",
      },
      {
        q: "Can you work with our existing brand?",
        a: "Yes. I can refine, extend, and organise an existing identity without replacing recognisable elements that still work.",
      },
      {
        q: "What files will we receive?",
        a: "Deliverables depend on the project, but final assets are supplied in practical formats for digital, print, and internal use, with ownership and access clearly defined.",
      },
      {
        q: "Can you create ongoing campaign and social graphics?",
        a: "Yes. Ongoing creative support can sit inside a monthly partnership when the volume and workflow justify it.",
      },
    ],
  },
  {
    slug: "video-editing-dubai",
    related: ["branding-graphic-design-dubai", "landing-page-design-dubai", "web-development-dubai"],
    navLabel: "Photo & Video Editing",
    icon: Film,
    metaTitle: "Photo & Video Editing in Dubai - Xerxes Duane",
    metaDescription:
      "Photo and video editing in Dubai for reels, ads, interviews, events and brand films, plus photo retouching. Clean pacing, captions, colour, ready-to-post exports.",
    ogTitle: "Photo & Video Editing in Dubai",
    jsonLdName: "Photo & Video Editing",
    eyebrow: "Photo & Video Editing · Dubai",
    h1Lead: "Turn what you shot into something",
    h1Accent: "worth publishing.",
    lede: "Photo and video editing in Dubai for brands and teams who already have the material but need it finished. I edit for attention, understanding, and the platform the piece will actually live on, whether that is a thirty-second reel or a product shot that has to look right in a grid.",
    flow: {
      label: "From rushes to ready to post",
      title: "Cut for the platform it will actually live on.",
      note: "The same footage becomes a different edit depending on where it is going and who is watching it.",
      stages: [
        { name: "Select", detail: "I work through the rushes to find the takes that actually carry the point." },
        { name: "Cut", detail: "Structure and pacing set for the length and platform the piece is for." },
        { name: "Finish", detail: "Colour, sound, captions and motion, plus photo retouching matched to the same look." },
        { name: "Export", detail: "Correct sizes and formats for each destination, delivered ready to upload." },
      ],
    },
    bulletsHeading: "What happens in the edit",
    bullets: [
      {
        title: "The story gets clearer",
        body: "I find the useful moments, remove what slows the piece down, and shape a sequence that makes the message easy to follow.",
      },
      {
        title: "Pacing fits the platform",
        body: "A social reel, paid ad, interview, event film, and website video each need a different rhythm and structure.",
      },
      {
        title: "Captions and motion support the message",
        body: "Clean captions, graphics, callouts, and transitions improve understanding without turning the edit into visual noise.",
      },
      {
        title: "Photos are retouched and matched",
        body: "Product and campaign stills get cleanup, colour and exposure brought into line across a set, and backgrounds handled, so a grid of them looks like one shoot rather than twelve.",
      },
      {
        title: "Exports arrive ready to publish",
        body: "Final files are prepared in the agreed aspect ratios, sizes, lengths, and technical formats for each channel.",
      },
    ],
    forWhoHeading: "Who this is for",
    forWho: [
      "Brands with footage or shots sitting unused",
      "Teams producing regular reels and social content",
      "Campaigns needing multiple edits from one shoot",
      "Events and interviews that need a clear finished story",
      "Product photos that need to look consistent across a catalogue",
    ],
    faqs: [
      {
        q: "Can you edit footage or photos taken by someone else?",
        a: "Yes, and most of this work is exactly that. I first review the quality, audio, coverage and intended deliverables, then confirm what can be produced well before anything is agreed.",
      },
      {
        q: "Do you shoot as well as edit?",
        a: "No. This is post-production: you bring the footage and the photos, I finish them. If you still need the shoot itself, I would rather point you at someone who does that properly than take it on.",
      },
      {
        q: "How are revisions handled?",
        a: "The scope defines the included revision rounds and feedback process, so everyone knows how decisions and final approval will work.",
      },
      {
        q: "Can you create several social clips from one long video?",
        a: "Yes. Turning interviews, events, webinars, or long-form footage into a planned set of shorter clips is a common workflow.",
      },
      {
        q: "Do you add captions and motion graphics?",
        a: "Yes. Captions, titles, callouts, and restrained motion graphics can be included based on the content and platform.",
      },
    ],
  },
];

export function getServicePage(slug: string): ServicePageData | undefined {
  return SERVICE_PAGES.find((p) => p.slug === slug);
}
