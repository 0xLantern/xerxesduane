// The client password at work.xerxesduane.com/gcn. A right password sets a
// cookie that lets this browser in for a year (see clientCookie in _lib.ts).
import { checkClientPassword, clientCookie, clientPasswordSet, errorResponse, handle, json, readJson, sameOrigin, underLimit } from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  if (!sameOrigin(req)) return errorResponse("Blocked: that request did not come from this page.", 403);
  if (!clientPasswordSet()) return errorResponse("This page isn't open yet. Please ask Xerxes for access.", 503);
  // Ten tries per fifteen minutes per address: plenty for a typo, useless for guessing.
  if (!(await underLimit("client-login", req, 10, 15 * 60))) {
    return errorResponse("Too many tries. Please wait fifteen minutes and try again.", 429);
  }
  const body = await readJson(req);
  if (!(await checkClientPassword(String(body.password ?? "")))) {
    return errorResponse("That password isn't right. Please try again.", 401);
  }
  return json({ ok: true }, 200, { "set-cookie": await clientCookie() });
});
