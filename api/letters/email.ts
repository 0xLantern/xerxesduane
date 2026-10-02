// Email partners their links, right after the owner's browser made their
// copies: POST {id, sends: [{partnerId, copyId, link}]}, up to 100.
//
// The links carry the keys, so this is the one moment the server holds them:
// long enough to put each into its email, and never stored or logged. Each
// one is checked first: the copy has to be this letter's and this partner's,
// and the link exactly ORIGIN/l/<copyId>#<key>. A copy is emailed once.
//
// Sending can't be scheduled for later without keeping the keys here until
// then, which is what the whole design avoids; so emails go out at publish.
import {
  K,
  MailMissing,
  allPartners,
  errorResponse,
  getLetter,
  getSettings,
  handle,
  isCopyLink,
  json,
  letterEmail,
  pairs,
  readJson,
  redis,
  requireOwner,
  resendBatch,
  ttl,
} from "./_lib";

export const config = { runtime: "edge" };

const MAX = 100;

export default handle(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  const denied = await requireOwner(req, true);
  if (denied) return denied;
  const b = await readJson(req);
  const letter = await getLetter(b.id);
  if (!letter) return errorResponse("That letter has expired or was removed.", 404);
  if (letter.status !== "live") return errorResponse("This letter isn't live, so there's nothing to email.", 409);
  const list = Array.isArray(b.sends) ? (b.sends as Record<string, unknown>[]) : [];
  if (!list.length || list.length > MAX) return errorResponse(`Send between 1 and ${MAX} emails at a time.`);

  const [copies, mailed] = (await redis([
    ["HGETALL", `${K}copies:${letter.id}`],
    ["HGETALL", `${K}mailed:${letter.id}`],
  ])).map(pairs);
  const partners = new Map((await allPartners()).map((p) => [p.id, p]));
  const settings = await getSettings();

  const emails: { copyId: string; email: object }[] = [];
  const skipped: { copyId: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    const copyId = String(s?.copyId ?? "");
    const partner = partners.get(String(s?.partnerId ?? ""));
    if (seen.has(copyId)) {
      skipped.push({ copyId, reason: "listed twice" });
      continue;
    }
    seen.add(copyId);
    if (!partner || copies.get(copyId) !== partner.id) skipped.push({ copyId, reason: "not this partner's copy" });
    else if (!isCopyLink(s.link, copyId)) skipped.push({ copyId, reason: "not this copy's link" });
    else if (!partner.email) skipped.push({ copyId, reason: "no email address" });
    else if (mailed.has(copyId)) skipped.push({ copyId, reason: "already emailed" });
    else emails.push({ copyId, email: letterEmail(partner, letter.title, s.link, settings, letter.expiresAt) });
  }

  if (emails.length) {
    try {
      await resendBatch(emails, letter.id);
    } catch (err) {
      if (err instanceof MailMissing) return errorResponse("Email isn't set up: RESEND_API_KEY is missing in Vercel.", 503);
      // Only the status ("resend 422"): never the request, which holds the links.
      console.error("[letters] email", String(err).slice(0, 60));
      return errorResponse("The emails didn't go out. Try again in a minute.", 502);
    }
    const now = String(Date.now());
    await redis([
      ["HSET", `${K}mailed:${letter.id}`, ...emails.flatMap((e) => [e.copyId, now])],
      ["EXPIRE", `${K}mailed:${letter.id}`, ttl(letter)],
    ]);
  }
  return json({ sent: emails.map((e) => e.copyId), skipped });
});
