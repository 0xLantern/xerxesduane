// The invoice for one half-month period (see _invoice.ts).
//
//   GET  ?p=YYYY-MM-A|B&t=<token>   the printable invoice, for the client's
//                                   link or the signed-in owner
//   POST { period? }                email it to GCN now (owner only)
import {
  allEntries,
  errorResponse,
  getSettings,
  getShareToken,
  handle,
  isOwner,
  json,
  readJson,
  requireOwner,
  safeEqual,
  underLimit,
} from "./_lib";
import { MailMissing, buildInvoice, emailInvoice, invoiceRecipients, invoiceUrl, periodContaining, periodFor, previousPeriod, renderInvoice } from "./_invoice";

export const config = { runtime: "edge" };

/** A period id, or "current" (still open) or "last" (the last one closed, the default). */
function resolve(p: unknown) {
  const now = periodContaining(Date.now());
  if (p === "current") return now;
  return periodFor(p) ?? previousPeriod(now);
}

export default handle(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (!(await underLimit("invoice", req, 60, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
    const token = url.searchParams.get("t") ?? "";
    const owner = await isOwner(req);
    if (!owner && (token.length < 16 || !(await safeEqual(token, await getShareToken())))) {
      return errorResponse("This link isn't valid any more. Ask for a new one.", 404);
    }
    const period = resolve(url.searchParams.get("p"));
    const [entries, settings] = await Promise.all([allEntries(), getSettings()]);
    const html = renderInvoice(buildInvoice(entries, settings, period), { printable: true });
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
    });
  }

  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const body = await readJson(req);
  const period = resolve(body.period);
  const [entries, settings, token] = await Promise.all([allEntries(), getSettings(), getShareToken()]);
  const inv = buildInvoice(entries, settings, period);
  try {
    await emailInvoice(inv, invoiceUrl(token, period.id));
  } catch (err) {
    if (err instanceof MailMissing) return errorResponse("Email isn't set up yet: add RESEND_API_KEY in Vercel.", 503);
    throw err;
  }
  return json({ sent: inv.number, to: invoiceRecipients() });
});
