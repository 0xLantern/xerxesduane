// Vercel Cron, daily at 19:00 UTC (23:00 in Dubai). On the 15th and the 30th
// (the last day in February) it emails the period that ends that day to GCN.
// Every other day it does nothing. A sent-flag in Redis keeps a retried run
// from sending the same invoice twice.
import { allEntries, getSettings, getShareToken, handle, json, redis, safeEqual } from "./_lib";
import { buildInvoice, emailInvoice, invoiceUrl, periodEndingOn } from "./_invoice";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !(await safeEqual(auth, `Bearer ${secret}`))) return json({ error: "Unauthorized." }, 401);

  const period = periodEndingOn(Date.now());
  if (!period) return json({ skipped: "not an invoice day" });

  const flag = `work:v1:invoiced:${period.id}`;
  const [claimed] = await redis([["SET", flag, String(Date.now()), "NX", "EX", 90 * 24 * 60 * 60]]);
  if (claimed !== "OK") return json({ skipped: `already sent ${period.id}` });

  const [entries, settings, token] = await Promise.all([allEntries(), getSettings(), getShareToken()]);
  const inv = buildInvoice(entries, settings, period);
  if (inv.lines.length === 0) return json({ skipped: `no hours in ${period.id}` });
  try {
    await emailInvoice(inv, invoiceUrl(token, period.id));
  } catch (err) {
    // Let tomorrow's manual send or a re-run try again.
    await redis([["DEL", flag]]);
    throw err;
  }
  return json({ sent: inv.number, total: inv.total });
});
