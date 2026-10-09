# Organic enquiries: audit, changes and 90-day plan (October 2026)

**Goal:** at least 5 *qualified* organic enquiries a month from businesses that
want websites, CRM, Odoo or AI automation in Dubai. That is a business target,
not a forecast. Nothing below guarantees rankings, AI citations or enquiries.

This builds on [`seo-geo-aeo-cro-audit.md`](seo-geo-aeo-cro-audit.md) (the
earlier technical audit) and [`analytics.md`](analytics.md) (event reference).

---

## 1. Evidence used, and what was missing

| Source | What it covers | Limits |
| --- | --- | --- |
| Search Console export, *Performance on Search* | Web search, last 3 months (7 Jul – 6 Oct 2026): queries, pages, countries, devices | Query table hides anonymised queries (it shows 0 clicks while the page table shows 12) |
| Search Console export, *Generative AI features* | Impressions in AI Overviews / AI Mode, same period | Impressions only, no clicks |
| GA4 *Reports snapshot* PDF | 11 Sep – 8 Oct 2026 | One summary page; GA4 is consent-gated, so it undercounts; internal traffic is not filtered |
| This repository at `main` (`30f1436`) | Code, content, metadata, schema, tracking | Git history is shallow (starts 30 Sep 2026) |
| Live site | — | **Not reachable from this environment** (network policy blocked `www.xerxesduane.com`). Live status codes, redirects, headers and the deployed version were not checked; the repo build was used instead |
| Google documentation | Checked via search on 9 Oct 2026 (direct fetch was blocked) | See sources at the end |

No CRM or lead log was available. **Owner-reported baseline (9 Oct 2026): three
organic leads in the last three months**, i.e. about one a month. Which pages
and sources they came from, and how many were qualified, is not recorded. That
is the first gap to close (§6).

---

## 2. Diagnosis

### Verified (from the exports and the build)

1. **Visibility is the binding constraint.** 3 months: ~4,350 impressions and
   12 clicks. By page, the home page took 11 clicks (avg. position 6, mostly
   name searches) and About took 2 (page counts overlap slightly). Every money page sits at **average position 43–60**
   (pages 5–6 of results) with 0 clicks:

   | Page | Impressions | Avg. position |
   | --- | --: | --: |
   | /generative-engine-optimization-dubai | 810 | 51.8 |
   | /answer-engine-optimization-dubai | 655 | **16.9** |
   | /seo-dubai | 567 | 57.9 |
   | /custom-software-development-dubai | 542 | 57.6 |
   | /crm-development-dubai | 382 | 60.5 |
   | /ai-automation-dubai | 340 | 51.9 |
   | /odoo-erp-dubai | 263 | 53.8 |
   | /web-development-dubai | 61 | 45.5 |

   At those positions almost nobody sees the result, so title and description
   tweaks alone cannot fix this. The pages need more authority (links,
   mentions, reviews) and more evidence.

2. **Impressions come mostly from the wrong intents.** By query cluster:
   GEO 21%, AEO 17%, generic SEO 15%, custom software 11%,
   video/design 9%, AI/automation 8%, **CRM 8%, Odoo 7%, websites 4%**. The
   four core services make up about a quarter of what Google shows the site
   for. "Website design/development Dubai" style queries are close to absent:
   the web-development page had 61 impressions in 3 months, under a title that
   said only "Web Development".

3. **AEO is the only cluster close to page 1.** "aeo services in dubai"
   (162 impressions, position 13.9), "aeo optimisation services in dubai"
   (12.4), "aeo services dubai" (16.2), "answer engine optimization uae"
   (17.7). It is the one page where a few positions would turn into clicks.
   It also had no client proof on it, and the Bee Thrive search work is
   exactly that proof.

4. **The site shows up a little in AI answers.** 79 AI Overview / AI Mode
   impressions in 3 months: home 21, AEO 10, About 9.

5. **The audience is right, but it is small.** 84% of impressions and 9 of 12
   clicks come from the UAE. Desktop accounts for 86% of impressions (normal
   for B2B searches).

6. **Impressions fell sharply around 26 Sep 2026.** Before then the site got
   60–180 impressions a day; afterwards it got 7–28. Average position *rose*
   (≈50 → ≈35) at the same time, so it was the deep, low-value impressions
   that disappeared. **The cause is not established.** The owner reports no
   site changes between 22 and 27 Sep, which points to a Google-side change
   (re-ranking or reduced reporting of deep results) rather than a regression
   on the site. Confirm in Search Console that no pages were dropped from the
   index (30-day plan, step 2).

7. **GA4 traffic is too small to judge conversion.** 14 active users and
   42 google/organic sessions in 28 days, with Dubai and Sharjah the top
   cities. Without an internal-traffic filter, some of this is probably the
   owner's own visits. The snapshot's key-events card read "No data
   available".

