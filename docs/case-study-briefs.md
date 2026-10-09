# Case-study fact sheets: CRM, Odoo, AI automation

Each fact sheet starts from what the site **already publishes** (so nothing new
is invented), then lists the facts still needed before a study can go live.
Fill in the *to confirm* lines, send them back, and I will write the study into
`src/data/content.ts` using the same fields as the Bee Thrive one (`challenge`,
`approach`, `scope`, `outcomes`, `journey`, `takeaway`).

Rules, the same as the rest of the site:

- Only facts you can stand behind. "Fewer missed follow-ups" is fine if the
  client said it; "40% more sales" needs a number you can show.
- No revenue, rankings, reviews or testimonials unless the client provided
  them and agreed to publication.
- Get the client's OK to be named. If they prefer, the study can be anonymised
  ("a Dubai trading company").

---

## 1. Odoo: Blocktec Philippines (updated 9 Oct 2026)

**Now public** (`/case-studies/blocktec-odoo-erp`), confirmed by the owner:
Odoo Enterprise; a multi-phase rollout of more than four months; handed over
to Blocktec's own team after go-live; outcome: sales, inventory, purchasing and
projects now work from the same records. Shown as the "Client result" on
`/odoo-erp-dubai`.

**Still to confirm (optional)**

- [ ] Year it went live and Odoo version
- [ ] Number of users / departments in the system
- [ ] OK to keep naming Blocktec?

**Better still for Dubai buyers:** a UAE Odoo client, even anonymised.

---

## 2. CRM: Saladmaster UAE (updated 9 Oct 2026, outcome still open)

**Now public** (`/case-studies/saladmaster-crm-web`), confirmed by the owner:
Odoo CRM; leads from the website, WhatsApp, cooking demos/events and
referrals in one pipeline; a demo booking calendar tied to each lead; team
reminders; WhatsApp and email follow-up sequences; pipeline and sales
dashboards. Plus the original scope (website management, logo and brand
identity, sales-process organisation).

**Still to confirm**

- [ ] Whether the CRM records each lead's source automatically
- [ ] One before/after the client agrees with (for example, "every demo booking is now in one calendar", "no lead sits without an owner")
- [ ] Timeline of the build
- [ ] OK to keep naming Saladmaster UAE / Al Mumtaz?

---

## 3. AI automation: We Aspire (published 9 Oct 2026, scope only)

**Published** at `/case-studies/we-aspire-ai-automation` from the facts already
on the site (e-learning platform, automated registration, QuickBooks-integrated
invoicing) plus the owner's confirmation that AI is part of the workflow. It
says nothing about *what* the AI does, which tools are used, timing or results,
because none of that is confirmed yet. Answer the questions below to complete it.

Candidates considered:

| Candidate | What the site already says | Fit |
| --- | --- | --- |
| **We Aspire** (education, Dubai) | "Custom e-learning platforms, automated registration, and QuickBooks-integrated invoicing" (industries list) | Automation; AI only if a model is actually involved |
| **Gilani Mobility** (healthcare mobility, Dubai) | "E-commerce for assistive products, CRM for patient relationships" | CRM / e-commerce; automation if order or lead flows were automated |
| **Your own site assistant / AI Lab** | Live tools anyone can try at `/ai-lab` | Real and verifiable, but it is your own product, not a client result. It can be written as "how I built it", not as a case study |

**To confirm (for whichever client you pick)**

- [ ] Client name, or permission to anonymise
- [ ] The repetitive task before (who did it, how often, roughly how long)
- [ ] What triggers the automation now (form, inbox, WhatsApp, schedule)
- [ ] Which tools/models are involved (for example, OpenAI/Claude/Gemini, Make/Zapier/n8n, Odoo, QuickBooks)
- [ ] What still goes to a human
- [ ] One outcome the client agrees with (time saved per week, response time, errors avoided), with the period it was measured over
- [ ] Live since when, and is it maintained?

---

## Data template

```ts
{
  slug: "client-service",               // e.g. "we-aspire-registration-automation"
  client: "",
  location: "Dubai · Sector",
  category: "AI Automation",            // or "CRM", "Odoo ERP"
  metaDescription: "",                  // ≤ 160 chars
  challenge: "",
  summary: "",
  approach: ["", "", "", ""],
  scope: ["", ""],
  relatedServices: ["ai-automation-dubai"],
  url: "",                              // live client site, if public
  takeaway: "",
  outcomes: [{ title: "", detail: "" }],   // client-confirmed only
},
```

Once a study is added, it gets linked from its service page with
`resultStudyClient` (the "Client result" panel) and its `relatedServices`.

---

## 4. E-commerce: Gilani Mobility (published 9 Oct 2026, outcome still open)

**Public** (`/case-studies/gilani-mobility-ecommerce`), confirmed by the owner:
WooCommerce store; UAE online payments; inventory and orders connected to the
back office; customer CRM; WhatsApp enquiries; built over more than three
months. Shown as proof on `/ecommerce-development-dubai`.

**Still to confirm**

- [ ] One outcome the client agrees with (for example, "customers can now order online instead of calling")
- [ ] Which payment gateway and back-office system (if they can be named)
- [ ] OK to name Gilani Mobility?
