// What a partner's link fetches. No login: the copy id finds the copy, and
// the key in the link's fragment (which browsers never send) opens it in the
// partner's browser.
//   ?c=<copyId>                     the wrapped copy, and the file's size and
//                                   piece count; notes the first open, unless
//                                   &peek=1 (the owner checking a link on the
//                                   device they publish from)
//   ?c=<copyId>&f=<letterId>&n=<n>  piece n of the encrypted PDF, as bytes,
//                                   for as long as that copy exists
// A withdrawn copy is deleted and an expired one is gone, so both are a 404.
import { K, errorResponse, handle, json, redis, underLimit } from "./_lib-read";
import type { Letter } from "./_lib";
import { COPY_ID, LETTER_ID, fromB64url } from "../../src/letters/shared";

export const config = { runtime: "edge" };

const GONE = "This letter has expired or was withdrawn.";

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
    const [rawCopy, piece] = await redis([
      ["GET", `${K}copy:${c}`],
      ["GET", `${K}file:${f}:${n}`],
    ]);
    const copy = parse<Copy>(rawCopy);
    if (!copy || copy.letterId !== f || typeof piece !== "string") return errorResponse(GONE, 404);
    return new Response(fromB64url(piece), { headers: { "content-type": "application/octet-stream", "cache-control": "no-store" } });
  }

  if (!(await underLimit("letters-open", req, 60, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
  if (!COPY_ID.test(c)) return errorResponse(GONE, 404);
  const copy = parse<Copy>((await redis([["GET", `${K}copy:${c}`]]))[0]);
  if (!copy || !LETTER_ID.test(copy.letterId)) return errorResponse(GONE, 404);
  const letter = parse<Letter>((await redis([["GET", `${K}letter:${copy.letterId}`]]))[0]);
  if (!letter || letter.status !== "live" || letter.expiresAt <= Date.now()) return errorResponse(GONE, 404);

  const peek = u.searchParams.get("peek") === "1";
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
