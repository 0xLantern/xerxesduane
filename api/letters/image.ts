// A letter's photos, while it is a draft. POST {issue, data} stores a JPEG
// (the editor resizes it first); GET ?issue=&img= returns it for the editor.
// What partners see is the encrypted copy made at send time (see read.ts).
import { K, errorResponse, getIssue, handle, json, randomToken, readJson, redis, requireOwner } from "./_lib";

export const config = { runtime: "edge" };

const MAX_B64 = 900_000; // ~650 KB of JPEG

export default handle(async (req) => {
  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;
  if (req.method === "GET") {
    const u = new URL(req.url);
    const [b64] = await redis([["GET", `${K}img:${u.searchParams.get("issue")}:${u.searchParams.get("img")}`]]);
    if (typeof b64 !== "string") return errorResponse("No such photo.", 404);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new Response(bytes, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=3600" } });
  }
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const b = await readJson(req);
  const issue = await getIssue(String(b.issue ?? ""));
  if (!issue || issue.status === "sent") return errorResponse("That letter can't take photos now.", 409);
  const data = String(b.data ?? "").replace(/^data:image\/jpeg;base64,/, "");
  if (!data || data.length > MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(data)) return errorResponse("That photo is too large or not a JPEG.");
  const id = randomToken(8);
  await redis([["SET", `${K}img:${issue.id}:${id}`, data]]);
  return json({ id });
});
