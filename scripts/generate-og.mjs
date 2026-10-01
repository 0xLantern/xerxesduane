// Social share cards: the image WhatsApp, Messenger, LinkedIn, X and Slack
// show when someone pastes a link to this site.
//
//   npm run og            (renders every card into public/brand/og/)
//
// Rendered in Chromium rather than resvg because resvg cannot read woff2, so
// the old cards fell back to a system sans; here the cards use the site's own
// Plus Jakarta Sans, palette and portrait, and look like the site they link
// to. Needs a Chromium: playwright-core finds its own if one is installed
// (`npx playwright install chromium`), or set CHROME_PATH to any Chrome.
//
// Output is 1200x630 JPEG, the size every platform shows as a large preview,
// kept well under WhatsApp's ~300 KB limit (above it the preview can be
// dropped). After changing a card, bump OG_IMAGE_VERSION in src/lib/seo.ts:
// the platforms cache these by URL for weeks.
//
// Copy rule: no prices and no counts in the images. A figure baked into a
// PNG goes stale silently the day pricing.ts changes; the page carries those.
//
// /ministry has its own card, but it is saved under public/ministry/ rather
// than brand/og/: the page is unlisted, and that folder is where the
// X-Robots-Tag noindex/noimageindex header and the AI-crawler Disallow in
// robots.txt already apply. The link-preview crawlers (WhatsApp, Messenger,
// LinkedIn) can still fetch it; they are not in that Disallow.
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "brand", "og");
mkdirSync(outDir, { recursive: true });

const dataUri = (path, type) => `data:${type};base64,${readFileSync(path).toString("base64")}`;
const FONT_LATIN = dataUri(join(root, "public", "fonts", "plus-jakarta-sans-var.woff2"), "font/woff2");
const FONT_AR_500 = dataUri(join(root, "scripts", "og", "fonts", "ibm-plex-sans-arabic-500.woff2"), "font/woff2");
const FONT_AR_700 = dataUri(join(root, "scripts", "og", "fonts", "ibm-plex-sans-arabic-700.woff2"), "font/woff2");
const PORTRAIT = dataUri(join(root, "public", "brand", "portrait-560.webp"), "image/webp");

/** A lucide icon as inline SVG, straight from the package the site uses. */
async function icon(name) {
  const { __iconNode } = await import(`lucide-react/dist/esm/icons/${name}.mjs`);
  // Renamed icons stay behind as alias files that only re-export the new
  // name and carry no node data. Use the name the alias points to.
  if (!__iconNode) throw new Error(`lucide icon "${name}" is an alias; use the name it re-exports`);
  const children = __iconNode
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .filter(([k]) => k !== "key")
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `<${tag} ${a}/>`;
    })
    .join("");
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

/** The brand mark (the "Open X"), recoloured for the orange tile. */
const MARK = `<svg viewBox="0 0 36 36" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 31 H31" stroke="#fff" stroke-width="2.6"/>
  <path d="M23.8 30 C21 23, 14.5 13, 8.2 6.4" stroke="#fff" stroke-width="2.1" stroke-opacity=".75"/>
  <path d="M12.2 30 C15 23, 21.5 13, 27.8 6.4" stroke="#fff" stroke-width="2.3"/>
  <circle cx="18" cy="5.6" r="1.9" fill="#fff"/>
</svg>`;

const TICK = `<svg viewBox="0 0 24 24"><path fill="#1D9BF0" d="M12 1.6l2.2 1.86 2.86-.3 1.2 2.62 2.62 1.2-.3 2.86L22.4 12l-1.82 2.16.3 2.86-2.62 1.2-1.2 2.62-2.86-.3L12 22.4l-2.16-1.86-2.86.3-1.2-2.62-2.62-1.2.3-2.86L1.6 12l1.86-2.16-.3-2.86 2.62-1.2 1.2-2.62 2.86.3z"/><path fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M7.8 12.2l2.9 2.9 5.5-6"/></svg>`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * One line per span. Plus Jakarta Sans sets its punctuation wide, which at
 * display sizes and tight tracking reads as "admin ." and "systems , shipped",
 * so Latin punctuation is pulled in; the last full stop picks up the accent.
 * Arabic is left as written.
 */
