// The client's read-only view, behind the token in their private link.
//
// No cookie and no login: the 128-bit token is the credential, which is what
// lets the client open it from an email on any device. A wrong token is a 404
// rather than a 401, so the endpoint says nothing about whether a log exists.
// The token names the client, so each client sees only their own hours.
import {
  OWNER_EMAIL,
  allEntries,
  allPayments,
  allSummaries,
  entriesOf,
  errorResponse,
  getSettings,
  getTimer,
  handle,
  json,
  clientPasswordSet,
  tokenScope,
  underLimit,
} from "./_lib";
import { listInvoices, owed } from "./_invoice";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "GET") return errorResponse("Method not allowed.", 405);
  if (!(await underLimit("report", req, 60, 60))) {
    return errorResponse("Too many requests. Wait a minute and refresh.", 429);
  }
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const scope = await tokenScope(token, req);
  if (scope === "locked") {
    return json({ error: "Enter the password to see this page.", locked: true, configured: clientPasswordSet() }, 401);
  }
  if (!scope) {
    return errorResponse("This link isn't valid any more. Ask for a new one.", 404);
  }
  const { client } = scope;
  const [all, owner, timer, payments, summaries] = await Promise.all([allEntries(), getSettings(), getTimer(), allPayments(client.id), allSummaries(client.id)]);
  const now = Date.now();
  const entries = entriesOf(all, client.id);
  const invoices = await listInvoices(entries, client, owner, payments, now);
  return json({
    entries,
    settings: { name: owner.name, client: client.name, rate: client.rate, currency: client.currency },
    client: { id: client.id, name: client.name, logo: client.logo },
    // Each month's invoice and whether it has been paid, and the owner's
    // note for each month: the client sees both.
    invoices,
    owed: owed(invoices),
    summaries,
    email: OWNER_EMAIL,
    // Only the fact and the start, so the client can see work in progress.
    // Not for a timer left running past ten hours, which is a forgotten one
    // rather than work.
    working: timer && timer.client === client.id && now - timer.start < 10 * 60 * 60 * 1000 ? { start: timer.start } : null,
    now,
  });
});
