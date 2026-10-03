// The invoice for one month (see _invoice.ts).
//
//   GET  ?p=YYYY-MM&t=<token>        the printable invoice, for the owner
//                                   (?c=<client id>) or the client's private link
//   POST { period?, resend?, client? }  email it to the client now (owner only)
import { errorResponse, getClient, getShareToken, handle, json, readJson, readScope, requireOwner, underLimit } from "./_lib";
import { AlreadySent, EmptyInvoice, MailMissing, NoRecipient, fmtDate, invoiceFor, invoiceRecipients, renderInvoice, resolvePeriod, sendInvoice } from "./_invoice";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (!(await underLimit("invoice", req, 60, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
    const scope = await readScope(req);
    if (!scope) {
      return errorResponse("This link isn't valid any more. Ask for a new one.", 404);
    }
    const period = resolvePeriod(url.searchParams.get("p"));
    const t = url.searchParams.get("t");
    const c = scope.scope === "owner" ? `&c=${encodeURIComponent(scope.client.id)}` : "";
    const pdfUrl = `/api/work/pdf?kind=invoice&p=${period.id}${t ? `&t=${encodeURIComponent(t)}` : c}`;
    const html = renderInvoice(await invoiceFor(scope.client, period), { printable: true, pdfUrl });
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
    });
  }

  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const body = await readJson(req);
  const client = await getClient(body.client);
  if (!client) return errorResponse("That client isn't on the list any more.", 404);
  const period = resolvePeriod(body.period);
  try {
    const inv = await sendInvoice(client, period, await getShareToken(client.id), { resend: body.resend === true });
    return json({ sent: inv.number, to: invoiceRecipients(client) });
  } catch (err) {
    if (err instanceof MailMissing) return errorResponse("Email isn't set up yet: add RESEND_API_KEY in Vercel.", 503);
    if (err instanceof NoRecipient) return errorResponse(`${client.name} has no invoice email yet. Add one under the client's details.`);
    if (err instanceof EmptyInvoice) return errorResponse("There are no hours in that period, so there's nothing to invoice.");
    if (err instanceof AlreadySent) return json({ error: `This invoice was already sent${err.sentAt ? ` on ${fmtDate(err.sentAt)}` : ""}.`, sentAt: err.sentAt }, 409);
    throw err;
  }
});