8. **Two measurement gaps in the code** (both now fixed, see §3):
   - Every page is a full page load, so the contact form's `referrer` field was
     almost always the site's own previous page. The original source (Google,
     ChatGPT) never reached the enquiry email.
   - Every WhatsApp button opened an *empty* chat, so a WhatsApp enquiry could
     not be tied to a page or a source. The Bee Thrive build solved this for
     its client; this site did not do it for itself.

9. **Some copy and data were wrong or overpromised** (fixed, see §3):
   - The AEO page description promised to "get quoted by Google AI Overviews".
   - The AEO page described FAQ rich results with the 2023 policy. Google
     stopped showing them altogether on 7 May 2026.
   - A GEO FAQ claimed "a growing share of buyers ask AI tools … before they
     ever Google" with no source.
   - The `/contact` FAQ put nine answers in its FAQPage markup that were
     **missing from the HTML**: they were only added to the page when someone
     opened a question. This was already the case before this work.

### Assumptions (not verified)

- That buyers for websites, CRM, Odoo and AI automation in Dubai search in
  meaningful volume. The exports cannot show search volume for queries the
  site does not appear for.
- That 2–4% of commercial-page organic sessions become enquiries, and about
  half of those are qualified. These are planning numbers, not site data. On
  that basis, 5 qualified enquiries a month needs roughly **250–500 organic
  sessions a month to service pages and case studies**, against roughly 15–50
  today across the whole site.

### Ranking of constraints

**Visibility > credibility/proof > intent coverage > measurement >
conversion.** Conversion cannot be judged on this little traffic. The site
already has a clear offer (free audit), published prices, WhatsApp in every
service header, and an instrumented form.

---

## 3. Changes in this branch

