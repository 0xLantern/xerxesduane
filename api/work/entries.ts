// Add, change and remove logged time.
import {
  cleanEntry,
  deleteEntry,
  errorResponse,
  findEntry,
  getClients,
  handle,
  json,
  newId,
  readJson,
  requireOwner,
  saveEntry,
} from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const body = await readJson(req);
  const clients = await getClients();

  if (req.method === "POST") {
    const clean = cleanEntry(body, clients);
    if (typeof clean === "string") return errorResponse(clean);
    return json({ entry: await saveEntry({ id: newId(clean.start, body.key), ...clean }) }, 201);
  }

  const id = String(body.id ?? "");
  const existing = id ? await findEntry(id) : null;
  if (!existing) return errorResponse("That entry no longer exists. Refresh the page.", 404);

  if (req.method === "PATCH") {
    const clean = cleanEntry({ client: existing.client, ...body }, clients);
    if (typeof clean === "string") return errorResponse(clean);
    return json({ entry: await saveEntry({ id: existing.id, ...clean }, existing) });
  }

  if (req.method === "DELETE") {
    // Into the trash (restorable for 90 days), not gone.
    await deleteEntry(existing);
    return json({ deleted: existing.id });
  }

  return errorResponse("Method not allowed.", 405);
});
