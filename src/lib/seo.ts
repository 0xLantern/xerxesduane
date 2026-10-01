import { SERVICE_PAGES, getServicePage } from "../data/servicePages";
import { CASE_STUDIES, FAQS } from "../data/content";
import { CURRENCY, NONPROFIT, RATE_CARD, STARTER, UNIT_SCHEMA, aed, priceForSlug } from "../data/pricing";
import { INSIGHTS, getInsight } from "../data/insights";
import { SERVICE_PAGES_AR, getServicePageAr } from "../data/servicePagesAr";

export const SITE_ORIGIN = "https://www.xerxesduane.com";

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  /** Absolute URL of the social share image. Defaults to the site OG image. */
  ogImage?: string;
  /** Extra JSON-LD nodes serialized into the head (e.g. Service, FAQPage). */
  jsonLd?: Record<string, unknown>[];
  /** When true, emits robots noindex (e.g. 404). */
  noindex?: boolean;
  /**
   * Public by link but kept out of search and AI answers: noindex plus
   * nofollow/noarchive/nosnippet/noimageindex, and left out of the sitemap.
   * Implies `noindex`.
   */
  unlisted?: boolean;
  /** Open Graph locale for the route. Defaults to English. */
  locale?: "en_US" | "ar_AR";
  /** hreflang alternates (en/ar/x-default) for bilingual pages. */
  alternates?: { hreflang: string; href: string }[];
}

/** Reciprocal hreflang set for a service page that has an Arabic version. */
function serviceAlternates(slug: string): { hreflang: string; href: string }[] {
  if (!getServicePageAr(slug)) {
    return [
      { hreflang: "en", href: `${SITE_ORIGIN}/${slug}` },
      { hreflang: "x-default", href: `${SITE_ORIGIN}/${slug}` },
    ];
  }
  return [
    { hreflang: "en", href: `${SITE_ORIGIN}/${slug}` },
    { hreflang: "ar", href: `${SITE_ORIGIN}/ar/${slug}` },
    { hreflang: "x-default", href: `${SITE_ORIGIN}/${slug}` },
  ];
}

/**
 * Share cards, one per route, rendered by scripts/generate-og.mjs into
 * public/brand/og/. Every service page, insight and case study has its own;
 * the Arabic pages have Arabic ones. A route without a card of its own (the
 * legal pages, the 404) shows the home card. /ministry has its own, kept
 * in /ministry/ (see MINISTRY_META).
 */
const OG_DIR = `${SITE_ORIGIN}/brand/og`;
const ogCard = (name: string) => `${OG_DIR}/${name}.jpg`;
const DEFAULT_OG_IMAGE = ogCard("home");

/**
 * Bump this when a share image changes. Facebook/WhatsApp/LinkedIn cache the
 * OG image by URL for weeks, so a versioned query string forces them to fetch
 * the current image instead of serving a stale (or wrong) cached one.
 */
const OG_IMAGE_VERSION = "8";

/** Absolute, cache-busted share-image URL for a page. */
function ogImageUrl(image?: string): string {
  return `${image ?? DEFAULT_OG_IMAGE}?v=${OG_IMAGE_VERSION}`;
}

/** BreadcrumbList JSON-LD from a trail of { name, url } items. */
function breadcrumb(trail: { name: string; url: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  };
}

const HOME_CRUMB = { name: "Home", url: `${SITE_ORIGIN}/` };

/**
 * FAQPage schema for the page that actually renders these questions.
 *
 * It used to sit on `/`, which was true when the home page carried the FAQ
 * list. The list moved to `/contact` when the home page was compressed, and
 * the markup did not follow — so `/` was declaring nine questions a visitor
 * could not see there, which is exactly what Google's structured data policy
 * forbids. It is attached to `/contact` now, where FAQS is rendered.
 */
const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

/**
 * A Schema.org Offer for one service's starting price.
 *
 * `minPrice` on a PriceSpecification rather than a flat `price`, because
 * every figure here is a floor. Publishing it as an exact price would be a
 * different claim, and the one thing worse than hiding a price is stating one
 * you will not honour.
 *
 * `priceValidUntil` is deliberately absent: these are standing rates, not a
 * promotion, and a stale date makes Google drop the offer entirely.
 */
