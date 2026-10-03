// A full copy of everything the hours log and the letters desk keep, for the
// owner's own backups: the "Download all data" button and the weekly email.
//
// The letters' partner list lives in the same Redis under its own prefix
// (api/letters/_lib.ts) and is the other thing that would hurt to lose, so it
// comes along. Letters themselves are ciphertext that expires, so they don't.
import { allEntries, allPayments, allSummaries, getSettings, redis, trashList, type Entry } from "./_lib";

const OFFSET = 4 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD and HH:MM in Dubai. */
function stamp(ms: number): { date: string; time: string } {
  const d = new Date(ms + OFFSET);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

export async function buildExport() {
  const [entries, settings, payments, summaries, trash, lettersSettings, partnersFlat, prayerFlat] = await Promise.all([
    allEntries(),
    getSettings(),
    allPayments(),
    allSummaries(),
    trashList(),
    redis([["GET", "letters:v1:settings"]]).then((r) => r[0]),
    redis([["HGETALL", "letters:v1:partners"]]).then((r) => r[0]),
    redis([["HGETALL", "letters:v1:prayer"]]).then((r) => r[0]),
  ]);
  const values = (flat: unknown) => {
    const list = Array.isArray(flat) ? (flat as string[]) : [];
    const out: unknown[] = [];
    for (let i = 1; i < list.length; i += 2) {
      try {
        out.push(JSON.parse(list[i]));
      } catch {
        /* skip a broken record */
      }
    }
    return out;
  };
  const ls = ((): unknown => {
    try {
      return typeof lettersSettings === "string" ? JSON.parse(lettersSettings) : null;
    } catch {
      return null;
    }
  })();
  return {
    exportedAt: new Date().toISOString(),
    format: "xerxesduane-work-export",
    version: 1,
    timezone: "Asia/Dubai (UTC+4); start and end are epoch milliseconds",
    settings,
    entries,
    payments,
    summaries,
    trash,
    letters: { settings: ls, partners: values(partnersFlat), prayer: values(prayerFlat) },
  };
}

function cell(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The hours as a spreadsheet: one row per entry, oldest first. */
export function entriesCsv(entries: Entry[], rate: number, currency: string): string {
  const rows = [["Date", "Start", "End", "Hours", `Amount (${currency})`, "Task", "Notes", "Link", "Id"]];
  for (const e of [...entries].sort((a, b) => a.start - b.start)) {
    const hours = Math.round(((e.end - e.start) / 3600e3) * 100) / 100;
    const s = stamp(e.start);
    rows.push([s.date, s.time, stamp(e.end).time, hours.toFixed(2), (Math.round(hours * rate * 100) / 100).toFixed(2), e.task, e.notes, e.link, e.id]);
  }
  // A BOM, so Excel opens the accents right.
  return `\uFEFF${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}

/** Today's date in Dubai, for file names. */
export function today(): string {
  return stamp(Date.now()).date;
}
