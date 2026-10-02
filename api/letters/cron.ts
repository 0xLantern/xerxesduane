// Vercel Cron, daily at 05:15 UTC (09:15 in Dubai): sends every letter that
// is scheduled for today or earlier. A scheduled letter left over from a
// failed run goes out the next morning. Failures email the owner.
import { allIssues, handle, json, sendIssue, today } from "./_lib";
import { notifyOwner } from "../work/_invoice";
import { safeEqual } from "../work/_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || !(await safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`))) return json({ error: "Unauthorized." }, 401);
  const due = (await allIssues()).filter((i) => i.status === "scheduled" && i.sendOn <= today());
  const out: string[] = [];
  for (const issue of due) {
    try {
      const r = await sendIssue(issue);
      out.push(`${issue.id}: sent to ${r.count}`);
    } catch (err) {
      out.push(`${issue.id}: failed`);
      await notifyOwner(
        `Your letter "${issue.draft.title}" didn't send`,
        `<p>The scheduled letter <strong>${issue.draft.title.replace(/</g, "&lt;")}</strong> failed to send. It will be tried again tomorrow morning.</p><p style="color:#8a7f75;font-size:13px;">${String(err).replace(/</g, "&lt;").slice(0, 300)}</p>`,
      );
    }
  }
  return json({ due: due.length, results: out });
});
