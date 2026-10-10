// The Vercel cron for the Wednesday check-in reminders (see _remind.ts).
// Runs every Wednesday at 6pm Dubai; acts only on the eve of a check-in date,
// once per date. Called with the CRON_SECRET, like api/work/invoice-cron.ts.
import { handle, json, safeEqual } from "../work/_lib";
import { sendReminders } from "./_remind";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !(await safeEqual(auth, `Bearer ${secret}`))) return json({ error: "Unauthorized." }, 401);
  return json(await sendReminders(false), 200, { "cache-control": "no-store" });
});