| Change | Where | Why |
| --- | --- | --- |
| **"Short answer" block** on the four core service pages (Odoo, CRM, AI automation, websites): a question-led H2, a 2–3 sentence direct answer, then who it is for, what is delivered, published starting price, timeline (only where the site already states one), proof and next step | `servicePages.ts` (`glance`), `ServicePage.tsx` | Request items 3 and 4. A buyer comparing tabs, or a system summarising the page, gets the facts in one place. Every row restates something the site already says; prices are read from `pricing.ts`, so they cannot drift |
| **Titles/descriptions** aligned to the queries the pages already get: "Website Design & Development in Dubai", "CRM Development & Implementation in Dubai", "AI & Business Automation in Dubai", "AEO Services in Dubai", home led by "Websites, CRM, Odoo & AI Automation in Dubai", case-study index renamed from "Work" | `servicePages.ts`, `seo.ts` | Matches the words in GSC queries, puts the published floor price in the snippet to qualify clicks, and stops promising AI citations |
| **Bee Thrive as proof on SEO, AEO and GEO pages** (it was only on web development). `/seo-dubai` keeps its Wellington Google Ads study lower down; nothing was replaced | `resultStudyClient`, `ServicePage.tsx` | Real search-work evidence on the pages that sell search work, including the one page near page 1 (AEO) |
| **"Worked example" link** to the Bee Thrive case study from three relevant articles (AEO vs SEO vs GEO, getting cited by ChatGPT, choosing a web developer) | `insights.ts`, `InsightPost.tsx` | Contextual internal links. Pages linking to the study: 4 → 10 |
| **Accuracy fixes**: AEO description and FAQs, FAQ-rich-results status (retired May 2026), GEO overclaims softened, AEO measurement answer now names the Search Console generative AI report | `servicePages.ts` | Credibility on the pages that sell credibility; matches Google's current guidance |
| **Web-development FAQ** "How much does a website cost?" now gives the published figures (Starter AED 2,500 fixed; landing pages from AED 2,500; stores from AED 9,000) | `servicePages.ts` | It used to answer a price question without a price, while the site publishes prices |
| **`/contact` FAQ answers are now in the HTML** (collapsed, same look and animation) | `FAQ.tsx` | The FAQPage markup was claiming answers the page did not contain |
| **Schema**: case-study `Article` gains `image` and `about` (the client, linked); organisation `knowsAbout` gains AEO and GEO; its service catalogue now links each service to its page and adds website design, SEO, AEO and GEO | `seo.ts`, `index.html` | Clearer, accurate entity information. All values match visible content |
| **Enquiry attribution**: first page of the visit and its source (Google / ChatGPT / Bing / direct / `utm_source`) are kept for the tab session. The form sends them as `landing_page` and `source`; a bare WhatsApp link opens with `(Ref: page /crm-development-dubai, via Google)` pre-filled, which the visitor can edit | `lib/attribution.ts`, `analytics.ts`, `Contact.tsx`, `entry-client.tsx` | Lets you count *confirmed* enquiries by page and source. Nothing extra is sent to analytics; consent behaviour is unchanged; ministry pages are excluded; links that already carry text are untouched |
| **Privacy policy** describes the new enquiry details (and the form's existing `page`/`referrer` fields, which it did not mention before) | `Legal.tsx` | Accuracy; its own "last updated" date |
| **Analytics guidance**: mark only `generate_lead` as a key event; WhatsApp and audit clicks are intent, not leads | `analytics.md` | The old guide told you to mark clicks as key events, which counts them as conversions |
| `check:pricing` also validates `resultStudyClient` | `scripts/check-pricing.mjs` | Same silent-join protection as `caseStudyClient` |

**Untouched:** the design system, Projects, Portfolio, Credentials (and their
certificate links), all client work, animations, the Bee Thrive case study
itself, robots rules, noindex rules, redirects, sitemap coverage, Arabic pages.

---

## 4. Validation

| Check | Result |
| --- | --- |
| `npm run build` (ICS, pricing check, `tsc -b`, client + SSR build, prerender, `check:seo`) | **Pass.** 53 routes OK; pricing ok with 7 case-study references resolved |
| `npm run lint` | **Pass** |
| Titles ≤ 60 chars, descriptions ≤ 160, no duplicates, heading outline | Pass (`check:seo`) |
| JSON-LD: parses on all 53 pages (152 nodes); every FAQPage question **and answer** is in the visible HTML; every Service offer price appears on its page | **0 problems.** Baseline had 9: the `/contact` answers, pre-existing, now fixed |
| Internal links resolve to a built page, file or known redirect | 0 broken |
| Sitemap | 49 URLs, identical set to baseline; every URL's canonical matches; no noindex URL listed |
| Intentional noindex | `/ministry`, `/hack` still `noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate`; `vercel.json`, `middleware.ts`, `robots.txt` unchanged |
| Projects / Case studies / Portfolio / Home | Same image, case-study-link and external-link counts as baseline; Credentials tile and certificate links render |
| Rendered layout, 1366×768 and 390×844, 11 key routes | No horizontal overflow, no page errors; screenshots reviewed |
| Behaviour (headless Chromium) | Google referral → `/crm-development-dubai` → `/contact`: form carries `landing_page=/crm-development-dubai`, `source=Google · www.google.com`. WhatsApp header tap: one `whatsapp_click`, no `generate_lead`, message pre-filled once (second tap unchanged). Case-study WhatsApp link with its own text unchanged. `utm_source=chatgpt.com` → `ChatGPT`. Internal referrer → `direct`. Contact FAQ opens/closes (0 → 341px) |
| Performance, lab (390px, 4× CPU, ~1.6 Mbps, 150ms) | **No change from baseline** (LCP and CLS within run-to-run noise on 4 routes) |

### Pre-existing issues found (not introduced, not fixed here)

- **Mobile CLS ≈ 0.25 and late LCP (~7 s) under throttling, on every page
  measured.** Cause: `entry-client.tsx` discards the prerendered HTML and
  re-renders after a ~1.5 MB (uncompressed) vendor bundle loads. The consent
  banner briefly renders near the top of the empty page and is then pushed
  down (that is the layout shift), and the H1 repaints only after the
  re-render. This is a lab measurement. Check field data (Vercel Speed
  Insights, or Search Console → Core Web Vitals) before changing the
  architecture.
- Bundle-size warning (chunk > 500 kB) in the build.
- The organisation is typed `LocalBusiness` with a city-level address; this
  is still an open owner decision (earlier audit, item 1).
- `/cv` (church communications CV) and `/leader-in-you` (a third party's
  course) are indexable on the business domain. That is your call, but they
  blur what the domain is about for search engines and AI summaries.

---

## 5. 30 / 60 / 90-day plan

**Days 1–30: ship, measure, find the drop**
1. Deploy this branch. In Search Console, inspect and request indexing for
   `/`, the four core service pages, `/answer-engine-optimization-dubai` and
   the Bee Thrive case study.
2. **Investigate the 26 Sep impression drop:** in GSC *Pages*, look for newly
   excluded URLs; compare the two weeks before and after by query; check
   Vercel's deployment list for 22–27 Sep.
3. GA4: mark only `generate_lead` as a key event, add an internal-traffic
   filter for your own devices, and start the lead log (§6).
4. Google Business Profile: make sure name, phone and website match the site
   exactly, list services that link to the matching service pages, and post
   the Bee Thrive case study. Ask recent clients for **genuine** reviews.
5. Tell me whether there is a customer-facing address (decides
   `LocalBusiness` versus `Organization`).

**Days 31–60: proof and authority for the core four**
1. Ask clients whose sites you built for a "Website by Xerxes Duane" credit
   (drafts in [`client-credit-links.md`](client-credit-links.md)). Use your
   name as the anchor and one link per site. Google can discount footer links,
   so treat these as evidence and referral traffic rather than a ranking
   switch. Mentions in UAE business directories, partner pages and local press
   carry more weight.
2. Document one more case study each for CRM, Odoo and AI automation, using
   facts you supply (scope, timeline, what changed). No invented metrics.
3. Publish two genuinely useful articles a month aimed at questions already in
   GSC, each linking to its service page and a case study. Candidates: "Odoo
   implementation timeline for a small business", "CRM for a WhatsApp-heavy
   sales team in the UAE". Do not create location doorway pages.
4. Consistent profiles where buyers look (LinkedIn company page, a UAE B2B
   directory or two), using the same name, phone, URL and service wording.

**Days 61–90: review and double down**
1. In GSC, list the pages and queries that moved into positions 1–20. Expand
   those pages, and rewrite titles where CTR is below what the position
   would suggest.
2. If organic sessions to service pages are still under ~100 a month, run a
   small Google Ads test on "Odoo implementation Dubai" / "CRM setup Dubai".
   It measures the enquiry rate of these pages while SEO compounds.
3. Native-speaker review of the Arabic pages (earlier audit, item 6).
4. Fix the re-render performance issue if field data confirms it.

---

## 6. Measurement plan

Five layers, reported side by side and **never summed**:

| Layer | Definition | Source | Where |
| --- | --- | --- | --- |
| 1. Organic visibility | Impressions, clicks, position for the service pages and case studies; AI Overview / AI Mode impressions | Search Console | Performance → filter *Page* contains `-dubai` or `/case-studies/`; *Generative AI* report |
| 2. Organic traffic | Sessions with *Session default channel group = Organic Search* landing on those pages, internal traffic excluded | GA4 | Explore → free-form, dimension *Landing page* |
| 3. Enquiry clicks (intent) | `whatsapp_click`, `cta_book_audit`, `calendar_click`, `email_click` | GA4 events | Exploration, broken down by `location` and session source. **Not leads** |
| 4. Confirmed enquiries | A form received (`generate_lead`, and the Formspree email), a WhatsApp message actually received, or a calendar booking. One row per person, deduplicated | Formspree email (`landing_page`, `source`), WhatsApp inbox (`Ref:` line), zcal | Lead log |
| 5. Qualified leads | A confirmed enquiry from a business (not a job seeker, vendor or spam), in a market you serve, wanting websites/CRM/Odoo/AI automation (or a related service), budget at or near the published floor, timeline within ~6 months | Your judgement after first reply | Lead log |

**Organic qualified enquiries** = layer 5 rows whose source is Google, Bing,
ChatGPT, Perplexity or another search/assistant. Where the source is unknown,
ask "how did you find me?" and record the answer verbatim. As with Bee Thrive,
a ChatGPT tag is *recorded attribution*, not proof that ChatGPT caused the
enquiry.

**Lead log columns** (a simple sheet): date · name/business · channel
(form/WhatsApp/call/email) · landing page · source (as recorded) · service ·
qualified (Y/N + reason) · next step · outcome (audit booked / proposal /
won / lost).

**Monthly review:** layers 1–5 for the month, the conversion rate from each
layer to the next, and which pages produced the qualified leads.

---

## 7. Owner answers and open items

| Item | Status |
| --- | --- |
| Enquiries, last 3 months | **Three organic leads** (owner-reported). Target is 5 qualified a month, so roughly a 5× increase |
| Site changes 22–27 Sep | **None.** Treat the drop as Google-side until GSC shows otherwise |
| Case studies for CRM, Odoo, AI automation | Fact sheets prepared in [`case-study-briefs.md`](case-study-briefs.md); they need the client facts marked *to confirm* before anything is published |
| Client credit links | Outreach plan and draft messages in [`client-credit-links.md`](client-credit-links.md); nothing has been sent |
| Customer-facing address in Dubai (schema typing) | Still open |

---

### Google documentation consulted (9 Oct 2026)

- [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): no extra requirements for AI Overviews / AI Mode beyond being indexed and snippet-eligible.
- [Optimizing your website for generative AI features on Google Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): standard SEO applies; no special schema; `llms.txt` not used by Google Search.
- [Search documentation updates](https://developers.google.com/search/updates): FAQ rich results stopped appearing on 7 May 2026, and the documentation was removed in June 2026.
- [Changes to HowTo and FAQ rich results (2023)](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
- [General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): mark up only what is visible.
- [Generative AI performance report](https://support.google.com/webmasters/answer/16984139): AI Overviews / AI Mode impressions in Search Console.