function offerFor(pageSlug: string, url: string): Record<string, unknown> | null {
  const point = priceForSlug(pageSlug);
  if (!point) return null;
  const { unitText, recurring } = UNIT_SCHEMA[point.unit];
  return {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    url,
    priceSpecification: {
      "@type": recurring ? "UnitPriceSpecification" : "PriceSpecification",
      priceCurrency: CURRENCY,
      minPrice: point.from,
      valueAddedTaxIncluded: false,
      ...(recurring
        ? { billingIncrement: 1, unitText, referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitText } }
        : { unitText }),
    },
  };
}

/**
 * Every published price as one catalogue, for the pricing page.
 *
 * This is the node an assistant reads when someone asks what a website costs
 * in Dubai: each entry pairs a service name with a number and a currency, so
 * the answer can be quoted without the model having to parse a table.
 */
function offerCatalog(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Starting prices",
    url: `${SITE_ORIGIN}/pricing`,
    provider: { "@id": `${SITE_ORIGIN}/#org` },
    itemListElement: RATE_CARD.map((point, i) => ({
      "@type": "Offer",
      position: i + 1,
      name: point.service,
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": UNIT_SCHEMA[point.unit].recurring ? "UnitPriceSpecification" : "PriceSpecification",
        priceCurrency: CURRENCY,
        minPrice: point.from,
        unitText: UNIT_SCHEMA[point.unit].unitText,
        valueAddedTaxIncluded: false,
      },
      itemOffered: {
        "@type": "Service",
        name: point.service,
        provider: { "@id": `${SITE_ORIGIN}/#org` },
        areaServed: { "@type": "City", name: "Dubai" },
      },
      eligibleCustomerType: "https://schema.org/Business",
    })),
  };
}

/**
 * The questions people type, answered in the words they would quote.
 *
 * Separate from the site-wide FAQS because these only make sense next to the
 * table: an assistant that lifts one of these answers should come away with a
 * figure and a currency, not a promise that someone will get back to them.
 */
/**
 * Exported because /pricing renders them. The FAQPage node below is only
 * legitimate while the page shows these questions to a visitor, so the data
 * and the markup read from the same array.
 */
export const PRICING_FAQS: { q: string; a: string }[] = [
  {
    q: "How much does a website cost in Dubai?",
    a: `A landing page starts at ${aed(2500)} and an e-commerce build at ${aed(9000)}. If the budget is tight, The Starter package is a fixed ${aed(2500)} for a complete one-page site. Every figure is a starting point; the exact price comes in a written proposal after a free 60-minute audit.`,
  },
  {
    q: "What is the cheapest option for a small business?",
    a: `The Starter package, at a fixed ${aed(2500)}. That is one page covering your offer, your proof and a contact route that lands in WhatsApp, built mobile-first and owned outright by you. It is a finished thing at a fixed price rather than a deposit on a larger project.`,
  },
  {
    q: "Do you offer discounts for non-profits, churches or charities?",
    a: `Yes. ${NONPROFIT.who} pay ${NONPROFIT.label} on everything, the entire rate card rather than one service. A landing page is ${aed(1250)} instead of ${aed(2500)}, and an Odoo rollout ${aed(6000)} instead of ${aed(12000)}. Send proof of registration with your enquiry and the proposal comes back at the reduced rate.`,
  },
  {
    q: "How much does Odoo ERP implementation cost in Dubai?",
    a: `An Odoo or ERP rollout starts at ${aed(12000)}. CRM and dashboard builds start at ${aed(4000)}, and AI automation at ${aed(6000)}. What you pay depends on how many processes move into the system, which the free audit scopes before anyone quotes.`,
  },
  {
    q: "Are these prices fixed?",
    a: "The published figures are floors, not quotes. After the free 60-minute audit you get a written proposal with real scope at a fixed price, so the number you agree is the number you pay. No hourly billing and no surprises mid-project.",
  },
];

const HOME_META: PageMeta = {
  title: "Xerxes Duane - Independent Systems Consultant in Dubai",
  description:
    "Websites, CRM, Odoo/ERP, WhatsApp, automation, ads, and AI connected into one practical operating system for small businesses.",
  canonical: `${SITE_ORIGIN}/`,
  // The search title keeps its keywords; the share title is the headline the
  // page and its card lead with.
  ogTitle: "Less admin. More business. | Xerxes Duane",
  alternates: [
    { hreflang: "en", href: `${SITE_ORIGIN}/` },
    { hreflang: "ar", href: `${SITE_ORIGIN}/ar` },
    { hreflang: "x-default", href: `${SITE_ORIGIN}/` },
  ],
  // Note: the global #org + #website graph lives in index.html (applies to all routes).
};

