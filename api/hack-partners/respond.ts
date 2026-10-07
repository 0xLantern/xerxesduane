// A partner's answer from their page: POST {c, d, kind}
//
// kind is one of "in", "share", "pray", "notnow". The page sends it as the
// partner taps a button, and the same tap opens WhatsApp to the Champion who
// sent the link, so the conversation carries on there. Recording it here is
// only so the Champions' panels can show who has answered and who might like
// a gentle reminder.
//
// Accepted only from a device already let in for that link (the same device
// lock as read.ts), so a forwarded link can't answer for someone. The
// signed-in owner previewing a page is not recorded. The latest tap wins.
import {
  CODE,
  DEVICE_ID,
  EXPIRES_AT,
  K,
  RESPONSE_KINDS,
  RESPONSE_LABEL,
  alertOwner,
  deviceHash,
  esc,
  handle,
  isOwner,
  parse,
  redis,
  sameOrigin,
  underLimit,
  type Invite,
  type ResponseKind,
  type Seen,
} from "./_lib";

export const config = { runtime: "edge" };

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow, noarchive",
      "referrer-policy": "no-referrer",
    },
  });
}

export default handle(async (req) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  if (!sameOrigin(req)) return reply({ error: "Blocked." }, 403);
  if (!(await underLimit("hackp-respond", req, 20, 60))) return reply({ error: "Too many tries. Wait a minute." }, 429);

  let body: { c?: unknown; d?: unknown; kind?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty body */
  }
  const c = String(body.c ?? "");
  const d = String(body.d ?? "");
  const kind = String(body.kind ?? "") as ResponseKind;
  if (!CODE.test(c) || !DEVICE_ID.test(d) || !RESPONSE_KINDS.includes(kind) || Date.now() > EXPIRES_AT) {
    return reply({ error: "Not recorded." }, 400);
  }

  // The owner checking a page shouldn't answer for the partner.
  if (await isOwner(req)) return reply({ ok: true, recorded: false });

  const [rawInvite, rawSeen] = await redis([
    ["HGET", `${K}invites`, c],
    ["GET", `${K}seen:${c}`],
  ]);
  const invite = parse<Invite>(rawInvite);
  const seen = parse<Seen>(rawSeen);
  if (!invite) return reply({ error: "Not recorded." }, 404);
  const h = await deviceHash(d);
  if (!seen?.devices.some((x) => x.h === h)) return reply({ error: "Not recorded." }, 403);

  const changed = invite.response?.kind !== kind;
  invite.response = { kind, at: Date.now() };
  await redis([["HSET", `${K}invites`, c, JSON.stringify(invite)]]);

  if (changed) {
    const by = invite.by && invite.by !== "Xerxes" ? ` The link came from ${esc(invite.by)}.` : "";
    await alertOwner(
      `response:${c}:${kind}`,
      12,
      `${invite.name} ${RESPONSE_LABEL[kind]} (#HACK partner page)`,
      `<p><strong>${esc(invite.name)}</strong> ${RESPONSE_LABEL[kind]}.${by}</p><p>Their WhatsApp message should be with ${esc(invite.by ?? "Xerxes")} too. When a gift arrives, update "places taken" on /hp.</p>`,
    );
  }
  return reply({ ok: true, recorded: true });
});
