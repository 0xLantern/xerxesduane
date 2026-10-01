// Sign in and out of the hours log, and ask whether this browser is signed in.
import {
  OWNER_EMAIL,
  checkLogin,
  clearedCookie,
  configured,
  errorResponse,
  handle,
  isOwner,
  json,
  readJson,
  sameOrigin,
  sessionCookie,
  underLimit,
} from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method === "GET") {
    return json({ authed: await isOwner(req), configured: configured() });
  }

  if (!sameOrigin(req)) return errorResponse("Blocked: that request did not come from this page.", 403);

  if (req.method === "DELETE") {
    return json({ authed: false }, 200, { "set-cookie": clearedCookie() });
  }

  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  if (!configured()) {
    return errorResponse("The hours log isn't switched on yet: set WORK_PASSWORD (8+ characters) in Vercel.", 503);
  }
  // Ten tries per fifteen minutes per address: plenty for a typo, useless for guessing.
  if (!(await underLimit("login", req, 10, 15 * 60))) {
    return errorResponse("Too many tries. Wait fifteen minutes and try again.", 429);
  }

  const body = await readJson(req);
  const ok = await checkLogin(String(body.email ?? ""), String(body.password ?? ""));
  if (!ok) return errorResponse("That email and password don't match.", 401);
  return json({ authed: true, email: OWNER_EMAIL }, 200, { "set-cookie": await sessionCookie() });
});