/** Normalise a pathname to a bare slug (no leading/trailing slashes). */
export function pathToSlug(path: string): string {
  return path.replace(/^\/+|\/+$/g, "");
}

/** Sitemap lastmod for a route: a post's own date, else the build-date fallback. */
export function routeLastmod(path: string, fallback: string): string {
  const slug = pathToSlug(path);
  if (slug.startsWith("insights/")) {
    const post = getInsight(slug.slice("insights/".length));
    if (post) return post.date;
  }
  return fallback;
}

/** All routes that should be prerendered, as absolute paths. */
export function allRoutes(): string[] {
  return [
    "/",
    "/about",
    "/services",
    "/pricing",
    "/starter",
    "/contact",
    "/projects",
    "/case-studies",
    ...CASE_STUDIES.map((study) => `/case-studies/${study.slug}`),
    "/portfolio",
    "/showreel",
    "/ai-lab",
    "/insights",
    "/privacy",
    "/terms",
    ...INSIGHTS.map((p) => `/insights/${p.slug}`),
    ...SERVICE_PAGES.map((p) => `/${p.slug}`),
    "/ar",
    ...SERVICE_PAGES_AR.map((p) => `/ar/${p.slug}`),
    ...UNLISTED_ROUTES,
  ];
}

/**
 * Prerendered so the link works, but never in the sitemap, never linked, and
 * never indexed. Each one also needs its X-Robots-Tag header in vercel.json
 * and its Disallow for AI crawlers in public/robots.txt.
 */
export const UNLISTED_ROUTES = ["/ministry"];

/** Whether a route belongs in the sitemap. */
export function isIndexable(path: string): boolean {
  const m = getPageMeta(path);
  return !m.noindex && !m.unlisted;
}

const HOME_ALTERNATES = [
  { hreflang: "en", href: `${SITE_ORIGIN}/` },
  { hreflang: "ar", href: `${SITE_ORIGIN}/ar` },
  { hreflang: "x-default", href: `${SITE_ORIGIN}/` },
];

const AR_HOME_META: PageMeta = {
  title: "Xerxes Duane | استوديو تقني للأعمال الصغيرة في دبي",
  description:
    "استوديو تقني متكامل في دبي للأعمال الصغيرة: مواقع وتطبيقات وأنظمة أودو ERP وأتمتة وذكاء اصطناعي وتحسين محركات البحث. احجز تدقيقًا مجانيًا لأنظمتك.",
  canonical: `${SITE_ORIGIN}/ar`,
  ogTitle: "Xerxes Duane | استوديو تقني للأعمال الصغيرة في دبي",
  ogImage: ogCard("ar-home"),
  locale: "ar_AR",
  alternates: HOME_ALTERNATES,
};

const PRICING_META: PageMeta = {
  title: "Pricing - Xerxes Duane",
  ogTitle: "Pricing - Xerxes Duane",
  canonical: `${SITE_ORIGIN}/pricing`,
  ogImage: ogCard("pricing"),
  description: `Published starting prices for websites, Odoo ERP, CRM, automation and AI in Dubai. Landing pages from ${aed(2500)}, Odoo from ${aed(12000)}. ${NONPROFIT.label} for charities.`,
  jsonLd: [
    offerCatalog(),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: PRICING_FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    breadcrumb([HOME_CRUMB, { name: "Pricing", url: `${SITE_ORIGIN}/pricing` }]),
  ],
};

