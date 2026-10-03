// Vercel Cron, daily at 20:05 UTC (00:05 in Dubai), just after a day ends.
//
// It sends the last month that has fully closed, if that invoice hasn't
// gone out yet. So October's invoice goes at 00:05 on 1 November, with every
// hour of the 31st on it, and a send that failed is tried again the next
// night. Each failure emails the owner. A saved copy of each sent invoice
// (see sendInvoice) is what stops it going twice.
//
// It also emails the owner once about a timer left running over six hours,
// and on Monday mornings (Dubai) sends them the weekly backup: everything
// the log and the letters desk keep, as a JSON file and a spreadsheet.
import { OWNER_EMAIL, getShareToken, getTimer, handle, json, redis, safeEqual } from "./_lib";
import { EmptyInvoice, FIRST_SAVED, notifyOwner, periodContaining, previousPeriod, savedInvoice, sendInvoice } from "./_invoice";
import { buildExport, entriesCsv, today } from "./_export";

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

  // Monday in Dubai (the cron runs at 00:05 there): the weekly backup. The
  // key keeps a re-run the same night from sending it twice.
  if (new Date(Date.now() + 4 * 3600e3).getUTCDay() === 1) {
    const day = today();
    const [first] = await redis([["SET", `work:v1:backup:${day}`, "1", "NX", "EX", 8 * 24 * 3600]]);
    if (first === "OK") {
      try {
        out.backup = await sendBackup(day);
      } catch (err) {
        await redis([["DEL", `work:v1:backup:${day}`]]).catch(() => undefined);
        out.backup = `failed: ${String(err).slice(0, 120)}`;
      }
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

/** The weekly backup email: the full export as JSON, the hours as CSV. */
async function sendBackup(day: string): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "skipped: no RESEND_API_KEY";
  const data = await buildExport();
  const hours = Math.round((data.entries.reduce((n, e) => n + (e.end - e.start), 0) / HOUR) * 100) / 100;
  const enc = (s: string) => {
    const bytes = new TextEncoder().encode(s);
    let out = "";
    for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(out);
  };
  const from = process.env.WORK_INVOICE_FROM || "Work log <invoices@xerxesduane.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [OWNER_EMAIL],
      subject: `Weekly backup · ${day}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#2b2420;">
<p>Your weekly copy of everything the work log and the letters desk keep, attached.</p>
<ul>
<li><strong>${data.entries.length}</strong> hours entries, <strong>${hours.toFixed(2)} h</strong> all time</li>
<li><strong>${Object.keys(data.payments).length}</strong> invoices marked paid · <strong>${Object.keys(data.summaries).length}</strong> monthly notes</li>
<li><strong>${data.trash.length}</strong> in the trash · <strong>${data.letters.partners.length}</strong> partners · <strong>${data.letters.prayer.length}</strong> prayer requests</li>
</ul>
<p style="color:#8a7f75;font-size:13px;">Keep a few of these. The JSON is the complete backup; the CSV opens in a spreadsheet. work.xerxesduane.com</p>
</div>`,
      attachments: [
        { filename: `work-backup-${day}.json`, content: enc(JSON.stringify(data, null, 2)) },
        { filename: `hours-${day}.csv`, content: enc(entriesCsv(data.entries, data.settings.rate, data.settings.currency)) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
  return `sent ${data.entries.length} entries`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
