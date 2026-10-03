/**
 * What the desk keeps on this device only, in localStorage.
 *
 * A letter's file key and every partner's link (with its key) exist nowhere
 * else: the server holds only ciphertext. Keeping them here is what lets the
 * owner come back on the same device to finish sending on WhatsApp, or to
 * make a copy for a partner added later. They are deleted when the letter
 * expires or is withdrawn, or when the owner asks ("Forget links on this
 * device"); after that the letter can still be withdrawn and its opens seen,
 * but no new link can be made for it.
 *
 * The "Sent" ticks are kept separately, so forgetting the links keeps them.
 */
import { MINISTRY_ORIGIN } from "../lib/host";

export type LocalLink = { partnerId: string; link: string };

export type LocalLetter = {
  v: 1;
  letterId: string;
  fileKey: string;
  title: string;
  sender: string;
  expiresAt: number;
  allowDownload: boolean;
  /** Spotlight reading on computers (see Wrapped). Missing means on. */
  spotlight?: boolean;
  /** copy id -> that partner's link */
  links: Record<string, LocalLink>;
};

const KEYS = "letters-desk:keys:";
const SENT = "letters-desk:sent:";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function drop(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage blocked: nothing was kept either */
  }
}

export const local = {
  get(letterId: string): LocalLetter | null {
    const r = read<LocalLetter>(KEYS + letterId);
    return r && r.v === 1 && r.letterId === letterId && typeof r.fileKey === "string" ? r : null;
  },
  /** False when this browser won't store it (private mode, storage full). */
  save(rec: LocalLetter): boolean {
    return write(KEYS + rec.letterId, rec);
  },
  addLinks(letterId: string, links: Record<string, LocalLink>): boolean {
    const rec = local.get(letterId);
    return rec ? local.save({ ...rec, links: { ...rec.links, ...links } }) : false;
  },
  removeLink(letterId: string, copyId: string) {
    const rec = local.get(letterId);
    if (!rec) return;
    const links = { ...rec.links };
    delete links[copyId];
    local.save({ ...rec, links });
  },
  forget(letterId: string) {
    drop(KEYS + letterId);
  },
  sent(letterId: string): Record<string, number> {
    return read<Record<string, number>>(SENT + letterId) ?? {};
  },
  setSent(letterId: string, copyId: string, on: boolean): Record<string, number> {
    const s = { ...local.sent(letterId) };
    if (on) s[copyId] = Date.now();
    else delete s[copyId];
    write(SENT + letterId, s);
    return s;
  },
  /** Drop everything kept for letters that are gone (expired or removed), and keys of withdrawn ones. */
  prune(letters: { id: string; status: string; expiresAt: number }[]) {
    const byId = new Map(letters.map((l) => [l.id, l]));
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i) ?? "");
      for (const k of keys) {
        const prefix = k.startsWith(KEYS) ? KEYS : k.startsWith(SENT) ? SENT : null;
        if (!prefix) continue;
        const l = byId.get(k.slice(prefix.length));
        if (!l || l.expiresAt <= Date.now() || (prefix === KEYS && l.status === "withdrawn")) drop(k);
      }
    } catch {
      /* storage blocked */
    }
  },
};

/**
 * A backup of a letter's links as a file, so losing this browser's storage
 * (or changing device) doesn't mean losing the way to send them. It holds
 * every partner's key: whoever has the file can read the letter, so it
 * belongs somewhere private, and it's useless once the letter expires.
 */
export function saveBackup(rec: LocalLetter) {
  const blob = new Blob([JSON.stringify({ kind: "partner-letter-links", ...rec }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${rec.title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "Letter"} - links (private).json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Read a backup file back for this letter, or say why it can't be used. */
export function readBackup(text: string, letterId: string): LocalLetter | string {
  let r: Partial<LocalLetter> & { kind?: string };
  try {
    r = JSON.parse(text) as typeof r;
  } catch {
    return "That isn't a links backup file.";
  }
  if (r.kind !== "partner-letter-links" || r.v !== 1 || typeof r.fileKey !== "string" || !r.links || typeof r.links !== "object") return "That isn't a links backup file.";
  if (r.letterId !== letterId) return `That backup is for another letter${r.title ? ` (“${r.title}”)` : ""}.`;
  return { v: 1, letterId, fileKey: r.fileKey, title: String(r.title ?? ""), sender: String(r.sender ?? ""), expiresAt: Number(r.expiresAt) || 0, allowDownload: r.allowDownload === true, spotlight: r.spotlight !== false, links: r.links };
}

/** A partner's link. Always the ministry host: the server checks it, and it's what partners should see. */
export function linkFor(copyId: string, linkKey: string): string {
  return `${MINISTRY_ORIGIN}/l/${copyId}#${linkKey}`;
}

/** A date as partners read it, in Dubai time like the emails: "1 November 2026". */
export { fmtDate } from "./shared";

export const fmtShort = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dubai" });
export const fmtTime = (ms: number) => new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });
export const fmtSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export const PLACEHOLDERS = ["hello", "name", "title", "link", "expires"] as const;

/** Fill the WhatsApp template: {{hello}} {{name}} {{title}} {{link}} {{expires}}. */
export function fillTemplate(t: string, v: Record<(typeof PLACEHOLDERS)[number], string>): string {
  return t.replace(/\{\{\s*(hello|name|title|link|expires)\s*\}\}/gi, (_m, k: string) => v[k.toLowerCase() as keyof typeof v]);
}

export function waUrl(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export function statusOf(l: { status: string }): { label: string; tone: "good" | "off" | "warn" } {
  if (l.status === "live") return { label: "Live", tone: "good" };
  if (l.status === "withdrawn") return { label: "Withdrawn", tone: "off" };
  return { label: "Not finished", tone: "warn" };
}
