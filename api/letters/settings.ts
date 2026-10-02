// Sender name, reply-to, the WhatsApp message, and whether partners may
// download the PDF by default.
import { DEFAULT_WA_TEMPLATE, errorResponse, getSettings, handle, isEmail, json, readJson, requireOwner, saveSettings, type Settings } from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;
  if (req.method === "GET") return json({ settings: await getSettings(), defaults: { waTemplate: DEFAULT_WA_TEMPLATE } });
  if (req.method !== "PATCH") return errorResponse("Method not allowed.", 405);
  const b = await readJson(req);
  const cur = await getSettings();
  const replyTo = String(b.replyTo ?? cur.replyTo).trim().toLowerCase();
  if (replyTo && !isEmail(replyTo)) return errorResponse("The reply-to has to be an email address.");
  const waTemplate = String(b.waTemplate ?? cur.waTemplate).replace(/\r/g, "").trim().slice(0, 1000) || DEFAULT_WA_TEMPLATE;
  if (!/\{\{\s*link\s*\}\}/i.test(waTemplate)) return errorResponse("The WhatsApp message needs {{link}} in it, or partners can't open the letter.");
  const next: Settings = {
    sender: String(b.sender ?? cur.sender).replace(/\s+/g, " ").trim().slice(0, 80) || cur.sender,
    replyTo,
    waTemplate,
    allowDownload: typeof b.allowDownload === "boolean" ? b.allowDownload : cur.allowDownload,
  };
  await saveSettings(next);
  return json({ settings: next, defaults: { waTemplate: DEFAULT_WA_TEMPLATE } });
});
