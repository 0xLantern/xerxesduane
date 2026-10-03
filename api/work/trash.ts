// Deleted entries, kept 90 days (see deleteEntry in _lib.ts).
//   GET                                the trash
//   POST { id, action: "restore" }     put an entry back in the log
//   POST { id, action: "purge" }       delete it for good
import { errorResponse, handle, json, purgeTrashed, readJson, requireOwner, restoreEntry, trashList } from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;
  if (req.method === "GET") return json({ trash: await trashList() });
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const body = await readJson(req);
  const id = String(body.id ?? "");
  if (!/^\d{4}-\d{2}\.[A-Za-z0-9_-]{8,32}$/.test(id)) return errorResponse("That entry isn't in the trash.", 404);
  if (body.action === "restore") {
    const entry = await restoreEntry(id);
    if (!entry) return errorResponse("That entry isn't in the trash any more.", 404);
    return json({ entry, trash: await trashList() });
  }
  if (body.action === "purge") {
    await purgeTrashed(id);
    return json({ trash: await trashList() });
  }
  return errorResponse("Unknown action.");
});
