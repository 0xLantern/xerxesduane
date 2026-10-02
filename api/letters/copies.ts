// Partners' copies of a live letter, made in the owner's browser:
// POST {id, copies: [{copyId, partnerId, wrapped}]}, up to 50 at a time.
//
// `wrapped` is the partner's Wrapped record (src/letters/shared.ts) encrypted
// under their link key, which never comes here. Each copy id is claimed with
// SET NX, so one can't be overwritten; resending the very same copy (a retry
// after a lost response) counts as made. A partner has one copy per letter:
// withdraw it to make another.
import { K, allPartners, copiesOf, errorResponse, getLetter, handle, json, readJson, redis, requireOwner, ttl } from "./_lib";
import { COPY_ID } from "../../src/letters/shared";

export const config = { runtime: "edge" };

const MAX = 50;
const WRAPPED = /^[A-Za-z0-9_-]{60,4000}$/;

export default handle(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const b = await readJson(req);
  const letter = await getLetter(b.id);
  if (!letter) return errorResponse("That letter has expired or was removed.", 404);
  if (letter.status !== "live") return errorResponse(letter.status === "withdrawn" ? "This letter was withdrawn." : "This letter's file isn't complete.", 409);

  const list = Array.isArray(b.copies) ? (b.copies as Record<string, unknown>[]) : [];
  if (!list.length || list.length > MAX) return errorResponse(`Send between 1 and ${MAX} copies at a time.`);
  const partners = new Set((await allPartners()).map((p) => p.id));
  const existing = await copiesOf(letter.id);
  const hasCopy = new Map([...existing].map(([c, p]) => [p, c]));
  const seen = new Set<string>();
  const items: { copyId: string; partnerId: string; record: string }[] = [];
  for (const c of list) {
    const copyId = String(c?.copyId ?? "");
    const partnerId = String(c?.partnerId ?? "");
    const wrapped = String(c?.wrapped ?? "");
    if (!COPY_ID.test(copyId) || !WRAPPED.test(wrapped)) return errorResponse("A copy isn't in the right shape.");
    if (!partners.has(partnerId)) return errorResponse("A copy is for a partner who isn't on the list.");
    if (seen.has(copyId) || seen.has(`p:${partnerId}`)) return errorResponse("The same copy or partner appears twice.");
    seen.add(copyId).add(`p:${partnerId}`);
    items.push({ copyId, partnerId, record: JSON.stringify({ letterId: letter.id, wrapped }) });
  }

  const created: string[] = [];
  const failed: { copyId: string; error: string }[] = [];
  const todo = items.filter((it) => {
    const other = hasCopy.get(it.partnerId);
    if (other && other !== it.copyId) {
      failed.push({ copyId: it.copyId, error: "already has a copy" });
      return false;
    }
    return true;
  });
  const life = ttl(letter);
  const claimed = todo.length ? await redis(todo.map((it) => ["SET", `${K}copy:${it.copyId}`, it.record, "NX", "EX", life])) : [];
  const recheck = todo.filter((_, i) => claimed[i] !== "OK");
  const current = recheck.length ? await redis(recheck.map((it) => ["GET", `${K}copy:${it.copyId}`])) : [];
  const ok = todo.filter((it, i) => {
    if (claimed[i] === "OK") return true;
    // The same record byte for byte is this same upload arriving again: the
    // wrapped part is ciphertext under a fresh IV, which nothing else matches.
    const same = current[recheck.indexOf(it)] === it.record;
    if (!same) failed.push({ copyId: it.copyId, error: "copy id taken" });
    return same;
  });
  if (ok.length) {
    await redis([
      ["HSET", `${K}copies:${letter.id}`, ...ok.flatMap((it) => [it.copyId, it.partnerId])],
      ["EXPIRE", `${K}copies:${letter.id}`, life],
    ]);
    created.push(...ok.map((it) => it.copyId));
  }
  return json({ created, failed });
});
