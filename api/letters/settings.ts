// Sender name, the monthly send day, the default giving link, reply-to.
import { errorResponse, getSettings, handle, json, readJson, requireOwner, saveSettings } from "./_lib";
import { safeUrl } from "../../src/letters/shared";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;
  if (req.method === "GET") return json({ settings: await getSettings() });
  if (req.method !== "PATCH") return errorResponse("Method not allowed.", 405);
  const b = await readJson(req);
  const cur = await getSettings();
  const sendDay = Math.round(Number(b.sendDay ?? cur.sendDay));
  if (!(sendDay >= 1 && sendDay <= 28)) return errorResponse("The send day has to be between 1 and 28, so every month has it.");
  const givingUrl = String(b.givingUrl ?? cur.givingUrl).trim();
  if (givingUrl && !safeUrl(givingUrl)) return errorResponse("The giving link has to be a web address.");
  const replyTo = String(b.replyTo ?? cur.replyTo).trim();
  if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) return errorResponse("The reply-to has to be an email address.");
  const next = {
    sender: String(b.sender ?? cur.sender).trim().slice(0, 80) || cur.sender,
    sendDay,
    givingUrl: givingUrl ? safeUrl(givingUrl)! : "",
    givingLabel: String(b.givingLabel ?? cur.givingLabel).trim().slice(0, 40) || "Support the work",
    replyTo,
  };
  await saveSettings(next);
  return json({ settings: next });
});
