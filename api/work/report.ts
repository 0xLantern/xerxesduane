// The client's read-only view, behind the token in their private link.
//
// No cookie and no login: the 128-bit token is the credential, which is what
// lets the client open it from an email on any device. A wrong token is a 404
// rather than a 401, so the endpoint says nothing about whether a log exists.
import {
  OWNER_EMAIL,
  allEntries,
  errorResponse,
  getSettings,
  getTimer,
  handle,
  json,
  tokenOk,
  underLimit,
} from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "GET") return errorResponse("Method not allowed.", 405);
  if (!(await underLimit("report", req, 60, 60))) {
    return errorResponse("Too many requests. Wait a minute and refresh.", 429);
  }
  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!(await tokenOk(token))) {
    return errorResponse("This link isn't valid any more. Ask for a new one.", 404);
  }
  const [entries, settings, timer] = await Promise.all([allEntries(), getSettings(), getTimer()]);
  return json({
    entries,
    settings,
    email: OWNER_EMAIL,
    // Only the fact and the start, so the client can see work in progress.
    working: timer ? { start: timer.start } : null,
    now: Date.now(),
  });
});
