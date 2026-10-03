// The few pieces the public read endpoint needs, without the owner's code.
export { errorResponse, handle, isOwner, json, redis, underLimit } from "../work/_lib";
import { OWNER_EMAIL, redis } from "../work/_lib";
export const K = "letters:v1:";

/** How many devices may open one partner's copy: a phone and a laptop, say. */
export const MAX_DEVICES = 2;

/** One copy's devices and the countries it has been opened from. */
export type Seen = { devices: { h: string; at: number; country: string }[]; countries: string[] };

/** A device id as the reader sends it, hashed so the stored value can't be replayed. */
export async function deviceHash(d: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`letter-device|${d}`)));
  let s = "";
  for (const b of bytes.subarray(0, 16)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const DEVICE_ID = /^[A-Za-z0-9_-]{16,64}$/;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** The partner a copy belongs to, by name. */
async function partnerName(letterId: string, copyId: string): Promise<string> {
  const [pid] = await redis([["HGET", `${K}copies:${letterId}`, copyId]]);
  if (typeof pid !== "string") return "A partner";
  const [raw] = await redis([["HGET", `${K}partners`, pid]]);
  try {
    return typeof raw === "string" ? String((JSON.parse(raw) as { name?: string }).name ?? "A partner") : "A partner";
  } catch {
    return "A partner";
  }
}

/** Email the owner about a copy, at most once per `key` per `hours`. Best effort. */
export async function alertOwner(key: string, hours: number, letterId: string, copyId: string, title: string, what: (name: string) => string) {
  const api = process.env.RESEND_API_KEY;
  if (!api) return;
  const [first] = await redis([["SET", `${K}alerted:${key}`, "1", "NX", "EX", hours * 3600]]);
  if (first !== "OK") return;
  const name = await partnerName(letterId, copyId);
  const from = process.env.LETTERS_FROM || "Partner letters <letters@xerxesduane.com>";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${api}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [OWNER_EMAIL],
      subject: `${name}'s letter: ${what(name).replace(/<[^>]+>/g, "").slice(0, 80)}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#2b2420;">
<p>${what(esc(name))}</p><p>Letter: <em>${esc(title)}</em></p>
<p>If it was them on a new phone, open the letter on the desk and tap <strong>Let a new device in</strong> next to their name. If it wasn't, withdraw their copy.</p>
<p style="color:#8a7f75;font-size:13px;">ministry.xerxesduane.com/letters</p></div>`,
    }),
  }).catch(() => undefined);
}

/** Two-letter country code to a name, for the alert. */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
