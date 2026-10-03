// PDF downloads, for the owner (?c=<client id>, GCN without) or the client's link (?t=<token>).
//
//   ?kind=invoice&p=YYYY-MM|last|current       the invoice for a month
//   ?kind=log&m=YYYY-MM                        the month's work log
//   ?kind=year&y=YYYY                          the year statement: every month's invoice and whether it was paid
import { allEntries, allPayments, allSummaries, errorResponse, getSettings, handle, readScope, settingsFor, underLimit } from "./_lib";
import { WORK_ORIGIN, buildInvoice, invoiceFor, listInvoices, monthPeriod, resolvePeriod } from "./_invoice";
import { renderPdf, renderYearPdf } from "./_pdf";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "GET") return errorResponse("Method not allowed.", 405);
  if (!(await underLimit("pdf", req, 30, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
  const scope = await readScope(req);
  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind");
  const kind = kindParam === "log" ? "log" : kindParam === "year" ? "year" : "invoice";
  if (!scope) {
    return errorResponse("This link isn't valid any more. Ask for a new one.", 404);
  }
  const { client } = scope;
  // The logo is read from this deployment, so previews work before release.
  const origin = url.origin.includes("localhost") ? WORK_ORIGIN : url.origin;
  const [entries, owner] = await Promise.all([allEntries(), getSettings()]);
  const headers = (name: string) => ({
    "content-type": "application/pdf",
    "content-disposition": `attachment; filename="${name.replace(/[^\w.-]+/g, "-")}"`,
    "cache-control": "no-store",
    "x-robots-tag": "noindex, nofollow",
  });

  if (kind === "year") {
    const now = Date.now();
    const thisYear = new Date(now + 4 * 3600e3).getUTCFullYear();
    const y = Number(url.searchParams.get("y") ?? thisYear);
    if (!Number.isInteger(y) || y < 2020 || y > thisYear + 1) return errorResponse("That isn't a year this log covers.");
    const rows = await listInvoices(entries, client, owner, await allPayments(client.id), now);
    const pdf = await renderYearPdf(y, rows, settingsFor(owner, client), client, origin, now);
    return new Response(pdf, { headers: headers(`Year-statement-${client.short}-${y}.pdf`) });
  }

  const period =
    kind === "log"
      ? // No month given: this month, in Dubai.
        (monthPeriod(url.searchParams.get("m")) ?? monthPeriod(new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 7))!)
      : resolvePeriod(url.searchParams.get("p"));

  const inv = kind === "invoice" ? await invoiceFor(client, period) : buildInvoice(entries, client, owner, period);
  const summary = kind === "log" ? ((await allSummaries(client.id))[period.id] ?? null) : null;
  const pdf = await renderPdf(inv, kind, origin, summary);
  const name = kind === "log" ? `Work-log-${client.short}-${period.id}.pdf` : `Invoice-${inv.number}.pdf`;
  return new Response(pdf, { headers: headers(name) });
});
