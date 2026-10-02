// One piece of a letter's encrypted PDF, uploaded by the owner's browser:
// POST {id, n, data}. `data` is base64url of exactly CHUNK_BYTES bytes (the
// last piece: what's left), so a piece can't be short, long or misplaced.
// Pieces can only be (re)sent while the letter is still uploading.
import { K, errorResponse, getLetter, handle, json, readJson, redis, requireOwner, ttl } from "./_lib";
import { CHUNK_BYTES, b64urlLength } from "../../src/letters/shared";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const b = await readJson(req);
  const letter = await getLetter(b.id);
  if (!letter) return errorResponse("That letter has expired or was removed.", 404);
  if (letter.status !== "uploading") return errorResponse("This letter's file is already complete.", 409);
  const n = Number(b.n);
  if (!Number.isInteger(n) || n < 0 || n >= letter.chunks) return errorResponse("No such piece.");
  const bytes = n < letter.chunks - 1 ? CHUNK_BYTES : letter.size - CHUNK_BYTES * (letter.chunks - 1);
  const data = b.data;
  if (typeof data !== "string" || data.length !== b64urlLength(bytes) || !/^[A-Za-z0-9_-]+$/.test(data)) {
    return errorResponse("That piece isn't the right size.");
  }
  await redis([["SET", `${K}file:${letter.id}:${n}`, data, "EX", ttl(letter)]]);
  return json({ n });
});
