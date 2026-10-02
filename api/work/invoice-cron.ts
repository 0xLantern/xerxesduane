// Vercel Cron, daily at 20:05 UTC (00:05 in Dubai), just after a day ends.
//
// It sends the last month that has fully closed, if that invoice hasn't
// gone out yet. So October's invoice goes at 00:05 on 1 November, with every
// hour of the 31st on it, and a send that failed is tried again the next
// night. Each failure emails the owner. A saved copy of each sent invoice
// (see sendInvoice) is what stops it going twice.
//
// It also emails the owner once about a timer left running over six hours.
import { getShareToken, getTimer, handle, json, redis, safeEqual } from "./_lib";
import { EmptyInvoice, FIRST_SAVED, notifyOwner, periodContaining, previousPeriod, savedInvoice, sendInvoice } from "./_invoice";

export const config = { runtime: "edge" };

const HOUR = 60 * 60 * 1000;

export default handle(async (req) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !(await safeEqual(auth, `Bearer ${secret}`))) return json({ error: "Unauthorized." }, 401);

  const out: Record<string, string> = {};

  // A timer running this long was almost certainly forgotten.
  const timer = await getTimer();
  if (timer && Date.now() - timer.start > 6 * HOUR) {
    const [first] = await redis([["SET", `work:v1:timer-warned:${timer.start}`, "1", "NX", "EX", 7 * 24 * 3600]]);
    if (first === "OK") {
      const hours = Math.floor((Date.now() - timer.start) / HOUR);
      await notifyOwner(
        "Your work timer is still running",
        `<p>The timer${timer.task ? ` for <strong>${escapeHtml(timer.task)}</strong>` : ""} has been running for ${hours} hours.</p>
         <p>If you forgot to stop it, open work.xerxesduane.com and use <strong>I stopped earlier</strong> to save the real end time.</p>`,
      );
      out.timer = "warned";
    }
  }

  const period = previousPeriod(periodContaining(Date.now()));
  if (period.id < FIRST_SAVED) return json({ ...out, skipped: `${period.id} was sent by hand` });
  if (await savedInvoice(period.id)) return json({ ...out, skipped: `already sent ${period.id}` });

  try {
    const inv = await sendInvoice(period, await getShareToken());
    return json({ ...out, sent: inv.number, total: inv.total });
  } catch (err) {
    if (err instanceof EmptyInvoice) return json({ ...out, skipped: `no hours in ${period.id}` });
    await notifyOwner(
      `Invoice for ${period.label} didn't send`,
      `<p>The automatic invoice for <strong>${period.label}</strong> failed to send. It will be tried again tonight at 00:05.</p>
       <p>To send it now, open work.xerxesduane.com → Share &amp; settings → Email last invoice now.</p>
       <p style="color:#8a7f75;font-size:13px;">${escapeHtml(String(err).slice(0, 300))}</p>`,
    );
    throw err;
  }
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
