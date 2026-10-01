/**
 * Dates and money for the hours log.
 *
 * Every entry is stored as epoch milliseconds and shown in Dubai time, where
 * the work is done. Asia/Dubai is UTC+4 all year with no daylight saving, so a
 * fixed offset is exact, and it keeps day and week boundaries independent of
 * whatever time zone the reader's phone is set to: the client in Europe sees
 * the same days the owner logged.
 */
export const TZ_LABEL = "Dubai time (UTC+4)";
const OFFSET = 4 * 60 * 60 * 1000;
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

const pad = (n: number) => String(n).padStart(2, "0");

/** The wall-clock parts of an instant, in Dubai. */
function parts(ms: number) {
  const d = new Date(ms + OFFSET);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    min: d.getUTCMinutes(),
    dow: d.getUTCDay(),
  };
}

/** The instant of a Dubai wall-clock time. Month is 0-based. */
export function fromLocal(y: number, m: number, d: number, h = 0, min = 0): number {
  return Date.UTC(y, m, d, h, min) - OFFSET;
}

export function dayKey(ms: number): string {
  const p = parts(ms);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
}

export function monthKey(ms: number): string {
  const p = parts(ms);
  return `${p.y}-${pad(p.m + 1)}`;
}

/** Midnight at the start of the Monday of this week, in Dubai. */
export function weekStart(ms: number): number {
  const p = parts(ms);
  const back = (p.dow + 6) % 7;
  return fromLocal(p.y, p.m, p.d - back);
}

export function monthStart(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return fromLocal(y, m - 1, 1);
}

export function shiftMonth(key: string, by: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function fmtMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function fmtDay(ms: number): string {
  const p = parts(ms);
  return `${DAYS[p.dow]} ${p.d} ${MONTHS[p.m].slice(0, 3)}`;
}

export function fmtTime(ms: number): string {
  const p = parts(ms);
  return `${pad(p.h)}:${pad(p.min)}`;
}

/** For <input type="date"> and <input type="time">. */
export function dateInput(ms: number): string {
  return dayKey(ms);
}
export function timeInput(ms: number): string {
  return fmtTime(ms);
}

/**
 * Turn the editor's date, start and end fields into instants. An end earlier
 * than the start means the work ran past midnight into the next day.
 */
export function rangeFromInputs(date: string, start: string, end: string): { start: number; end: number } | string {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const sm = /^(\d{2}):(\d{2})$/.exec(start);
  const em = /^(\d{2}):(\d{2})$/.exec(end);
  if (!dm) return "Pick a date.";
  if (!sm) return "Give a start time.";
  if (!em) return "Give an end time.";
  const [y, m, d] = [Number(dm[1]), Number(dm[2]) - 1, Number(dm[3])];
  const s = fromLocal(y, m, d, Number(sm[1]), Number(sm[2]));
  let e = fromLocal(y, m, d, Number(em[1]), Number(em[2]));
  if (e === s) return "The start and end are the same time.";
  if (e < s) e += DAY;
  return { start: s, end: e };
}

/** Total duration of the entries that start inside [from, to). */
export function totalsFor(entries: { start: number; end: number }[], from: number, to: number): number {
  return entries.filter((e) => e.start >= from && e.start < to).reduce((n, e) => n + (e.end - e.start), 0);
}

/** Hours with two decimals, the way they are billed: 3.50. */
export function fmtHours(ms: number): string {
  return (ms / HOUR).toFixed(2);
}

/** A running clock: 1:05:09. */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** The amount for a total duration, rounded to the cent once, at the end. */
export function fmtMoney(ms: number, rate: number, currency = "USD"): string {
  const amount = Math.round((ms / HOUR) * rate * 100) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
