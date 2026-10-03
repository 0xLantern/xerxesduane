// Everything the owner's screen needs, in one read.
import { allEntries, allPayments, allSummaries, getSettings, getShareToken, getTimer, handle, json, requireOwner, trashList } from "./_lib";
import { listInvoices, owed } from "./_invoice";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);
  const denied = await requireOwner(req, false);
  if (denied) return denied;
  const [entries, timer, settings, shareToken, payments, summaries, trash] = await Promise.all([
    allEntries(),
    getTimer(),
    getSettings(),
    getShareToken(),
    allPayments(),
    allSummaries(),
    trashList(),
  ]);
  const now = Date.now();
  const invoices = await listInvoices(entries, settings, payments, now);
  return json({ entries, timer, settings, shareToken, invoices, owed: owed(invoices), summaries, trash, now });
});
