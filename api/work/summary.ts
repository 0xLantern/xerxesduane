// The month's note for a client: three short lines at the top of their
// page. What was delivered, what's next, and what needs their decision.
//   PATCH { client, month: YYYY-MM, delivered, next, decide }   save (all empty clears it)
import { SUMMARY_LIMIT, allSummaries, errorResponse, getClient, handle, json, readJson, requireOwner, setSummary } from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "PATCH") return errorResponse("Method not allowed.", 405);
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const body = await readJson(req);
  const client = await getClient(body.client);
  if (!client) return errorResponse("That client isn't on the list any more.", 404);
  const month = String(body.month ?? "");
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) return errorResponse("Pick a month.");
  const line = (v: unknown) => String(v ?? "").replace(/\r/g, "").trim().slice(0, SUMMARY_LIMIT);
  const s = { delivered: line(body.delivered), next: line(body.next), decide: line(body.decide), updatedAt: Date.now() };
  await setSummary(client.id, month, s.delivered || s.next || s.decide ? s : null);
  return json({ client: client.id, summaries: await allSummaries(client.id) });
});