const STARTER_META: PageMeta = {
  title: brandedTitle(`${STARTER.name} - a complete website for ${aed(STARTER.price)}`),
  ogTitle: `${STARTER.name} - a complete website for ${aed(STARTER.price)}`,
  canonical: `${SITE_ORIGIN}/${STARTER.slug}`,
  ogImage: ogCard("starter"),
  description: `A finished one-page website in Dubai for a fixed ${aed(STARTER.price)}. Mobile-first, WhatsApp contact, and yours outright. ${aed(STARTER.price * NONPROFIT.rate)} for churches and charities.`,
  jsonLd: [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: STARTER.name,
      serviceType: "Website design",
      provider: { "@id": `${SITE_ORIGIN}/#org` },
      areaServed: { "@type": "City", name: "Dubai" },
      url: `${SITE_ORIGIN}/${STARTER.slug}`,
      description: STARTER.tagline,
      // A flat `price`, not minPrice: this is the one thing on the site that
      // is genuinely fixed, and saying so is the entire product.
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        url: `${SITE_ORIGIN}/${STARTER.slug}`,
        price: STARTER.price,
        priceCurrency: CURRENCY,
        priceSpecification: {
          "@type": "PriceSpecification",
          price: STARTER.price,
          priceCurrency: CURRENCY,
          valueAddedTaxIncluded: false,
        },
      },
    },
    // The FAQPage node that used to sit here asked "What do you get for
    // AED 2,500?" and two more. The answers are on the page — as an includes
    // list and an excludes list — but the questions are not, and marking up
    // Q&A a visitor cannot see is what Google's policy forbids. Restore it
    // only alongside a visible question-and-answer block.
    breadcrumb([HOME_CRUMB, { name: STARTER.name, url: `${SITE_ORIGIN}/${STARTER.slug}` }]),
  ],
};

const ABOUT_META: PageMeta = {
  title: "About - Xerxes Duane",
  description:
    "Independent systems consultant in Dubai helping small businesses connect websites, CRM, Odoo/ERP, automation, ads, WhatsApp, and AI.",
  canonical: `${SITE_ORIGIN}/about`,
  ogTitle: "About - Xerxes Duane",
  ogImage: ogCard("about"),
  jsonLd: [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type": "Person",
        "@id": `${SITE_ORIGIN}/#xerxes`,
        name: "Xerxes Duane",
        jobTitle: "Independent Systems Consultant",
        worksFor: { "@id": `${SITE_ORIGIN}/#org` },
        image: `${SITE_ORIGIN}/brand/founder-xerxes.jpg`,
        url: `${SITE_ORIGIN}/about`,
        knowsAbout: [
          "Odoo Implementation",
          "Odoo Customization",
          "ERP",
          "CRM",
          "Business Process Automation",
          "Web Development",
        ],
      },
    },
    breadcrumb([HOME_CRUMB, { name: "About", url: `${SITE_ORIGIN}/about` }]),
  ],
};

const PROJECTS_META: PageMeta = {
  title: "Projects - Xerxes Duane",
  description:
    "Client systems, websites, brand and video work, and the live AI tools, built for small businesses in Dubai, the UAE and beyond.",
  canonical: `${SITE_ORIGIN}/projects`,
  ogTitle: "Projects - Xerxes Duane",
  ogImage: ogCard("projects"),
};

const CASE_STUDIES_META: PageMeta = {
  title: "Work - Xerxes Duane",
  description:
    "Real examples of websites, systems, automations, SEO, AI tools, and business workflows built to save time and increase leads.",
  canonical: `${SITE_ORIGIN}/case-studies`,
  ogTitle: "Work - Xerxes Duane",
  ogImage: ogCard("case-studies"),
  jsonLd: [
    breadcrumb([HOME_CRUMB, { name: "Case Studies", url: `${SITE_ORIGIN}/case-studies` }]),
  ],
};

const INSIGHTS_META: PageMeta = {
  title: "Insights - Xerxes Duane",
  description:
    "Xerxes Duane shares plain-English thinking on systems, Odoo, automation, and growth for small businesses in Dubai and beyond.",
  canonical: `${SITE_ORIGIN}/insights`,
  ogTitle: "Insights - Xerxes Duane",
  ogImage: ogCard("insights"),
  jsonLd: [breadcrumb([HOME_CRUMB, { name: "Insights", url: `${SITE_ORIGIN}/insights` }])],
};

const PRIVACY_META: PageMeta = {
  title: "Privacy Policy - Xerxes Duane",
  description:
    "How Xerxes Duane collects and uses information: contact enquiries, consent-based analytics, cookies, and your choices. Plain language, no data selling.",
  canonical: `${SITE_ORIGIN}/privacy`,
  ogTitle: "Privacy Policy - Xerxes Duane",
  jsonLd: [breadcrumb([HOME_CRUMB, { name: "Privacy Policy", url: `${SITE_ORIGIN}/privacy` }])],
};

