# Analytics & conversion tracking

The site already emits the events below. This guide is the one-time setup to turn
them into **measurable conversions** in GA4 so you can see what actually drives
booked audits.

## Events the site fires

Defined in `src/lib/analytics.ts` (a thin `gtag` wrapper) and wired up via
delegated click tracking + the contact form:

| Event | When it fires | Params |
|-------|---------------|--------|
| `generate_lead` | Contact form accepted by Formspree (`method: formspree`), or the AI Lab capture form (`method: ai_lab_capture`) | `method`, `page` / `demo` |
| `form_start` / `form_submit` / `form_error` | First focus, submit attempt, validation failure on the audit form | `form_id`, `page`, field names and error codes only |
| `cta_book_audit` | Any link to `/contact` clicked | `location`, `label`, `cta_slot` |
| `whatsapp_click` | Any WhatsApp link/button tapped (opens WhatsApp; nothing is known to be sent) | `location`, `label`, `cta_slot` |
| `calendar_click` / `email_click` | Booking link / `mailto:` clicked | `location`, `label`, `cta_slot` |
| `demo_engage` | First interaction with an AI Lab demo widget | `demo` |
| `demo_cta` | "Build this for my business" clicked on a demo card | `demo` |
| `ai_lab_filter` | AI Lab category filter changed | `category` |
| `email_copy` | Hero email address copied to clipboard | `location` |

`generate_lead` is the only event that means an enquiry was actually received.
`whatsapp_click`, `cta_book_audit`, `calendar_click` and `email_click` are
**clicks**: someone opened a channel, which is intent, not a lead. Never add
them to `generate_lead` in a report.

### Enquiry attribution (added October 2026)

Every page is a full page load, so `document.referrer` on `/contact` is almost
always this site's previous page, and the original source was being lost.
`src/lib/attribution.ts` now records, once per tab session, the first page of
the visit and its external source (`Google`, `ChatGPT`, `Bing`, `direct`, …;
`utm_source` wins when present). It is kept in `sessionStorage`, is never sent
to analytics, and is used in two places only:

- **Contact form** — hidden fields `page`, `referrer`, `landing_page` and
  `source` arrive in every Formspree email.
- **WhatsApp** — a bare `wa.me` link gets a pre-filled opening line ending in
  `(Ref: page /crm-development-dubai, via Google)` at the moment it is tapped.
  The visitor sees it and can edit it before sending. Links that already carry
  their own text (contact form, assistant, case-study and Arabic CTAs) are not
  changed, and the ministry pages are excluded.

So a WhatsApp message that arrives carrying a `Ref:` line can be logged as a
confirmed enquiry with its page and source, which GA4 can never do on its own.

## One-time GA4 setup (≈10 minutes)

GA4 property: `G-N8FX3F1CZ1` (loaded in `index.html`, consent-gated).

1. **Mark key events** — GA4 → *Admin → Events → Key events*. Mark
   `generate_lead` only. Do **not** mark `whatsapp_click` or `cta_book_audit`:
   a key event is counted as a conversion everywhere in GA4 (and in Google Ads
   if imported), and a tap that opens WhatsApp is not an enquiry. Report the
   clicks in an exploration beside the leads instead.
2. **Build the funnel** — *Explore → Funnel exploration*. Steps:
   `page_view` → `cta_book_audit` → `generate_lead`. Add `whatsapp_click` as an
   alternative final step. This shows where people drop off.
3. **Segment by landing page** — break the funnel down by `page` (or landing
   page) to see which routes convert (home vs. a service page vs. /portfolio).
4. **Mark up Google Ads / Search Console** — if running ads, import
   `generate_lead` as a conversion in Google Ads.

## Microsoft Clarity (heatmaps + recordings)

Clarity ID `x0f7gwiena` loads only after cookie consent. Use it to:
- Watch session recordings of visitors who **bounced** on the homepage.
- Check the **scroll heatmap** to see how far down the (long) homepage people get
  — if most never reach a section, cut or move it up.
- Filter recordings to sessions with a `generate_lead` to see the winning path.

## Testing the events

In the browser console on the live site (after accepting cookies):
```js
// should log the gtag dataLayer pushes
window.dataLayer.filter(x => x[0] === 'event')
```
Or use GA4 → *Admin → DebugView* with the GA Debugger extension on.
