// PDF downloads, for the owner or the client's link (?t=<token>).
//
//   ?kind=invoice&p=YYYY-MM-A|B|last|current   the invoice for a half-month
//   ?kind=log&m=YYYY-MM                        the month's work log
import { allEntries, errorResponse, getSettings, handle, readScope, underLimit } from "./_lib";
import { WORK_ORIGIN, buildInvoice, invoiceFor, monthPeriod, resolvePeriod } from "./_invoice";
import { renderPdf } from "./_pdf";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "GET") return errorResponse("Method not allowed.", 405);
  if (!(await underLimit("pdf", req, 30, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
  const scope = await readScope(req);
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "log" ? "log" : "invoice";
  if (!scope) {
    return errorResponse("This link isn't valid any more. Ask for a new one.", 404);
  }
  const period =
    kind === "log"
      ? // No month given: this month, in Dubai.
        (monthPeriod(url.searchParams.get("m")) ?? monthPeriod(new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 7))!)
      : resolvePeriod(url.searchParams.get("p"));

  const [entries, settings] = await Promise.all([allEntries(), getSettings()]);
  const inv = kind === "invoice" ? await invoiceFor(period) : buildInvoice(entries, settings, period);
  // The logo is read from this deployment, so previews work before release.
  const pdf = await renderPdf(inv, kind, url.origin.includes("localhost") ? WORK_ORIGIN : url.origin);
  const name = kind === "log" ? `Work-log-${settings.client}-${period.id}.pdf` : `Invoice-${inv.number}.pdf`;
  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${name.replace(/[^\w.-]+/g, "-")}"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
});