const TERMS_META: PageMeta = {
  title: "Terms of Use - Xerxes Duane",
  description:
    "The terms for using the Xerxes Duane website: quotes, intellectual property, external links, liability, and governing law (UAE).",
  canonical: `${SITE_ORIGIN}/terms`,
  ogTitle: "Terms of Use - Xerxes Duane",
  jsonLd: [breadcrumb([HOME_CRUMB, { name: "Terms of Use", url: `${SITE_ORIGIN}/terms` }])],
};

const PORTFOLIO_META: PageMeta = {
  title: "Portfolio - Xerxes Duane",
  description:
    "Xerxes Duane's portfolio of website and brand & graphic design work for businesses across the UAE and beyond. See the craft, then book a free systems audit.",
  canonical: `${SITE_ORIGIN}/portfolio`,
  ogTitle: "Portfolio - Xerxes Duane",
  ogImage: ogCard("portfolio"),
  jsonLd: [breadcrumb([HOME_CRUMB, { name: "Portfolio", url: `${SITE_ORIGIN}/portfolio` }])],
};

/** Unlisted (see UNLISTED_ROUTES). No JSON-LD: nothing here should feed an entity graph. */
const MINISTRY_META: PageMeta = {
  title: "Ministry - Xerxes Duane",
  ogTitle: "Ministry - Xerxes Duane",
  description:
    "Xerxes Duane's church and ministry background: digital discipleship, youth training, preaching, worship and missions in the Middle East.",
  canonical: `${SITE_ORIGIN}/ministry`,
  // Its own share card, for the WhatsApp links the page travels by. Kept in
  // /ministry/, under the same noindex/noimageindex header as the page.
  ogImage: `${SITE_ORIGIN}/ministry/share.jpg`,
  noindex: true,
  unlisted: true,
};

const SHOWREEL_META: PageMeta = {
  title: "Showreel - Xerxes Duane",
  description:
    "Xerxes Duane's video editing, color grading, and animation: events, documentaries, social reels, and brand work across the UAE and beyond.",
  canonical: `${SITE_ORIGIN}/showreel`,
  ogTitle: "Showreel - Xerxes Duane",
  ogImage: ogCard("showreel"),
  jsonLd: [breadcrumb([HOME_CRUMB, { name: "Showreel", url: `${SITE_ORIGIN}/showreel` }])],
};

const AI_LAB_META: PageMeta = {
  title: "AI Lab - Live AI Tools You Can Try - Xerxes Duane",
  description:
    "Try live AI tools built for real business workflows: WhatsApp automation, bilingual Arabic/English assistants, lead qualification, invoices and more.",
  canonical: `${SITE_ORIGIN}/ai-lab`,
  ogTitle: "AI Lab - Xerxes Duane",
  ogImage: ogCard("ai-lab"),
  jsonLd: [breadcrumb([HOME_CRUMB, { name: "AI Lab", url: `${SITE_ORIGIN}/ai-lab` }])],
};

/**
 * Google cuts the SERP title at roughly 600px, which is about 60 characters at
 * typical widths. Where "<page> - Xerxes Duane" would run past that, the brand
 * suffix is the half worth dropping: the domain is already shown beside the
 * title, so the suffix is the only redundant part.
 */
const TITLE_MAX = 60;
function brandedTitle(title: string): string {
  const full = `${title} - Xerxes Duane`;
  return full.length <= TITLE_MAX ? full : title;
}

/**
 * Descriptions past ~160 characters get cut mid-word in the SERP. Cutting here
 * instead means the cut lands on a sentence or at worst a word boundary. A hard
 * `.slice(0, 160)` on the generated case-study descriptions had been ending one
 * of them on "...and convers".
 *
 * Applied in `buildHeadTags` so it covers generated and hand-written
 * descriptions alike; it is a no-op for anything already short enough.
 */
const DESCRIPTION_MAX = 160;
export function clampDescription(text: string): string {
  if (text.length <= DESCRIPTION_MAX) return text;
  const window = text.slice(0, DESCRIPTION_MAX + 1);
  const sentence = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("? "),
    window.lastIndexOf("! "),
  );
  if (sentence > DESCRIPTION_MAX / 2) return text.slice(0, sentence + 1);
  const word = window.lastIndexOf(" ");
  const cut = text.slice(0, word > 0 ? word : DESCRIPTION_MAX);
  return `${cut.replace(/[,;:\s]+$/, "")}...`;
}

