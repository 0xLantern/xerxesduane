import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import PageHeader from "../components/page/PageHeader";
import { GhostAction } from "../components/page/PageActions";
import { BOARD_WASH } from "../components/page/PanelBoard";
import { CONTACT } from "../data/content";

const LAST_UPDATED = "2 June 2026";

function LegalLayout({ title, updated = LAST_UPDATED, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <section className="pb-16">
      <PageHeader
        eyebrow="Legal"
        title={title}
        meta={<span>Last updated: {updated}</span>}
        actions={
          <GhostAction href="/" icon={<ArrowLeft size={15} strokeWidth={2.2} aria-hidden />}>
            Home
          </GhostAction>
        }
      />
      <div
        className="max-w-4xl rounded-panel p-3 sm:p-4"
        style={{ background: BOARD_WASH }}
      >
        <div className="rounded-card border border-line bg-panel p-5 shadow-card sm:p-8">
          <div className="legal space-y-6 text-[0.95rem] leading-relaxed text-fg-soft">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="pt-4 font-display text-xl font-bold text-fg">{children}</h2>;
}

const linkCls = "text-accent underline-offset-2 hover:underline";

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="9 October 2026">
      <p>
        This Privacy Policy explains how Xerxes Duane
        ("Xerxes Duane", "we", "us") collects and uses information when you
        visit this website or contact us. We keep this short and in plain
        language, the same way we work.
      </p>

      <H2>Who we are</H2>
      <p>
        Xerxes Duane is an independent systems consultant based in Dubai, United Arab Emirates.
        You can reach us at{" "}
        <a className={linkCls} href={`mailto:${CONTACT.email}`}>
          {CONTACT.email}
        </a>{" "}
        or on WhatsApp at {CONTACT.whatsappDisplay}.
      </p>

      <H2>What we collect and why</H2>
      <p>
        <strong className="font-bold text-fg">Enquiries.</strong> When you submit
        the contact form or message us, we collect the details you provide (such
        as your name, business, email, phone number, and message) so we can
        respond and follow up. The form is handled by Formspree, which delivers
        it to us by email. With it we receive the page you sent it from, the
        first page of your visit, and how you reached the site (for example
        "Google" or "direct"), so we know which pages bring enquiries. When you
        tap a WhatsApp button, the message opens with a short line naming the
        page and that source; you can edit or delete it before sending.
      </p>
      <p>
        <strong className="font-bold text-fg">Analytics.</strong> With your consent,
        we use Google Analytics 4 and Microsoft Clarity to understand how the
        site is used (pages viewed, rough location, device, and aggregated
        heatmaps or anonymized session replays) so we can improve it. Analytics
        cookies and recording are off by default and only start if you choose
        "Accept" on the cookie banner. You can decline, and the site works
        exactly the same.
      </p>
      <p>
        <strong className="font-bold text-fg">Visit counter.</strong> The number
        shown beside the profile counts visits to this site each month. It runs
        without waiting for your consent because there is nothing personal in
        it: no cookie is set, no identifier is created, and nothing about you is
        sent or stored. Your browser keeps a single flag for the length of the
        tab session so one visit isn&rsquo;t counted twice, and the server keeps
        one number per month, not one row per visitor.
      </p>
      <p>
        <strong className="font-bold text-fg">Cookies &amp; local storage.</strong>{" "}
        We store your cookie choice on your device so we don't ask again, a
        session flag for the visit counter above, and, for the length of the
        tab session, the first page of your visit and how you arrived, used
        only in the enquiry details described above. Analytics providers set
        their own cookies only after you accept.
      </p>

      <H2>Who we share it with</H2>
      <p>
        We don't sell your data. We use a small set of trusted providers to run
        the site and respond to you: Google (Analytics), Microsoft (Clarity),
        Formspree (contact form), Vercel (hosting), Supabase (the visit
        counter's database), and WhatsApp (if you message
        us there). Each processes data under its own privacy terms, and some may
        process it outside the UAE.
      </p>

      <H2>How long we keep it</H2>
      <p>
        We keep enquiry details for as long as needed to help you and for our
        records, then delete them. Analytics data follows each provider's
        standard retention settings.
      </p>

      <H2>Your choices</H2>
      <p>
        You can accept or decline analytics at any time via the cookie banner
        (clear your site data to see it again). You can also ask us to access,
        correct, or delete the personal information you've shared by emailing{" "}
        <a className={linkCls} href={`mailto:${CONTACT.email}`}>
          {CONTACT.email}
        </a>
        .
      </p>

      <H2>Changes</H2>
      <p>
        We may update this policy as the site evolves; the date above shows the
        latest version. This is a general policy provided for transparency, not
        legal advice.
      </p>
    </LegalLayout>
  );
}

export function Terms() {
  return (
    <LegalLayout title="Terms of Use">
      <p>
        These terms apply to your use of this website. By using the site, you
        agree to them. Any paid work we do together is governed by a separate
        written proposal or agreement, not this page.
      </p>

      <H2>The website</H2>
      <p>
        This site describes Xerxes Duane and shares general information and
        articles. We work to keep it accurate and current, but we provide it "as
        is" without warranties. Blog and guide content is general information,
        not professional, legal, or financial advice for your specific
        situation.
      </p>

      <H2>Quotes &amp; engagements</H2>
      <p>
        Prices, packages, and timelines shown here are indicative. A binding
        scope, price, and timeline are confirmed in a written quote or agreement
        before any work begins.
      </p>

      <H2>Intellectual property</H2>
      <p>
        The Xerxes Duane name, logo, design, text, and graphics on this site
        are owned by Xerxes Duane unless stated otherwise. Please don't reuse
        them without permission. Third-party brand names belong to their owners.
      </p>

      <H2>External links</H2>
      <p>
        We link to other sites (for example, client work and tools). We're not
        responsible for the content or practices of those sites.
      </p>

      <H2>Liability</H2>
      <p>
        To the extent permitted by law, Xerxes Duane isn't liable for any
        loss arising from your use of this website or reliance on its general
        content.
      </p>

      <H2>Governing law</H2>
      <p>
        These terms are governed by the laws of the United Arab Emirates, and
        the courts of Dubai have jurisdiction. Questions? Email{" "}
        <a className={linkCls} href={`mailto:${CONTACT.email}`}>
          {CONTACT.email}
        </a>
        .
      </p>
    </LegalLayout>
  );
}
