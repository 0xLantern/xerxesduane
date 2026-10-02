// Send a letter now, or a test copy to the owner ({id, test: true}).
import { MailMissing, OWNER_EMAIL, errorResponse, getIssue, handle, json, readJson, requireOwner, sendIssue } from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const b = await readJson(req);
  const issue = await getIssue(String(b.id ?? ""));
  if (!issue) return errorResponse("That letter isn't here any more.", 404);
  if (issue.status === "sent" && b.test !== true) return errorResponse("This letter was already sent.", 409);
  if (!issue.draft.title.trim()) return errorResponse("Give the letter a title first.");
  try {
    const r = await sendIssue(issue, b.test === true ? { testTo: OWNER_EMAIL } : {});
    return json({ sent: r.count, expiresAt: r.expiresAt, test: b.test === true });
  } catch (err) {
    if (err instanceof MailMissing) return errorResponse("Email isn't set up: RESEND_API_KEY is missing.", 503);
    if (String(err).includes("no partners")) return errorResponse("Add at least one partner first.");
    if (String(err).includes("already sending")) return errorResponse("This letter is being sent right now.", 409);
    throw err;
  }
});
