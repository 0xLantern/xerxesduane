// The owner's name, the clients (each with its rate, billing details and
// private link), and the old one-client fields the page still sends.
//
//   PATCH { name?, client?, rate? }            the owner's name; GCN's name and rate (kept for the old form)
//   POST  { rotate: true, client? }            a new private link for a client (the old one stops working)
//   POST  { add: {...client fields} }          a new client
//   PATCH { clientId, ...client fields }       change a client
import {
  LIMITS,
  cleanClient,
  errorResponse,
  getClient,
  getClients,
  getSettings,
  handle,
  json,
  readJson,
  requireOwner,
  rotateShareToken,
  saveClient,
  saveSettings,
  type Client,
} from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const body = await readJson(req);

  if (req.method === "POST" && body.rotate === true) {
    const client = await getClient(body.client);
    if (!client) return errorResponse("That client isn't on the list any more.", 404);
    // The old link stops working the moment this returns.
    return json({ client: client.id, shareToken: await rotateShareToken(client.id) });
  }

  if (req.method === "POST" && body.add && typeof body.add === "object") {
    const clean = cleanClient(body.add as Record<string, unknown>, null);
    if (typeof clean === "string") return errorResponse(clean);
    const clients = await getClients();
    if (clients.some((c) => c.short === clean.short)) return errorResponse(`The tag ${clean.short} is already used by another client. Pick another.`);
    const made: Client = { ...clean, id: `c${clean.id}` };
    await saveClient(made);
    return json({ client: made, clients: await getClients() });
  }

  if (req.method !== "PATCH") return errorResponse("Method not allowed.", 405);

  if (typeof body.clientId === "string") {
    const existing = await getClient(body.clientId);
    if (!existing) return errorResponse("That client isn't on the list any more.", 404);
    const clean = cleanClient(body, existing);
    if (typeof clean === "string") return errorResponse(clean);
    const clients = await getClients();
    if (clients.some((c) => c.id !== existing.id && c.short === clean.short)) return errorResponse(`The tag ${clean.short} is already used by another client. Pick another.`);
    await saveClient(clean);
    return json({ client: clean, clients: await getClients(), settings: await getSettings() });
  }

  // The owner's own details, and GCN's name and rate the way the first version of the form sent them.
  const current = await getSettings();
  const name = String(body.name ?? current.name).trim();
  const clientName = String(body.client ?? current.client).trim();
  const rate = Math.round(Number(body.rate ?? current.rate) * 100) / 100;
  if (!name || name.length > LIMITS.name) return errorResponse("Give your name, up to 80 characters.");
  if (!clientName || clientName.length > LIMITS.client) return errorResponse("Give the client's name, up to 80 characters.");
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1000) return errorResponse("The hourly rate has to be between 0 and 1,000.");
  const next = { ...current, name, client: clientName, rate };
  await saveSettings(next);
  if (body.client !== undefined || body.rate !== undefined) {
    const gcn = await getClient("gcn");
    if (gcn) await saveClient({ ...gcn, name: clientName, rate });
  }
  return json({ settings: next, clients: await getClients() });
});
