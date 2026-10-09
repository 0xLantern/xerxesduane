// A person's answer from their briefing page: POST {c, d, kind}
//
// kind is one of "join", "talk", "pray", "notnow". The same tap opens
// WhatsApp to the owner with a message ready, so the conversation carries on
// there; recording it here is only so the panel at /join can show who has
// answered. Accepted only from a device already let in for that link, so a
// forwarded link can't answer for someone. The owner previewing a page is not
// recorded. The latest tap wins.
import {
  CODE,
  DEVICE_ID,
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
  reply,
  sameOrigin,
  underLimit,
  type Invite,
  type ResponseKind,
  type Seen,
} from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  if (!sameOrigin(req)) return reply({ error: "Blocked." }, 403);
  if (!(await underLimit("join-respond", req, 20, 60))) return reply({ error: "Too many tries. Wait a minute." }, 429);

  let body: { c?: unknown; d?: unknown; kind?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty body */
  }
  const c = String(body.c ?? "");
  const d = String(body.d ?? "");
  const kind = String(body.kind ?? "") as ResponseKind;
  if (!CODE.test(c) || !DEVICE_ID.test(d) || !RESPONSE_KINDS.includes(kind)) return reply({ error: "Not recorded." }, 400);

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
    await alertOwner(
      `response:${c}:${kind}`,
      12,
      `${invite.name} ${RESPONSE_LABEL[kind]} (private briefing)`,
      `<p><strong>${esc(invite.name)}</strong> ${RESPONSE_LABEL[kind]}.</p><p>Their WhatsApp message should be with you too.</p>`,
    );
  }
  return reply({ ok: true, recorded: true });
});