export function getPageMeta(path: string): PageMeta {
  const slug = pathToSlug(path);
  if (slug === "") return HOME_META;
  if (slug === "services" || slug === "contact") {
    const title = slug === "services" ? "Services" : "FAQs & Contact";
    return {
      title: brandedTitle(title),
      ogTitle: `${title} - Xerxes Duane`,
      ogImage: ogCard(slug),
      canonical: `${SITE_ORIGIN}/${slug}`,
      description: slug === "services"
        ? "Explore website development, Odoo ERP, CRM, automation and AI services for businesses in Dubai, with scope and starting prices."
        : "Contact Xerxes Duane in Dubai. Book a free 60-minute systems audit, message on WhatsApp, or read the questions people ask first.",
      jsonLd: [
        breadcrumb([HOME_CRUMB, { name: title, url: `${SITE_ORIGIN}/${slug}` }]),
        // The FAQ list renders here, so the markup belongs here.
        ...(slug === "contact" ? [FAQ_SCHEMA] : []),
      ],
    };
  }
  if (slug === "pricing") return PRICING_META;
  if (slug === "starter") return STARTER_META;
  if (slug === "about") return ABOUT_META;
  if (slug === "ai-lab" || slug === "demos") return AI_LAB_META;
  if (slug === "projects") return PROJECTS_META;
  if (slug === "case-studies") return CASE_STUDIES_META;
  if (slug.startsWith("case-studies/")) {
    const study = CASE_STUDIES.find((item) => item.slug === slug.slice("case-studies/".length));
    if (study) {
      const canonical = `${SITE_ORIGIN}/case-studies/${study.slug}`;
      // Built from the study's own fields. All four used to share one generic
      // sentence, which gave Google four pages it could not tell apart.
      const sector = study.location.split("·").pop()?.trim();
      // "a automotive business" otherwise — the sectors are author-written, so
      // the article has to be chosen at render time rather than stored.
      const article = sector && /^[aeiou]/i.test(sector) ? "an" : "a";
      return {
        title: brandedTitle(`${study.client} - ${study.category} case study`),
        description:
          study.metaDescription ??
          `${study.category} for ${study.client}${sector ? `, ${article} ${sector.toLowerCase()} business` : ""}. ${study.summary}`,
        canonical,
        ogTitle: `${study.client} - ${study.category} case study`,
        ogImage: ogCard(`case-${study.slug}`),
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: `${study.client}: ${study.category}`,
            description: study.summary,
            author: { "@id": `${SITE_ORIGIN}/#xerxes` },
            publisher: { "@id": `${SITE_ORIGIN}/#org` },
            mainEntityOfPage: canonical,
          },
          breadcrumb([
            HOME_CRUMB,
            { name: "Case Studies", url: `${SITE_ORIGIN}/case-studies` },
            { name: study.client, url: canonical },
          ]),
        ],
      };
    }
  }
  if (slug === "insights") return INSIGHTS_META;
  if (slug === "privacy") return PRIVACY_META;
  if (slug === "terms") return TERMS_META;
  if (slug === "portfolio") return PORTFOLIO_META;
  if (slug === "showreel") return SHOWREEL_META;
  if (slug === "ministry") return MINISTRY_META;
  if (slug === "ar") return AR_HOME_META;

  // Arabic service pages.
  if (slug.startsWith("ar/")) {
    const ar = getServicePageAr(slug.slice("ar/".length));
    if (ar) {
      return {
        title: ar.metaTitle,
        description: ar.metaDescription,
        canonical: `${SITE_ORIGIN}/ar/${ar.slug}`,
        ogTitle: ar.metaTitle,
        ogImage: ogCard(`ar-${ar.slug}`),
        locale: "ar_AR",
        alternates: serviceAlternates(ar.slug),
        // Matches what the Arabic page actually renders, in Arabic. The English
        // twin has had this since it was written; the Arabic one had only the
        // site-wide organisation graph.
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: ar.navLabel,
            description: ar.lede,
            inLanguage: "ar",
            provider: { "@id": `${SITE_ORIGIN}/#org` },
            areaServed: { "@type": "City", name: "Dubai" },
            url: `${SITE_ORIGIN}/ar/${ar.slug}`,
          },
          breadcrumb([
            { name: "الرئيسية", url: `${SITE_ORIGIN}/ar` },
            { name: ar.navLabel, url: `${SITE_ORIGIN}/ar/${ar.slug}` },
          ]),
        ],
      };
    }
  }

  if (slug.startsWith("insights/")) {
    const post = getInsight(slug.slice("insights/".length));
    if (post) {
      const canonical = `${SITE_ORIGIN}/insights/${post.slug}`;
      return {
        title: brandedTitle(post.title),
        description: post.description,
        canonical,
        ogTitle: post.title,
        ogImage: ogCard(post.slug),
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            ...(post.updated ? { dateModified: post.updated } : {}),
            author: { "@type": "Person", name: post.author, "@id": `${SITE_ORIGIN}/#xerxes` },
            publisher: { "@id": `${SITE_ORIGIN}/#org` },
            mainEntityOfPage: canonical,
            image: ogCard(post.slug),
          },
          breadcrumb([
            HOME_CRUMB,
            { name: "Insights", url: `${SITE_ORIGIN}/insights` },
            { name: post.title, url: canonical },
          ]),
        ],
      };
    }
  }

  const page = getServicePage(slug);
  if (!page) {
    return {
      title: "Page Not Found - Xerxes Duane",
      description:
        "This page could not be found. Return to Xerxes Duane's website to explore systems consulting, AI tools, services, and work.",
      canonical: `${SITE_ORIGIN}${path === "/__not-found__" ? "/404" : path}`,
      ogTitle: "Page Not Found - Xerxes Duane",
      noindex: true,
    };
  }

  const canonical = `${SITE_ORIGIN}/${page.slug}`;
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    canonical,
    ogTitle: page.ogTitle,
    ogImage: ogCard(page.slug),
    alternates: serviceAlternates(page.slug),
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        name: page.jsonLdName,
        serviceType: page.jsonLdName,
        provider: { "@id": `${SITE_ORIGIN}/#org` },
        areaServed: { "@type": "City", name: "Dubai" },
        url: canonical,
        description: page.metaDescription,
        // Only the pages whose service is on the rate card carry a price.
        // An Offer without one is worse than none: it tells a crawler there
        // is something to sell and then declines to say what it costs.
        ...(offerFor(page.slug, canonical) ? { offers: offerFor(page.slug, canonical) } : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      breadcrumb([HOME_CRUMB, { name: page.navLabel, url: canonical }]),
    ],
  };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Robots directives for an unlisted page. Mirrored by X-Robots-Tag in vercel.json. */
