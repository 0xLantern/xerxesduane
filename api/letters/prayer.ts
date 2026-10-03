// Prayer requests, and the prayer team's page.
//
//   GET                                  owner: every request, and the team link's token
//   GET ?t=<token>                       the team: open requests, and ones answered in the last 14 days
//   POST { text }                        owner: add a request
//   POST { rotate: true }                owner: a new team link (the old one stops working)
//   POST ?t=<token> { id, prayed: true } the team: "I prayed" on a request
//   PATCH { id, text?, answered?, answer? }
//                                        owner: change it, or mark it answered (or open again)
//   DELETE { id }                        owner: remove it
import {
  K,
  PRAYER_LIMIT,
  allPrayer,
  cleanPhoto,
  errorResponse,
  existingPrayerToken,
  getSettings,
  handle,
  json,
  prayerToken,
  randomToken,
  readJson,
  redis,
  requireOwner,
  savePrayer,
  type PrayerRequest,
} from "./_lib";
import { safeEqual, underLimit } from "../work/_lib";

export const config = { runtime: "edge" };

const ID = /^[A-Za-z0-9_-]{11}$/;

async function teamToken(req: Request): Promise<boolean> {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  const real = await existingPrayerToken();
  return !!real && t.length >= 16 && (await safeEqual(t, real));
}

export default handle(async (req) => {
  const url = new URL(req.url);
  const isTeam = url.searchParams.has("t");

  if (isTeam) {
    if (!(await underLimit("prayer-team", req, 60, 60))) return errorResponse("Too many requests. Wait a minute.", 429);
    if (!(await teamToken(req))) return errorResponse("This link isn't valid any more. Ask for a new one.", 404);
    if (req.method === "GET") {
      const [requests, settings] = await Promise.all([allPrayer(), getSettings()]);
      return json({ requests, sender: settings.sender });
    }
    if (req.method !== "POST") return errorResponse("Method not allowed.", 405);
    const body = await readJson(req);
    const id = String(body.id ?? "");
    if (body.prayed !== true || !ID.test(id)) return errorResponse("Nothing to do.");
    const [exists] = await redis([["HEXISTS", `${K}prayer`, id]]);
    if (Number(exists) !== 1) return errorResponse("That request isn't on the list any more.", 404);
    const [n] = await redis([["HINCRBY", `${K}prayed`, id, 1]]);
    return json({ prayed: Number(n) });
  }

  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;

  if (req.method === "GET") return json({ requests: await allPrayer(), token: await prayerToken() });
  const body = await readJson(req);

  if (req.method === "POST") {
    if (body.rotate === true) {
      const token = randomToken(16);
      await redis([["SET", `${K}prayer-token`, token]]);
      return json({ token });
    }
    const text = String(body.text ?? "").replace(/\r/g, "").trim().slice(0, PRAYER_LIMIT);
    if (!text) return errorResponse("Write the request first.");
    const photo = cleanPhoto(body.photo ?? "");
    if (photo === null) return errorResponse("That photo is too large or isn't a JPEG or PNG. Try a smaller one.");
    const r: PrayerRequest = { id: randomToken(8), text, createdAt: Date.now(), answeredAt: null, answer: "", photo };
    await savePrayer(r);
    return json({ request: r, requests: await allPrayer() });
  }

  const id = String(body.id ?? "");
  if (!ID.test(id)) return errorResponse("That request isn't on the list any more.", 404);
  const current = (await allPrayer()).find((r) => r.id === id);
  if (!current) return errorResponse("That request isn't on the list any more.", 404);

  if (req.method === "PATCH") {
    const next: PrayerRequest = { id: current.id, text: current.text, createdAt: current.createdAt, answeredAt: current.answeredAt, answer: current.answer, photo: current.photo };
    if (body.photo !== undefined) {
      const photo = cleanPhoto(body.photo);
      if (photo === null) return errorResponse("That photo is too large or isn't a JPEG or PNG. Try a smaller one.");
      next.photo = photo;
    }
    if (body.text !== undefined) {
      next.text = String(body.text).replace(/\r/g, "").trim().slice(0, PRAYER_LIMIT);
      if (!next.text) return errorResponse("The request can't be empty. Remove it instead.");
    }
    if (body.answered === true) next.answeredAt = current.answeredAt ?? Date.now();
    if (body.answered === false) {
      next.answeredAt = null;
      next.answer = "";
    }
    if (body.answer !== undefined) next.answer = String(body.answer).replace(/\s+/g, " ").trim().slice(0, PRAYER_LIMIT);
    await savePrayer(next);
    return json({ requests: await allPrayer() });
  }

  if (req.method === "DELETE") {
    await redis([["HDEL", `${K}prayer`, id], ["HDEL", `${K}prayed`, id]]);
    return json({ requests: await allPrayer() });
  }
  return errorResponse("Method not allowed.", 405);
});
