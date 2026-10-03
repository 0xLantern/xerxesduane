// The invoice list, and whether each one has been paid.
//
//   GET  ?t=<token> | ?c=<client>    every month's invoice with its status,
//                                    for the owner or the client (/gcn too)
//   POST { client, period, paid: true, currency, amount?, paidAt?, note? }
//                                    mark an invoice paid (owner only)
//   POST { client, period, paid: false }   take that back
import { allPayments, errorResponse, getClient, handle, json, readJson, readScope, requireOwner, setPayment, underLimit, type Payment } from "./_lib";
import { invoiceList, owed, periodFor } from "./_invoice";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method === "GET") {
    if (!(await underLimit("invoices", req, 60, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
    const scope = await readScope(req);
    if (!scope) return errorResponse("This link isn't valid any more. Ask for a new one.", 404);
    const invoices = await invoiceList(scope.client);
    return json({ invoices, owed: owed(invoices) });
  }

  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const body = await readJson(req);
  const client = await getClient(body.client);
  if (!client) return errorResponse("That client isn't on the list any more.", 404);
  const period = periodFor(body.period);
  if (!period) return errorResponse("That isn't an invoice period.");

  if (body.paid === false) {
    await setPayment(client.id, period.id, null);
  } else {
    const currency = body.currency === "CHF" ? "CHF" : "USD";
    const amountRaw = body.amount === undefined || body.amount === null || body.amount === "" ? null : Number(body.amount);
    if (amountRaw !== null && (!Number.isFinite(amountRaw) || amountRaw < 0 || amountRaw > 1e7)) return errorResponse("That amount doesn't look right.");
    const amount = amountRaw === null ? null : Math.round(amountRaw * 100) / 100;
    // The day the money arrived, as YYYY-MM-DD (noon in Dubai, so the date never shifts) or epoch ms; today otherwise.
    let paidAt = Date.now();
    if (typeof body.paidAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.paidAt)) paidAt = Date.parse(`${body.paidAt}T12:00:00+04:00`);
    else if (typeof body.paidAt === "number" && Number.isFinite(body.paidAt)) paidAt = body.paidAt;
    if (!Number.isFinite(paidAt) || paidAt > Date.now() + 24 * 3600e3) return errorResponse("The payment date can't be in the future.");
    const note = String(body.note ?? "").trim().slice(0, 200);
    const existing = (await allPayments(client.id))[period.id];
    const p: Payment = { paidAt, currency, amount, note };
    // Marking it again only changes what was given.
    await setPayment(client.id, period.id, existing ? { ...existing, ...p } : p);
  }
  const invoices = await invoiceList(client);
  return json({ invoices, owed: owed(invoices) });
});