export const UNLISTED_ROBOTS = "noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate";

/** Build the per-route <head> markup injected into the prerendered HTML. */
export function buildHeadTags(path: string): string {
  const m = getPageMeta(path);
  const description = clampDescription(m.description);
  const ogImage = ogImageUrl(m.ogImage);
  const locale = m.locale ?? "en_US";
  const localeAlternates = new Set<string>();
  if ((m.alternates ?? []).some((a) => a.hreflang === "ar") || locale === "ar_AR") {
    localeAlternates.add(locale === "ar_AR" ? "en_US" : "ar_AR");
  }
  const robots = m.unlisted
    ? UNLISTED_ROBOTS
    : m.noindex
      ? "noindex, follow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(m.canonical)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<meta name="googlebot" content="${m.unlisted ? robots : m.noindex ? "noindex, follow" : "index, follow"}" />`,
    ...(m.unlisted ? [`<meta name="bingbot" content="${robots}" />`] : []),
    `<meta property="og:url" content="${esc(m.canonical)}" />`,
    `<meta property="og:locale" content="${esc(locale)}" />`,
    ...[...localeAlternates].map((alt) => `<meta property="og:locale:alternate" content="${esc(alt)}" />`),
    `<meta property="og:title" content="${esc(m.ogTitle)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(ogImage)}" />`,
    `<meta property="og:image:secure_url" content="${esc(ogImage)}" />`,
    `<meta property="og:image:type" content="${ogImage.includes(".png") ? "image/png" : "image/jpeg"}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(m.ogTitle)}" />`,
    `<meta name="twitter:title" content="${esc(m.ogTitle)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(ogImage)}" />`,
    `<meta name="twitter:image:alt" content="${esc(m.ogTitle)}" />`,
  ];
  for (const a of m.alternates ?? []) {
    tags.push(`<link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}" />`);
  }
  for (const node of m.jsonLd ?? []) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(node)}</script>`,
    );
  }
  return tags.join("\n    ");
}
