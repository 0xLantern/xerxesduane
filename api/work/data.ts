// Everything the owner's screen needs, in one read.
import {
  allEntries,
  allShareTokens,
  allSummariesByClient,
  getClients,
  getSettings,
  getTimer,
  handle,
  json,
  requireOwner,
  trashList,
} from "./_lib";
import { allInvoiceRows } from "./_invoice";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);
  const denied = await requireOwner(req, false);
  if (denied) return denied;
  const [entries, timer, settings, clients, trash] = await Promise.all([allEntries(), getTimer(), getSettings(), getClients(), trashList()]);
  const [tokens, summaries] = await Promise.all([allShareTokens(clients), allSummariesByClient(clients)]);
  const now = Date.now();
  const invoices = await allInvoiceRows(entries, clients, settings, now);
  return json({
    entries,
    timer,
    settings,
    clients,
    shareTokens: Object.fromEntries(tokens),
    // Kept for the page's first load: GCN's link.
    shareToken: tokens.get("gcn") ?? "",
    invoices,
    summaries,
    trash,
    now,
  });
});
