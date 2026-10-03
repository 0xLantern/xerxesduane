// A partner's reply from inside their letter: "Praying for you", with an
// optional line. No login: the copy id is the partner's, the same way the
// letter is. Stored with the letter and gone when it is; the owner sees it
// on the desk, and gets an email the first time, and again if a line is
// added or changed afterwards (sending no line keeps the one there was).
//   POST { c: copyId, note? }
import { K, allPartners, copiesOf, errorResponse, esc, getLetter, handle, json, readJson, redis, ttl } from "./_lib";
import { underLimit } from "../work/_lib";
import { OWNER_EMAIL } from "../work/_lib";
import { COPY_ID } from "../../src/letters/shared";

export const config = { runtime: "edge" };

const GONE = "This letter has expired or was withdrawn.";

export default handle(async (req) => {
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
  if (!(await underLimit("letters-react", req, 20, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
  const body = await readJson(req);
  const c = String(body.c ?? "");
  if (!COPY_ID.test(c)) return errorResponse(GONE, 404);
  const [rawCopy] = await redis([["GET", `${K}copy:${c}`]]);
  const letterId = ((): string => {
    try {
      return typeof rawCopy === "string" ? String((JSON.parse(rawCopy) as { letterId?: string }).letterId ?? "") : "";
    } catch {
      return "";
    }
  })();
  const letter = letterId ? await getLetter(letterId) : null;
  if (!letter || letter.status !== "live") return errorResponse(GONE, 404);

  const typed = String(body.note ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  const [existing] = await redis([["HGET", `${K}react:${letter.id}`, c]]);
  const before = ((): { at: number; note: string } | null => {
    try {
      const r = typeof existing === "string" ? (JSON.parse(existing) as { at?: unknown; note?: unknown }) : null;
      return r ? { at: Number(r.at) || Date.now(), note: String(r.note ?? "") } : null;
    } catch {
      return null;
    }
  })();
  // When they first said so stays; a later empty send doesn't wipe their line.
  const at = before?.at ?? Date.now();
  const note = typed || before?.note || "";
  await redis([
    ["HSET", `${K}react:${letter.id}`, c, JSON.stringify({ at, note })],
    ["EXPIRE", `${K}react:${letter.id}`, ttl(letter)],
  ]);

  // Tell the owner: the first time, and when a line arrives later. Best effort.
  const lineAdded = !!before && !!typed && typed !== before.note;
  if (!before || lineAdded) {
    const key = process.env.RESEND_API_KEY;
    if (key) {
      const partnerId = (await copiesOf(letter.id)).get(c);
      const partner = partnerId ? (await allPartners()).find((p) => p.id === partnerId) : undefined;
      const who = partner?.name ?? "A partner";
      const from = process.env.LETTERS_FROM || "Partner letters <letters@xerxesduane.com>";
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          from,
          to: [OWNER_EMAIL],
          subject: lineAdded ? `🙏 ${who} added a line` : `🙏 ${who} is praying for you`,
          html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#2b2420;">
<p>${lineAdded ? `<strong>${esc(who)}</strong>, praying for you since reading <em>${esc(letter.title)}</em>, added a line:` : `<strong>${esc(who)}</strong> read <em>${esc(letter.title)}</em> and tapped <strong>Praying for you</strong>.`}</p>
${note ? `<blockquote style="margin:12px 0;padding:10px 14px;border-left:3px solid #8a6a2e;background:#faf6ee;">${esc(note)}</blockquote>` : ""}
<p style="color:#8a7f75;font-size:13px;">ministry.xerxesduane.com/letters</p></div>`,
        }),
      }).catch(() => undefined);
    }
  }
  return json({ ok: true, at });
});


