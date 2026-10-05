// Writes public/hack/hack2026-dubai.ics: every #HACK2026 Dubai gathering as
// one calendar file a guest can add in a tap.
//
// Run: node scripts/hack-ics.mjs  (also runs first in npm run build)
//
// It reads EVENTS straight from src/data/hack.ts, so the file can never
// disagree with the page. Node 24 strips the TypeScript types itself; the
// data file must stay free of imports and non-erasable TS syntax (enums,
// namespaces) for that to keep working.
//
// The file carries no address: "a home in Dubai" is all the page says, and
// the calendar says no more.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EVENTS, HACK } from "../src/data/hack.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", HACK.calendarFile);

/** 20261008T160000Z, the UTC form every calendar app accepts. */
const utc = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** RFC 5545 text escaping. */
const esc = (s) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** Lines longer than 75 octets are folded with CRLF + space, per RFC 5545. */
function fold(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never split a multi-byte character.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines lose one octet to the leading space
  }
  return parts.join("\r\n ");
}

// Fixed, so the file only changes when the schedule does.
const STAMP = "20261005T000000Z";

const lines = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//xerxesduane.com//HACK2026 Dubai//EN",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  `X-WR-CALNAME:${esc(HACK.title)}`,
  "X-WR-TIMEZONE:Asia/Dubai",
];

for (const e of EVENTS) {
  lines.push(
    "BEGIN:VEVENT",
    `UID:${e.id}@hack2026-dubai.xerxesduane.com`,
    `DTSTAMP:${STAMP}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(e.end)}`,
    `SUMMARY:${esc(`${HACK.title}: ${e.title}`)}`,
    `LOCATION:${esc(e.where)}`,
    `DESCRIPTION:${esc(`${e.mode === "online" ? "Online" : "In person"}. Details: ${HACK.url}`)}`,
    `URL:${HACK.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${HACK.title}: ${e.title} in one hour`)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
  );
}
lines.push("END:VCALENDAR");

await mkdir(dirname(out), { recursive: true });
await writeFile(out, lines.map(fold).join("\r\n") + "\r\n", "utf8");
console.log(`  hack calendar: ${EVENTS.length} events -> public${HACK.calendarFile}`);
