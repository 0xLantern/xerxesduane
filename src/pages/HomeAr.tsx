import { ArrowUpRight, CalendarCheck, ChevronDown, FlaskConical, HelpCircle, LayoutGrid, MessageCircle } from "lucide-react";
import { SERVICE_PAGES_AR } from "../data/servicePagesAr";
import { CONTACT } from "../data/content";
import PageHeader from "../components/page/PageHeader";
import Panel from "../components/page/Panel";
import PanelBoard from "../components/page/PanelBoard";
import { GhostAction } from "../components/page/PageActions";

const waHref = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(
  "مرحبًا Xerxes، أودّ حجز تدقيق مجاني لأنظمتي.",
)}`;

const FAQ_AR = [
  {
    q: "ماذا يحدث إذا لم أستطع الوصول إليك، أو كنت مشغولًا أو مسافرًا؟",
    a: "تتعامل مع رقمٍ واحدٍ موثوق طوال الوقت، وكل نظامٍ نبنيه يكون موثّقًا بوضوح. حتى لو تأخّرت في الردّ، يبقى عملك في يدك ولا تعلق يومًا في انتظار أحد.",
  },
  {
    q: "هل أملك كل شيء فعلًا؟ الموقع والنطاق والحسابات؟",
    a: "نعم، بالكامل. النطاق والاستضافة والشيفرة البرمجية وكل الحسابات تكون باسمك أنت منذ اليوم الأول، لا باسمي. أنا أبني لك، لكن الملكية ملكك وحدك.",
  },
  {
    q: "هل التدقيق المجاني مجاني حقًا وبلا أي التزام؟",
    a: "نعم، مجاني تمامًا وبلا أي التزام. ستون دقيقةً تخرج منها بخريطة واضحة لأنظمتك وثلاثة مكاسب سريعة، سواء عملنا معًا بعدها أم لا.",
  },
  {
    q: "هل الذكاء الاصطناعي في الموقع حقيقي أم مجرد عرض؟",
    a: "حقيقي وحيّ بالكامل. يمكنك تجربته بنفسك الآن، قبل أن نتحدّث أصلًا، عبر صفحة مختبر الذكاء الاصطناعي، وسترى كيف يستجيب فعلًا.",
  },
];

/**
 * `/ar` — the Arabic homepage, on the same board as the English one.
 *
 * It used to be the old stacked page: five full-height sections of services,
 * AI Lab, FAQs and a closing CTA, 2,290px of scroll for what the English home
 * now says in one screen. Same copy, same links, same order — laid out as the
 * bento board the rest of the site uses, with the audit CTA lifted into the
 * header where it is the first thing on the page rather than the last.
 */
export default function HomeAr() {
  return (
    <>
      <PageHeader
        eyebrow="استوديو تقني متكامل · دبي"
        title={<>أنظمة الشركات الكبرى، للأعمال الصغيرة التي لا تملك فريقًا تقنيًا.</>}
        titleClass="text-3xl leading-[1.45] sm:text-4xl"
        lede={<>معظم الأعمال الصغيرة في دبي تجمع بين موقع وجداول بيانات وعدّة تطبيقات لا تتحدث مع بعضها. نبني المواقع والتطبيقات وأنظمة أودو والأتمتة والذكاء الاصطناعي التي تعمل معًا فعلًا، بصدق، تحت سقف واحد، لتتوقف عن إدارة الأدوات وتعود إلى تنمية عملك.</>}
        actions={
          <>
            <a
              href={waHref}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-fg-onSolid shadow-solid transition hover:bg-navy-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <MessageCircle size={16} aria-hidden />
              احجز تدقيق أنظمتك المجاني
            </a>
            <GhostAction href="/">
              <span lang="en">English</span>
            </GhostAction>
          </>
        }
      />

      <PanelBoard rail railLabel="تصفح الموقع" cols="board:grid-cols-4">
        <Panel
          icon={FlaskConical}
          label="مختبر الذكاء الاصطناعي"
          blurb="جرّب الذكاء الاصطناعي، لا تكتفِ بالقراءة عنه."
          href="/ai-lab"
          span="sm:col-span-2 board:col-span-1"
          footer={
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-fg-faint board:text-[11px]">
              بلا تسجيل · تستجيب فعلًا
            </p>
          }
        >
          <p className="text-[0.9rem] leading-relaxed text-fg-soft">
            هذه أدوات ذكاء اصطناعي حقيقية وعاملة، من النوع الذي أبنيه لعملائي: مساعدون آليون،
            وأتمتة واتساب، وإنشاء المحتوى، وحلول ثنائية اللغة بالعربية والإنجليزية. جرّبها مباشرةً
            الآن، فهي تستجيب لك فعلًا لا في عرضٍ مسجّل.
          </p>
        </Panel>

        <Panel
          icon={LayoutGrid}
          label="خدماتنا في دبي"
          id="services"
          className="scroll-mt-24"
          span="sm:col-span-2 board:col-span-1"
        >
          <ul className="grid gap-1.5">
            {SERVICE_PAGES_AR.map((s) => (
              <li key={s.slug}>
                <a
                  href={`/ar/${s.slug}`}
                  className="group/link flex items-center justify-between gap-3 rounded-xl border border-line bg-panel-alt px-3 py-2 transition hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="min-w-0">
                    <span className="block text-[0.9rem] font-bold leading-snug text-fg transition-colors group-hover/link:text-accent-deep">
                      {s.navLabel}
                    </span>
                    <span className="block text-xs leading-snug text-fg-faint">{s.eyebrow}</span>
                  </span>
                  <ArrowUpRight
                    size={16}
                    aria-hidden
                    className="rtl-flip shrink-0 text-accent opacity-0 transition group-hover/link:opacity-100"
                  />
                </a>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel icon={HelpCircle} label="أسئلة شائعة" span="sm:col-span-2 board:col-span-1">
          <div className="flex flex-col gap-1.5">
            {FAQ_AR.map((f) => (
              <details key={f.q} className="group/faq rounded-xl border border-line bg-panel-alt px-3 pb-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2 text-[0.9rem] font-medium text-fg [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className="shrink-0 text-accent transition-transform group-open/faq:rotate-180"
                  />
                </summary>
                <p className="pb-1 text-[0.85rem] leading-relaxed text-fg-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </Panel>

        <Panel icon={MessageCircle} label="احجز تدقيقك المجاني" id="contact" className="scroll-mt-24" span="sm:col-span-2 board:col-span-1">
          <p className="text-[0.9rem] leading-relaxed text-fg-soft">
            ٦٠ دقيقة، بلا ضغط. تخرج بخريطة واضحة لأنظمتك وثلاثة مكاسب سريعة يمكنك تطبيقها فورًا.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <a
              href={waHref}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-fg-onSolid shadow-solid transition hover:bg-navy-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <MessageCircle size={16} aria-hidden />
              {CONTACT.whatsappDisplay}
            </a>
            <a
              href={CONTACT.calendar}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-panel px-5 py-2.5 text-sm font-bold text-fg transition hover:border-accent/40 hover:text-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <CalendarCheck size={15} aria-hidden />
              احجز موعدًا فورًا
            </a>
          </div>
        </Panel>
      </PanelBoard>

    </>
  );
}