function headline(lines, rtl) {
  return lines
    .map((line, i) => {
      let text = esc(line);
      const last = i === lines.length - 1;
      if (rtl) {
        if (last && text.endsWith(".")) text = `${text.slice(0, -1)}<i class="accent">.</i>`;
        return `<span>${text}</span>`;
      }
      const stop = last && text.endsWith(".");
      if (stop) text = text.slice(0, -1);
      text = text.replace(/([.,?!])/g, '<i class="p">$1</i>');
      if (stop) text += '<i class="p accent">.</i>';
      return `<span>${text}</span>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// The cards. `file` is public/brand/og/<file>.jpg unless `out` gives another
// path under public/. Each is referenced from seo.ts.
// ---------------------------------------------------------------------------
const AUDIT = "Book your free systems audit";
const AUDIT_AR = "احجز تدقيقًا مجانيًا";
const AR_SUB = "مواقع وتطبيقات · أودو · أتمتة · ذكاء اصطناعي — دبي";

const CARDS = [
  // Home, and the fallback for any route without its own card.
  { file: "home", icon: "mark", eyebrow: "Tech studio · Dubai", title: ["Less admin.", "More business."], subtitle: "Websites, CRM, Odoo and AI automation for small businesses in Dubai.", cta: AUDIT },

  // Top-level pages.
  { file: "services", icon: "layers", eyebrow: "Services · Dubai", title: ["One connected", "business."], subtitle: "Websites, CRM, Odoo ERP, AI automation and SEO that work together.", cta: AUDIT },
  { file: "pricing", icon: "tag", eyebrow: "Pricing", title: ["What it", "costs."], subtitle: "Published starting prices for every service, and half price for charities.", cta: AUDIT },
  { file: "starter", icon: "rocket", eyebrow: "The Starter", title: ["A complete website", "for a small budget."], subtitle: "A finished one-page site, mobile-first, with WhatsApp contact. Yours outright.", cta: "See The Starter" },
  { file: "contact", icon: "phone", eyebrow: "Contact", title: ["Let’s connect", "the dots."], subtitle: "WhatsApp, email or a free 60-minute systems audit. Dubai and online.", cta: AUDIT },
  { file: "projects", icon: "folder-open", eyebrow: "Projects", title: ["Real systems, shipped", "and running."], subtitle: "Client systems, websites, brand and video work, and live AI tools.", cta: "See the work" },
  { file: "about", icon: "user", eyebrow: "About · Founder-led", title: ["Work directly with", "the founder."], subtitle: "Xerxes Duane, independent systems consultant in Dubai.", cta: AUDIT },
  { file: "portfolio", icon: "palette", eyebrow: "Portfolio · Web & design", title: ["A look at", "the craft."], subtitle: "Selected website and brand design work across the UAE and beyond.", cta: "See the work" },
  { file: "showreel", icon: "clapperboard", eyebrow: "Showreel · Video", title: ["Video, editing", "and motion."], subtitle: "Events, documentaries, social reels and brand work.", cta: "Watch the reel" },
  { file: "case-studies", icon: "briefcase", eyebrow: "Case studies", title: ["Real businesses.", "Real systems."], subtitle: "Client work from the UAE, the Philippines and beyond.", cta: "Read the case studies" },
  { file: "insights", icon: "book-open", eyebrow: "Insights", title: ["Plain-English", "systems thinking."], subtitle: "Odoo, automation and growth for small businesses in Dubai.", cta: "Read the insights" },
  { file: "ai-lab", icon: "bot", eyebrow: "AI Lab · Live tools", title: ["Try the AI.", "Not just read about it."], subtitle: "Practical AI tools for sales, service, content, operations and reporting.", cta: "Try the tools" },

  // Service pages.
  { file: "odoo-erp-dubai", icon: "boxes", eyebrow: "Odoo ERP · Dubai", title: ["Odoo ERP,", "set up properly."], subtitle: "Implementation, configuration and support for Dubai small businesses.", cta: AUDIT },
  { file: "web-development-dubai", icon: "code", eyebrow: "Web development · Dubai", title: ["A website that", "brings in customers."], subtitle: "Custom sites, web apps and landing pages, built fast and mobile-first.", cta: AUDIT },
  { file: "ai-automation-dubai", icon: "workflow", eyebrow: "AI automation · Dubai", title: ["AI that handles", "the repetitive work."], subtitle: "Chatbots, workflows and custom assistants built around your business.", cta: AUDIT },
  { file: "seo-dubai", icon: "search", eyebrow: "SEO · Dubai", title: ["Be found by buyers,", "not browsers."], subtitle: "Technical, local and content SEO for Dubai small businesses.", cta: AUDIT },
  { file: "answer-engine-optimization-dubai", icon: "message-circle-question-mark", eyebrow: "AEO · Answer engines", title: ["Answer Engine", "Optimization."], subtitle: "Be the answer in AI Overviews, voice search and snippets.", cta: AUDIT },
  { file: "generative-engine-optimization-dubai", icon: "sparkles", eyebrow: "GEO · AI search", title: ["Generative Engine", "Optimization."], subtitle: "Get cited by ChatGPT, Gemini and Perplexity.", cta: AUDIT },
  { file: "custom-software-development-dubai", icon: "puzzle", eyebrow: "Custom software · Dubai", title: ["Software built", "around your workflow."], subtitle: "Internal tools, portals, workflows and integrations for growing teams.", cta: AUDIT },
  { file: "crm-development-dubai", icon: "users", eyebrow: "CRM development · Dubai", title: ["A CRM your team", "actually uses."], subtitle: "Lead pipelines, dashboards and follow-up automation for small businesses.", cta: AUDIT },
  { file: "mobile-app-development-dubai", icon: "smartphone", eyebrow: "Mobile apps · Dubai", title: ["Practical apps", "that launch."], subtitle: "Booking, portals, memberships and operations apps built to grow.", cta: AUDIT },
  { file: "ecommerce-development-dubai", icon: "shopping-cart", eyebrow: "E-commerce · Dubai", title: ["Stores connected", "to operations."], subtitle: "UAE payments, inventory, order workflows and journeys that convert.", cta: AUDIT },
  { file: "landing-page-design-dubai", icon: "mouse-pointer-click", eyebrow: "Landing pages · Dubai", title: ["Pages built", "to convert."], subtitle: "Campaign pages connected to analytics, forms, CRM and follow-up.", cta: AUDIT },
  { file: "branding-graphic-design-dubai", icon: "pen-tool", eyebrow: "Branding · Dubai", title: ["A visual system", "people remember."], subtitle: "Practical identities, collateral, campaigns and brand consistency.", cta: AUDIT },
  { file: "video-editing-dubai", icon: "film", eyebrow: "Video editing · Dubai", title: ["Edits with pace,", "captions and motion."], subtitle: "Social reels, ads, interviews, events and brand films, ready to publish.", cta: AUDIT },

  // Case studies.
  { file: "case-blocktec-odoo-erp", icon: "briefcase", eyebrow: "Case study · Odoo ERP", title: ["Blocktec", "Philippines."], subtitle: "A connected Odoo operating system, from first enquiry to delivery.", cta: "Read the case study" },
  { file: "case-saladmaster-crm-web", icon: "briefcase", eyebrow: "Case study · CRM, web & brand", title: ["Saladmaster", "UAE."], subtitle: "A clearer lead-to-demo journey, organised around how the team sells.", cta: "Read the case study" },
  { file: "case-aya-home-spa-meta-ads", icon: "briefcase", eyebrow: "Case study · Meta Ads", title: ["AYA", "Home Spa."], subtitle: "A focused paid-social campaign that turned creative into conversations.", cta: "Read the case study" },
  { file: "case-wellington-cash-for-cars-google-ads", icon: "briefcase", eyebrow: "Case study · Google Ads", title: ["Wellington", "Cash for Cars."], subtitle: "A search campaign built around high-intent queries and disciplined spend.", cta: "Read the case study" },

  // Insight posts (file = post slug).
  { file: "aeo-seo-geo-dubai", icon: "book-open", eyebrow: "Insight · SEO, AEO, GEO", title: ["SEO is now", "three places."], subtitle: "How Dubai businesses get found in Google, answers and AI.", cta: "Read the guide" },
  { file: "get-cited-by-chatgpt-perplexity-dubai", icon: "book-open", eyebrow: "Insight · AI search", title: ["Get cited by", "AI engines."], subtitle: "How ChatGPT and Perplexity decide who to recommend.", cta: "Read the guide" },
  { file: "whatsapp-automation-not-spam-dubai", icon: "book-open", eyebrow: "Insight · WhatsApp", title: ["Automate replies,", "not spam."], subtitle: "Helpful WhatsApp automation for Dubai businesses.", cta: "Read the guide" },
  { file: "website-cost-dubai", icon: "book-open", eyebrow: "Insight · Web cost", title: ["What a website", "really costs."], subtitle: "An honest 2026 breakdown for Dubai.", cta: "Read the guide" },
  { file: "how-much-does-odoo-cost-dubai", icon: "book-open", eyebrow: "Insight · Odoo cost", title: ["What Odoo", "really costs."], subtitle: "An honest cost breakdown for Dubai.", cta: "Read the guide" },
  { file: "odoo-vs-zoho-uae", icon: "book-open", eyebrow: "Insight · ERP choice", title: ["Odoo vs Zoho", "in the UAE."], subtitle: "Which one fits your business? An honest comparison.", cta: "Read the guide" },
  { file: "signs-outgrown-spreadsheets", icon: "book-open", eyebrow: "Insight · Operations", title: ["Outgrowing", "your spreadsheets?"], subtitle: "The signs it's time for a real system.", cta: "Read the guide" },
  { file: "what-a-systems-audit-covers", icon: "book-open", eyebrow: "Insight · Free audit", title: ["Inside the free", "systems audit."], subtitle: "Exactly what happens in the 60 minutes.", cta: "Read the guide" },
  { file: "crm-setup-mistakes-dubai", icon: "book-open", eyebrow: "Insight · CRM", title: ["CRM setup", "mistakes to avoid."], subtitle: "What breaks CRM rollouts, and how to dodge it.", cta: "Read the guide" },
  { file: "odoo-enterprise-vs-community", icon: "book-open", eyebrow: "Insight · Odoo", title: ["Odoo Enterprise", "or Community?"], subtitle: "Which edition you actually need, honestly.", cta: "Read the guide" },
  { file: "choosing-a-web-developer-dubai", icon: "book-open", eyebrow: "Insight · Web development", title: ["Choosing a web", "developer in Dubai."], subtitle: "What to ask before you sign.", cta: "Read the guide" },

  // Unlisted: see the note at the top of this file.
  { file: "ministry", out: "ministry/share.jpg", icon: "church", eyebrow: "Ministry · Dubai", title: ["Making disciples", "in a digital age."], subtitle: "Helping churches, youth ministries and nonprofits meet people online, and walk with them toward Jesus.", cta: "Pray & partner" },

  // Arabic. Copy from HomeAr.tsx and servicePagesAr.ts, word for word, broken
  // into lines at natural pauses.
  { file: "ar-home", rtl: true, icon: "mark", eyebrow: "استوديو تقني متكامل · دبي", title: ["أنظمة الشركات الكبرى،", "للأعمال الصغيرة التي", "لا تملك فريقًا تقنيًا."], subtitle: AR_SUB, cta: AUDIT_AR },
  { file: "ar-odoo-erp-dubai", rtl: true, icon: "boxes", eyebrow: "أودو وتخطيط الموارد · دبي", title: ["أدِر عملك كله من نظام واحد،", "لا من خمسة لا تتحدث مع بعضها."], subtitle: AR_SUB, cta: AUDIT_AR },
  { file: "ar-web-development-dubai", rtl: true, icon: "code", eyebrow: "تطوير المواقع · دبي", title: ["موقع يجلب لك العملاء،", "لا موقع يجلس بلا فائدة."], subtitle: AR_SUB, cta: AUDIT_AR },
  { file: "ar-ai-automation-dubai", rtl: true, icon: "workflow", eyebrow: "الذكاء الاصطناعي والأتمتة · دبي", title: ["دع الذكاء الاصطناعي", "يتولّى العمل المتكرر،", "لتتفرّغ للعمل الحقيقي."], subtitle: AR_SUB, cta: AUDIT_AR },
  { file: "ar-seo-dubai", rtl: true, icon: "search", eyebrow: "تحسين محركات البحث · دبي", title: ["اجعل من يبحثون وهم", "جاهزون للشراء يجدونك،", "لا من يتصفّحون فقط."], subtitle: AR_SUB, cta: AUDIT_AR },
];

// ---------------------------------------------------------------------------
// The template.
// ---------------------------------------------------------------------------
function page(card, iconSvg) {
  const rtl = Boolean(card.rtl);
  return `<!doctype html>
<html dir="${rtl ? "rtl" : "ltr"}" lang="${rtl ? "ar" : "en"}">
<head><meta charset="utf-8"><style>
  @font-face { font-family: "Jakarta"; src: url(${FONT_LATIN}) format("woff2"); font-weight: 200 800; }
  @font-face { font-family: "PlexAr"; src: url(${FONT_AR_500}) format("woff2"); font-weight: 500; }
  @font-face { font-family: "PlexAr"; src: url(${FONT_AR_700}) format("woff2"); font-weight: 700; }
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; }
  body {
    position: relative; overflow: hidden;
    font-family: ${rtl ? '"PlexAr", "Jakarta"' : '"Jakarta"'}, sans-serif;
    color: #112244; background: #f5f3ec;
  }
  /* The site's backdrop: a soft peach/blue mesh, a dot grid, thin arcs. */
  .mesh { position: absolute; inset: 0;
    background:
      radial-gradient(620px 460px at ${rtl ? "12%" : "88%"} 8%, rgba(251, 220, 196, .95), transparent 70%),
      radial-gradient(560px 420px at ${rtl ? "92%" : "6%"} 100%, rgba(217, 230, 248, .95), transparent 70%),
      radial-gradient(420px 320px at 50% 50%, rgba(255, 255, 255, .7), transparent 75%); }
  .dots { position: absolute; inset: 0;
    background-image: radial-gradient(rgba(17, 34, 68, .16) 1.4px, transparent 1.6px);
    background-size: 30px 30px; background-position: 15px 15px;
    -webkit-mask-image: linear-gradient(${rtl ? "270deg" : "90deg"}, transparent 35%, #000 80%); }
  svg.lines { position: absolute; inset: 0; width: 100%; height: 100%; }

  .card { position: absolute; inset: 0; padding: 56px 72px 54px; display: flex; flex-direction: column; }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .who { display: flex; align-items: center; gap: 16px; }
  .who img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover;
    border: 3px solid #fff; box-shadow: 0 6px 18px -8px rgba(17, 34, 68, .5); }
  .name { font-family: "Jakarta", sans-serif; font-weight: 800; font-size: 27px; letter-spacing: -.01em;
    display: flex; align-items: center; gap: 8px; direction: ltr; }
  .name svg { width: 24px; height: 24px; }
  .handle { font-family: "Jakarta", sans-serif; font-size: 18px; color: #4a5a74; margin-top: 2px; direction: ltr; text-align: ${rtl ? "right" : "left"}; }
  .site { font-family: "Jakarta", sans-serif; font-weight: 700; font-size: 18px; color: #112244; direction: ltr;
    padding: 10px 18px; border: 1px solid #d8dde4; border-radius: 999px; background: rgba(255, 255, 255, .75); }

  .body { margin-top: 46px; width: ${rtl ? 730 : 760}px; }
  .eyebrow { display: flex; align-items: center; gap: 14px; color: #a6410a; font-weight: 800; font-size: 19px;
    ${rtl ? "" : "letter-spacing: .16em; text-transform: uppercase;"} }
  .eyebrow::before { content: ""; width: 38px; height: 2px; background: rgba(249, 112, 22, .7); }
  h1 { margin-top: 18px; font-weight: 800; font-size: 76px; line-height: ${rtl ? "1.28" : "1.02"};
    letter-spacing: ${rtl ? "0" : "-.035em"}; ${rtl ? "font-weight: 700;" : ""} }
  h1 span { display: block; }
  h1 i { font-style: normal; }
  h1 .p { margin-inline-start: -.09em; }
  h1 .accent { color: #f97016; }
  .sub { margin-top: 20px; font-size: 26px; line-height: 1.4; color: #4a5a74; max-width: 700px; ${rtl ? "font-weight: 500;" : ""} }
  .cta { margin-top: auto; align-self: flex-start; display: inline-flex; align-items: center; gap: 12px;
    background: #112244; color: #fff; font-weight: 700; font-size: 22px; padding: 16px 26px; border-radius: 999px;
    box-shadow: 0 14px 30px -16px rgba(17, 34, 68, .7); }
  .cta svg { width: 22px; height: 22px; ${rtl ? "transform: scaleX(-1);" : ""} }

  /* The orange tile, as on the site's cards, lifted and tilted like hover. */
  .tile-wrap { position: absolute; ${rtl ? "left" : "right"}: 96px; top: 206px; width: 250px; height: 250px; }
  .ghost { position: absolute; inset: 18px -14px -14px 18px; border-radius: 52px; background: rgba(255, 255, 255, .85);
    border: 1px solid #d8dde4; transform: rotate(${rtl ? "-7deg" : "7deg"}); box-shadow: 0 30px 60px -34px rgba(17, 34, 68, .45); }
  .tile { position: absolute; inset: 0; border-radius: 52px; display: grid; place-items: center; color: #fff;
    background: linear-gradient(145deg, #fb8a3c, #f97016 45%, #e2580a);
    transform: rotate(${rtl ? "6deg" : "-6deg"});
    box-shadow: 0 26px 50px -20px rgba(249, 112, 22, .85), inset 0 2px 0 rgba(255, 255, 255, .35); }
  .tile svg { width: 118px; height: 118px; stroke-width: 1.9; }
</style></head>
<body>
  <div class="mesh"></div>
  <div class="dots"></div>
  <svg class="lines" viewBox="0 0 1200 630" preserveAspectRatio="none" fill="none">
    <g stroke="rgba(17,34,68,.08)" stroke-width="1.2">
      <path d="M-120 560 C 180 540, 300 330, 520 250 S 900 110, 1320 -40"/>
      <path d="M-80 700 C 260 650, 420 420, 700 340 S 1080 220, 1340 130"/>
      <circle cx="${rtl ? 280 : 920}" cy="330" r="250"/>
    </g>
    <circle cx="${rtl ? 280 : 920}" cy="330" r="250" stroke="#f97016" stroke-opacity=".7" stroke-width="3"
      stroke-dasharray="70 1500" stroke-dashoffset="-260" stroke-linecap="round"/>
  </svg>

  <div class="card">
    <div class="top">
      <div class="who">
        <img src="${PORTRAIT}" alt="">
        <div>
          <div class="name">Xerxes Duane ${TICK}</div>
          <div class="handle">@xerxesduane</div>
        </div>
      </div>
      <div class="site">xerxesduane.com</div>
    </div>
    <div class="body">
      <div class="eyebrow">${esc(card.eyebrow)}</div>
      <h1 id="h">${headline(card.title, rtl)}</h1>
      <p class="sub">${esc(card.subtitle)}</p>
    </div>
    <div class="cta">${esc(card.cta)} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg></div>
  </div>

  <div class="tile-wrap"><div class="ghost"></div><div class="tile">${iconSvg}</div></div>
</body></html>`;
}

// Shrink the headline until the whole column fits above the CTA, so a long
// title (the Arabic ones especially) never runs into it.
async function fit(pageHandle) {
  await pageHandle.evaluate(() => {
    const h = document.getElementById("h");
    const body = document.querySelector(".body");
    const cta = document.querySelector(".cta");
    let size = 76;
    const clear = () => body.getBoundingClientRect().bottom <= cta.getBoundingClientRect().top - 22;
    // Each authored line stays one line, so a long line never strands one
    // word. The spans are blocks, so count lines from height, not rects.
    const oneLineEach = () =>
      [...h.children].every(
        (s) => s.getBoundingClientRect().height < parseFloat(getComputedStyle(s).lineHeight) * 1.5,
      );
    while ((!clear() || !oneLineEach()) && size > 40) {
      size -= 2;
      h.style.fontSize = `${size}px`;
    }
  });
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
const tab = await context.newPage();

// `npm run og -- home ar-home` renders only the named cards.
const only = new Set(process.argv.slice(2));
const selected = only.size ? CARDS.filter((c) => only.has(c.file)) : CARDS;

for (const card of selected) {
  const iconSvg = card.icon === "mark" ? MARK : await icon(card.icon);
  await tab.setContent(page(card, iconSvg), { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready);
  await fit(tab);
  const png = await tab.screenshot({ type: "png" });
  const jpg = await sharp(png)
    .resize(1200, 630, { kernel: "lanczos3" })
    .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
  const out = card.out ?? `brand/og/${card.file}.jpg`;
  writeFileSync(join(root, "public", out), jpg);
  console.log(`  ${out}  (${(jpg.length / 1024).toFixed(0)} KB)`);
}

await browser.close();
console.log(`${selected.length} share card${selected.length === 1 ? "" : "s"} written.`);
