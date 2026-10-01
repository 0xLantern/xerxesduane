// Everything the owner's screen needs, in one read.
import { allEntries, getSettings, getShareToken, getTimer, handle, json, requireOwner } from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);
  const denied = await requireOwner(req, false);
  if (denied) return denied;
  const [entries, timer, settings, shareToken] = await Promise.all([
    allEntries(),
    getTimer(),
    getSettings(),
    getShareToken(),
  ]);
  return json({ entries, timer, settings, shareToken, now: Date.now() });
});
