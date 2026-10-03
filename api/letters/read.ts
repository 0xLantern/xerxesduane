// What a partner's link fetches. No login: the copy id finds the copy, and
// the key in the link's fragment (which browsers never send) opens it in the
// partner's browser.
//   ?c=<copyId>&d=<device>          the wrapped copy, and the file's size and
//                                   piece count; notes the first open, unless
//                                   &peek=1 from the signed-in owner
//   ?c=<copyId>&d=<device>&f=<letterId>&n=<n>
//                                   piece n of the encrypted PDF, as bytes
// A withdrawn copy is deleted and an expired one is gone, so both are a 404.
//
// Device lock. Each reader browser keeps a random device id and sends it.
// A copy opens on at most MAX_DEVICES devices: the first ones to open it.
// Any other device gets a 403 and the owner an email, so a forwarded link
// doesn't open and the owner hears that it was tried. The owner can let a
// new device in from the desk (it clears the list). The owner's own browser,
// signed in, is never counted. The owner also hears when a copy is first
// opened from a country it hadn't been opened from before.
import { DEVICE_ID, K, MAX_DEVICES, alertOwner, countryName, deviceHash, errorResponse, handle, isOwner, json, redis, underLimit, type Seen } from "./_lib-read";
import type { Letter } from "./_lib";
import { COPY_ID, LETTER_ID, fromB64url } from "../../src/letters/shared";

export const config = { runtime: "edge" };

const GONE = "This letter has expired or was withdrawn.";
const LOCKED = "This letter is already open on other devices, so it can't be opened here.";

type Copy = { letterId: string; wrapped: string };

function parse<T>(raw: unknown): T | null {
  try {
    return typeof raw === "string" ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export default handle(async (req) => {
  if (req.method !== "GET") return errorResponse("Method not allowed.", 405);
  const u = new URL(req.url);
  const c = u.searchParams.get("c") ?? "";
  const f = u.searchParams.get("f");

  if (f !== null) {
    // A 25 MB letter is 50 pieces; a few readers behind one address read several.
    if (!(await underLimit("letters-file", req, 600, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
    const n = Number(u.searchParams.get("n"));
    if (!COPY_ID.test(c) || !LETTER_ID.test(f) || !Number.isInteger(n) || n < 0 || n > 9999) return errorResponse(GONE, 404);
    const d = u.searchParams.get("d") ?? "";
    const [rawCopy, piece, rawSeen] = await redis([
      ["GET", `${K}copy:${c}`],
      ["GET", `${K}file:${f}:${n}`],
      ["HGET", `${K}devices:${f}`, c],
    ]);
    const copy = parse<Copy>(rawCopy);
    if (!copy || copy.letterId !== f || typeof piece !== "string") return errorResponse(GONE, 404);
    // Only a device let in when the copy was opened may fetch its pieces.
    const seen = parse<Seen>(rawSeen);
    if (!(await isOwner(req))) {
      const h = DEVICE_ID.test(d) ? await deviceHash(d) : "";
      if (!h || !seen?.devices.some((x) => x.h === h)) return json({ error: LOCKED, locked: true }, 403);
    }
    return new Response(fromB64url(piece), { headers: { "content-type": "application/octet-stream", "cache-control": "no-store" } });
  }

  if (!(await underLimit("letters-open", req, 60, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
  if (!COPY_ID.test(c)) return errorResponse(GONE, 404);
  const copy = parse<Copy>((await redis([["GET", `${K}copy:${c}`]]))[0]);
  if (!copy || !LETTER_ID.test(copy.letterId)) return errorResponse(GONE, 404);
  const letter = parse<Letter>((await redis([["GET", `${K}letter:${copy.letterId}`]]))[0]);
  if (!letter || letter.status !== "live" || letter.expiresAt <= Date.now()) return errorResponse(GONE, 404);

  const owner = await isOwner(req);
  // The owner checking a link from the desk's browser: not an open, not a device.
  const peek = u.searchParams.get("peek") === "1" && owner;

  if (!owner) {
    const d = u.searchParams.get("d") ?? "";
    if (!DEVICE_ID.test(d)) return json({ error: LOCKED, locked: true }, 403);
    const h = await deviceHash(d);
    const country = (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase().slice(0, 2);
    const seen: Seen = parse<Seen>((await redis([["HGET", `${K}devices:${letter.id}`, c]]))[0]) ?? { devices: [], countries: [] };
    const life = Math.max(1, Math.ceil((letter.expiresAt - Date.now()) / 1000));
    const known = seen.devices.find((x) => x.h === h);
    let changed = !known;
    if (!known) {
      if (seen.devices.length >= MAX_DEVICES) {
        await redis([["HINCRBY", `${K}blocked:${letter.id}`, c, 1], ["EXPIRE", `${K}blocked:${letter.id}`, life]]);
        await alertOwner(`blocked:${c}`, 6, letter.id, c, letter.title, (name) =>
          `<strong>${name}</strong>'s link was tried on another device${country ? ` in ${countryName(country)}` : ""}, after it was already open on ${MAX_DEVICES}. It didn't open.`,
        );
        return json({ error: LOCKED, locked: true, devices: MAX_DEVICES }, 403);
      }
      seen.devices.push({ h, at: Date.now(), country });
    }
    if (country && !seen.countries.includes(country)) {
      const before = seen.countries.map(countryName);
      if (before.length) {
        await alertOwner(`country:${c}:${country}`, 24 * 40, letter.id, c, letter.title, (name) =>
          `<strong>${name}</strong>'s letter was opened from <strong>${countryName(country)}</strong> for the first time (before: ${before.join(", ")}).`,
        );
      }
      seen.countries.push(country);
      changed = true;
    }
    if (changed) {
      await redis([["HSET", `${K}devices:${letter.id}`, c, JSON.stringify(seen)], ["EXPIRE", `${K}devices:${letter.id}`, life]]);
    }
  }

  const [reacted, prayerToken, requests] = await redis([
    // Whether this partner already said they're praying, and the prayer
    // team's page if there is one (its link is for partners anyway) and it
    // has something on it.
    ["HEXISTS", `${K}react:${letter.id}`, c],
    ["GET", `${K}prayer-token`],
    ["HLEN", `${K}prayer`],
    ...(peek
      ? []
      : [
          ["HSETNX", `${K}opened:${letter.id}`, c, String(Date.now())],
          ["EXPIRE", `${K}opened:${letter.id}`, Math.max(1, Math.ceil((letter.expiresAt - Date.now()) / 1000))],
        ]),
  ]);
  return json({
    letterId: letter.id,
    wrapped: copy.wrapped,
    size: letter.size,
    chunks: letter.chunks,
    expiresAt: letter.expiresAt,
    praying: Number(reacted) === 1,
    prayer: typeof prayerToken === "string" && prayerToken.length >= 16 && Number(requests) > 0 ? `/pray/${prayerToken}` : null,
  });
});
