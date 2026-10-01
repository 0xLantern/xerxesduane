import { lazy, Suspense } from "react";
import { LazyMotion, domAnimation, MotionConfig } from "framer-motion";
import ShellLayout from "./components/shell/ShellLayout";
import SiteAssistant from "./components/assistant/SiteAssistant";
import MobileTabBar from "./components/shell/MobileTabBar";
import ConsentBanner from "./components/ConsentBanner";
import SmoothScroll from "./components/fx/SmoothScroll";
import PageTransition from "./components/fx/PageTransition";
import IntroSequence from "./components/fx/IntroSequence";
import Cursor from "./components/fx/Cursor";

// Route-level code splitting: each page ships as its own chunk, so a visitor
// only downloads the JS for the route they're on. The streaming prerender
// (entry-server) resolves these before writing HTML, so SEO is unaffected.
const Home = lazy(() => import("./pages/Home"));
const Services = lazy(() => import("./pages/Services"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ServicePage = lazy(() => import("./pages/ServicePage"));
const Projects = lazy(() => import("./pages/Projects"));
const CaseStudies = lazy(() => import("./pages/CaseStudies"));
const CaseStudyPage = lazy(() => import("./pages/CaseStudyPage"));
const About = lazy(() => import("./pages/About"));
const Insights = lazy(() => import("./pages/Insights"));
const InsightPost = lazy(() => import("./pages/InsightPost"));
const ServicePageAr = lazy(() => import("./pages/ServicePageAr"));
const HomeAr = lazy(() => import("./pages/HomeAr"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Starter = lazy(() => import("./pages/Starter"));
const Privacy = lazy(() =>
  import("./pages/Legal").then((m) => ({ default: m.Privacy })),
);
const Terms = lazy(() =>
  import("./pages/Legal").then((m) => ({ default: m.Terms })),
);
const Showreel = lazy(() => import("./pages/Showreel"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Demos = lazy(() => import("./pages/Demos"));
// Unlisted: reachable by link, never linked or indexed. See pages/Ministry.tsx.
const Ministry = lazy(() => import("./pages/Ministry"));
import { getServicePage } from "./data/servicePages";
import { AR_CHROME } from "./data/servicePagesAr";
import { getServicePageAr } from "./data/servicePagesAr";
import { getInsight } from "./data/insights";
import { CASE_STUDIES } from "./data/content";
import { pathToSlug } from "./lib/seo";

/** The matching page in the other language, for the Nav toggle. */
function altLanguage(path: string): { href: string; label: string } {
  const slug = pathToSlug(path);
  if (slug === "ar") return { href: "/", label: "English" };
  if (slug.startsWith("ar/")) return { href: `/${slug.slice(3)}`, label: "English" };
  if (getServicePage(slug) && getServicePageAr(slug)) {
    return { href: `/ar/${slug}`, label: "عربي" };
  }
  return { href: "/ar", label: "عربي" };
}

function Route({ path }: { path: string }) {
  const slug = pathToSlug(path);
  if (slug === "") return <Home />;
  if (slug === "services") return <Services />;
  if (slug === "pricing") return <Pricing />;
  if (slug === "starter") return <Starter />;
  if (slug === "contact") return <ContactPage />;
  if (slug === "projects") return <Projects />;
  if (slug === "case-studies") return <CaseStudies />;
  if (slug.startsWith("case-studies/")) {
    const study = CASE_STUDIES.find((item) => item.slug === slug.slice("case-studies/".length));
    if (study) return <CaseStudyPage study={study} />;
  }
  if (slug === "about") return <About />;
  if (slug === "insights") return <Insights />;
  if (slug === "privacy") return <Privacy />;
  if (slug === "terms") return <Terms />;
  if (slug === "showreel") return <Showreel />;
  if (slug === "portfolio") return <Portfolio />;
  if (slug === "ai-lab" || slug === "demos") return <Demos />;
  if (slug === "ministry") return <Ministry />;
  if (slug === "ar") return <HomeAr />;

  // Arabic service pages: /ar/<service-slug>
  if (slug.startsWith("ar/")) {
    const arPage = getServicePageAr(slug.slice("ar/".length));
    if (arPage) return <ServicePageAr page={arPage} />;
  }

  if (slug.startsWith("insights/")) {
    const post = getInsight(slug.slice("insights/".length));
    if (post) return <InsightPost post={post} />;
  }

  const page = getServicePage(slug);
  if (page) return <ServicePage page={page} />;

  // Unknown path: render a real 404 (Vercel serves this as 404.html).
  return <NotFound />;
}

export default function App({ path = "/" }: { path?: string }) {
  const slug = pathToSlug(path);
  const isArabic = slug === "ar" || slug.startsWith("ar/");
  const lang = altLanguage(path);
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
      <div className="grain relative min-h-dvh" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
        {/*
          The skip link is the first thing a keyboard or screen-reader user
          reaches. On a page that declares `lang="ar"` it was still announcing
          "Skip to content" in English.
        */}
        <a
          href="#top"
          data-lenis-ignore
          className="skip-link"
        >
          {isArabic ? AR_CHROME.skipToContent : "Skip to content"}
        </a>

        <SmoothScroll />
        <PageTransition />
        <IntroSequence />

        <ShellLayout path={path} lang={lang} locale={isArabic ? "ar" : "en"}>
          <main className="relative z-10">
            <Suspense fallback={null}>
              <Route path={path} />
            </Suspense>
          </main>
        </ShellLayout>

        <ConsentBanner locale={isArabic ? "ar" : "en"} />
        {/* Reserve the bottom bar's height (plus the iOS home indicator) so
            the end of the page is never trapped underneath it. */}
        <div
          className="h-[calc(5rem+env(safe-area-inset-bottom))] lg:hidden"
          aria-hidden
        />
        {/* /ministry gets its own assistant, grounded in that page alone; the
            business one never appears there. */}
        <SiteAssistant
          locale={isArabic ? "ar" : "en"}
          variant={slug === "ministry" ? "ministry" : "site"}
        />
        <MobileTabBar path={path} locale={isArabic ? "ar" : "en"} />
        <Cursor />
      </div>
      </MotionConfig>
    </LazyMotion>
  );
}
