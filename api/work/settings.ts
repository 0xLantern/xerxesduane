// Name, client and rate, and the client's private link.
import {
  LIMITS,
  errorResponse,
  getSettings,
  handle,
  json,
  readJson,
  requireOwner,
  rotateShareToken,
  saveSettings,
} from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const body = await readJson(req);

  if (req.method === "POST" && body.rotate === true) {
    // The old link stops working the moment this returns.
    return json({ shareToken: await rotateShareToken() });
  }

  if (req.method !== "PATCH") return errorResponse("Method not allowed.", 405);
  const current = await getSettings();
  const name = String(body.name ?? current.name).trim();
  const client = String(body.client ?? current.client).trim();
  const rate = Math.round(Number(body.rate ?? current.rate) * 100) / 100;
  if (!name || name.length > LIMITS.name) return errorResponse("Give your name, up to 80 characters.");
  if (!client || client.length > LIMITS.client) return errorResponse("Give the client's name, up to 80 characters.");
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1000) return errorResponse("The hourly rate has to be between 0 and 1,000.");
  const next = { ...current, name, client, rate };
  await saveSettings(next);
  return json({ settings: next });
});
