// Published letters, for the desk. Owner only.
//   GET                        every letter that hasn't expired, with counts
//   GET ?id=                   one letter, and each copy: who, opened, emailed
//   POST {title, size, chunks, allowDownload}
//                              start publishing: the browser then uploads the
//                              encrypted PDF to /chunk and calls PATCH
//   PATCH {id, done: true}     every piece is here: the letter goes live
//   DELETE {id, copyId}        withdraw one partner's copy
//   DELETE {id}                withdraw it from everyone (copies and file)
//   DELETE {id, remove: true}  forget it altogether (an unfinished upload, or
//                              a withdrawn letter the desk shouldn't list)
import {
  K,
  allLetters,
  allPartners,
  copiesOf,
  errorResponse,
  getLetter,
  handle,
  json,
  newLetter,
  pairs,
  readJson,
  redis,
  removeLetter,
  requireOwner,
  saveLetter,
  withdrawAll,
} from "./_lib";
import { COPY_ID, MAX_PDF_BYTES, SEAL_OVERHEAD, chunkCount } from "../../src/letters/shared";

export const config = { runtime: "edge" };

const GONE = "That letter has expired or was removed.";

export default handle(async (req) => {
  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;
  const url = new URL(req.url);

  if (req.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return json({ letters: await allLetters() });
    const letter = await getLetter(id);
    if (!letter) return errorResponse(GONE, 404);
    const [copies, opened, mailed, reacted] = await redis([
      ["HGETALL", `${K}copies:${id}`],
      ["HGETALL", `${K}opened:${id}`],
      ["HGETALL", `${K}mailed:${id}`],
      ["HGETALL", `${K}react:${id}`],
    ]).then((r) => r.map(pairs));
    const reaction = (copyId: string): { at: number; note: string } | null => {
      const raw = reacted.get(copyId);
      if (!raw) return null;
      try {
        const r = JSON.parse(raw) as { at?: number; note?: string };
        return { at: Number(r.at) || 0, note: String(r.note ?? "") };
      } catch {
        return null;
      }
    };
    const names = new Map((await allPartners()).map((p) => [p.id, p.name]));
    const rows = [...copies].map(([copyId, partnerId]) => ({
      copyId,
      partnerId,
      name: names.get(partnerId) ?? "(removed partner)",
      opened: opened.has(copyId) ? Number(opened.get(copyId)) : null,
      mailed: mailed.has(copyId) ? Number(mailed.get(copyId)) : null,
      praying: reaction(copyId),
    }));
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return json({ letter, copies: rows });
  }

  const body = await readJson(req);

  if (req.method === "POST") {
    const title = String(body.title ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
    const size = Number(body.size);
    const chunks = Number(body.chunks);
    if (!title) return errorResponse("Give the letter a title.");
    if (!Number.isInteger(size) || size <= SEAL_OVERHEAD) return errorResponse("That file is empty.");
    if (size > MAX_PDF_BYTES + SEAL_OVERHEAD) return errorResponse("That PDF is larger than 25 MB.");
    if (chunks !== chunkCount(size)) return errorResponse("The upload doesn't add up. Reload the page and try again.");
    const letter = newLetter(title, size, chunks, body.allowDownload === true);
    await saveLetter(letter);
    return json({ letter });
  }

  const letter = await getLetter(body.id);
  if (!letter) return errorResponse(GONE, 404);

  if (req.method === "PATCH") {
    if (body.done !== true) return errorResponse("Nothing to change.");
    if (letter.status === "live") return json({ letter });
    if (letter.status !== "uploading") return errorResponse("This letter was withdrawn.", 409);
    const keys = Array.from({ length: letter.chunks }, (_, n) => `${K}file:${letter.id}:${n}`);
    const [have] = await redis([["EXISTS", ...keys]]);
    if (Number(have) !== letter.chunks) return errorResponse("Part of the file didn't arrive. Try publishing again.", 409);
    const live = { ...letter, status: "live" as const };
    await saveLetter(live);
    return json({ letter: live });
  }

  if (req.method === "DELETE") {
    if (body.copyId !== undefined) {
      const copyId = String(body.copyId);
      if (!COPY_ID.test(copyId) || !(await copiesOf(letter.id)).has(copyId)) return errorResponse("That copy isn't part of this letter.", 404);
      await redis([
        ["DEL", `${K}copy:${copyId}`],
        ["HDEL", `${K}copies:${letter.id}`, copyId],
        ["HDEL", `${K}opened:${letter.id}`, copyId],
        ["HDEL", `${K}mailed:${letter.id}`, copyId],
        ["HDEL", `${K}react:${letter.id}`, copyId],
      ]);
      return json({ withdrawn: copyId });
    }
    if (body.remove === true) {
      await removeLetter(letter);
      return json({ removed: true });
    }
    return json({ withdrawn: await withdrawAll(letter) });
  }

  return errorResponse("Method not allowed.", 405);
});
