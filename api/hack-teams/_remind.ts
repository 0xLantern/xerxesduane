// The Wednesday check-in reminder: one short email to each placed participant
// the evening before a weekly check-in, with their own page link and whether
// their team has posted this week. Sent by the cron (remind.ts) on the eve of
// each date in CHECK_IN_GOALS, once per date, or by the owner from the panel.
//
// Only people a Champion has given an email address get one. The email says
// as little as the page itself: no challenge names, nothing about who it's for.
import { CHECK_IN_GOALS } from "../../src/data/hack";
import { greetName } from "../../src/hackpartners/greet";
import { OWNER_EMAIL } from "../work/_lib";
import { K, ORIGIN, esc, parse, redis, type CheckIn, type Person } from "./_lib";

const DAY = 24 * 60 * 60 * 1000;
/** The date in Dubai (UTC+4 all year) as YYYY-MM-DD. */
const dubaiDate = (t: number) => new Date(t + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);

export async function sendReminders(force: boolean): Promise<{ sent: number; skipped: string; date?: string }> {
  const api = process.env.RESEND_API_KEY;
  if (!api) return { sent: 0, skipped: "Email isn't set up (RESEND_API_KEY)." };
  const [published] = await redis([["GET", `${K}published`]]);
  if (published !== "1") return { sent: 0, skipped: "The teams aren't announced yet." };

  const now = Date.now();
  const dates = Object.keys(CHECK_IN_GOALS).sort();
  const tomorrow = dubaiDate(now + DAY);
  // The cron only acts on the eve of a check-in; the owner's button picks the next one.
  const date = force ? dates.find((d) => d >= dubaiDate(now)) : dates.includes(tomorrow) ? tomorrow : undefined;
  if (!date) return { sent: 0, skipped: force ? "There are no check-ins left." : "Tomorrow isn't a check-in." };
  if (!force) {
    const [first] = await redis([["SET", `${K}reminded:${date}`, "1", "NX", "EX", 14 * 24 * 3600]]);
    if (first !== "OK") return { sent: 0, skipped: "Already sent for this check-in.", date };
  }

  const [all] = await redis([["HGETALL", `${K}people`]]);
  const flat = Array.isArray(all) ? (all as string[]) : [];
  const people: Person[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const p = parse<Person>(flat[i + 1]);
    if (p?.team && p.email) people.push(p);
  }
  const teams = [...new Set(people.map((p) => p.team!))];
  const latest = await redis(teams.map((n) => ["LRANGE", `${K}checkins:${n}`, 0, 0]));
  // "This week" is since the previous check-in call, or since the dinner for the first one.
  const i = dates.indexOf(date);
  const since = Date.parse(`${i > 0 ? dates[i - 1] : "2026-10-17"}T21:00:00+04:00`);
  const posted = new Map(
    teams.map((n, j) => {
      const top = Array.isArray(latest[j]) ? parse<CheckIn>((latest[j] as unknown[])[0]) : null;
      return [n, !!top && top.at > since];
    }),
  );

  const fromAddress = /<([^>]+)>/.exec(process.env.LETTERS_FROM ?? "")?.[1] ?? "letters@xerxesduane.com";
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Dubai" }).format(new Date(`${date}T12:00:00+04:00`));
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Asia/Dubai" }).format(new Date(`${date}T12:00:00+04:00`));
  let sent = 0;
  for (const p of people) {
    const link = `${ORIGIN}/ht/${p.code}`;
    const done = posted.get(p.team!);
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:520px">
<p>Hi ${esc(greetName(p.name))},</p>
<p>Our next weekly check-in is <strong>${esc(day)}, at 8pm</strong> on Google Meet.</p>
<p>By then: ${esc(CHECK_IN_GOALS[date])}.</p>
<p>${done ? "Your team has already posted this week's check-in. Thank you!" : "Your team hasn't posted this week's check-in yet. One of you can do it in two minutes on your page."}</p>
<p><a href="${link}" style="display:inline-block;background:#131313;color:#EFE974;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open your page</a></p>
<p style="color:#6a6a6a;font-size:13px">The link is private to you and opens on two devices only, so please don't forward this email.</p>
<p>Xerxes and Abel</p>
</div>`;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${api}`, "content-type": "application/json" },
        body: JSON.stringify({ from: `Xerxes Duane <${fromAddress}>`, to: [p.email], reply_to: OWNER_EMAIL, subject: `Check-in ${force ? `on ${weekday}` : "tomorrow"} at 8pm`, html }),
      });
      if (res.ok) sent++;
    } catch {
      /* one failed email never stops the rest */
    }
  }
  return { sent, skipped: "", date };
}
