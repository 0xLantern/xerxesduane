// What a partner's link fetches. No login: the copy id finds the ciphertext,
// and the key in the link's fragment (never sent here) decrypts it in their
// browser. ?c=<copyId> returns the encrypted copy and notes the first open;
// ?s=<sendId>&i=<imgId>&c=<copyId> returns an encrypted photo for a live copy.
import { K, errorResponse, handle, json, redis, underLimit } from "./_lib-read";

export const config = { runtime: "edge" };

const ID = /^[A-Za-z0-9_-]{8,40}$/;

export default handle(async (req) => {
  if (req.method !== "GET") return errorResponse("Method not allowed.", 405);
  if (!(await underLimit("letters-read", req, 120, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
  const u = new URL(req.url);
  const c = u.searchParams.get("c") ?? "";
  if (!ID.test(c)) return errorResponse("This letter has expired or the link isn't complete.", 404);
  const [raw] = await redis([["GET", `${K}copy:${c}`]]);
  if (typeof raw !== "string") return errorResponse("This letter has expired or was withdrawn.", 404);
  const copy = JSON.parse(raw) as { ct: string; sendId: string; expiresAt: number };

  const s = u.searchParams.get("s");
  const i = u.searchParams.get("i");
  if (s || i) {
    if (s !== copy.sendId || !i || !ID.test(i)) return errorResponse("No such photo.", 404);
    const [img] = await redis([["GET", `${K}eimg:${s}:${i}`]]);
    if (typeof img !== "string") return errorResponse("No such photo.", 404);
    return json({ ct: img });
  }

  await redis([
    ["HSETNX", `${K}opened:${copy.sendId}`, c, String(Date.now())],
    ["EXPIRE", `${K}opened:${copy.sendId}`, 40 * 24 * 3600],
  ]);
  return json({ ct: copy.ct, expiresAt: copy.expiresAt });
});
