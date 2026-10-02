// Letters. GET lists them (or ?id= for one, with who opened it); POST makes
// a new draft; PATCH saves the draft or schedules it; DELETE removes a draft,
// or revokes one partner's copy of a sent letter ({id, revoke: copyId}).
import {
  K,
  allIssues,
  allPartners,
  deleteIssue,
  errorResponse,
  getIssue,
  getSettings,
  handle,
  json,
  nextSendDate,
  randomToken,
  readJson,
  redis,
  requireOwner,
  saveIssue,
  today,
  type Issue,
} from "./_lib";
import type { Draft } from "../../src/letters/shared";

export const config = { runtime: "edge" };

const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);

function cleanDraft(d: Record<string, unknown>, prev: Draft): Draft {
  const sections = Array.isArray(d.sections) ? d.sections : prev.sections;
  const prayer = Array.isArray(d.prayer) ? d.prayer : prev.prayer;
  const images = Array.isArray(d.images) ? d.images : prev.images;
  const giving = (d.giving ?? prev.giving) as Record<string, unknown>;
  return {
    title: str(d.title ?? prev.title, 140),
    sections: sections.slice(0, 20).map((s: Record<string, unknown>) => ({ heading: str(s?.heading, 140), body: str(s?.body, 8000) })),
    prayer: prayer.slice(0, 30).map((p: unknown) => str(p, 400)),
    images: images
      .slice(0, 8)
      .filter((i: Record<string, unknown>) => /^[A-Za-z0-9_-]{6,30}$/.test(String(i?.id)))
      .map((i: Record<string, unknown>) => ({ id: String(i.id), caption: str(i.caption, 200) })),
    giving: { url: str(giving?.url, 300).trim(), label: str(giving?.label, 40).trim() },
  };
}

export default handle(async (req) => {
  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;
  const url = new URL(req.url);

  if (req.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return json({ issues: await allIssues(), today: today() });
    const issue = await getIssue(id);
    if (!issue) return errorResponse("That letter isn't here any more.", 404);
    let readers: { copyId: string; partner: string; opened: number | null }[] = [];
    if (issue.sent) {
      const [flat, opened] = await redis([
        ["HGETALL", `${K}send:${issue.sent.sendId}`],
        ["HGETALL", `${K}opened:${issue.sent.sendId}`],
      ]);
      const names = new Map((await allPartners()).map((p) => [p.id, p.name]));
      const o = new Map<string, number>();
      const ol = Array.isArray(opened) ? (opened as string[]) : [];
      for (let i = 0; i < ol.length; i += 2) o.set(ol[i], Number(ol[i + 1]));
      const fl = Array.isArray(flat) ? (flat as string[]) : [];
      for (let i = 0; i < fl.length; i += 2) {
        if (fl[i].startsWith("_")) continue;
        readers.push({ copyId: fl[i], partner: names.get(fl[i + 1]) ?? "(removed partner)", opened: o.get(fl[i]) ?? null });
      }
      readers = readers.sort((a, b) => a.partner.localeCompare(b.partner));
    }
    return json({ issue, readers });
  }

  const body = await readJson(req);

  if (req.method === "POST") {
    const now = Date.now();
    const s = await getSettings();
    const issue: Issue = {
      id: randomToken(9),
      status: "draft",
      sendOn: nextSendDate(s.sendDay),
      created: now,
      modified: now,
      draft: cleanDraft(body, {
        title: "",
        sections: [{ heading: "", body: "Dear {{hello}},\n\n" }],
        prayer: [],
        images: [],
        giving: { url: "", label: "" },
      }),
    };
    await saveIssue(issue);
    return json({ issue });
  }

  const issue = await getIssue(String(body.id ?? ""));
  if (!issue) return errorResponse("That letter isn't here any more.", 404);

  if (req.method === "PATCH") {
    if (issue.status === "sent") return errorResponse("This letter has been sent, so it can't change now.", 409);
    const next: Issue = { ...issue, draft: body.draft ? cleanDraft(body.draft as Record<string, unknown>, issue.draft) : issue.draft, modified: Date.now() };
    if (typeof body.sendOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.sendOn)) next.sendOn = body.sendOn;
    if (body.status === "scheduled" || body.status === "draft") next.status = body.status;
    if (next.status === "scheduled") {
      if (!next.draft.title.trim()) return errorResponse("Give the letter a title before scheduling it.");
      if (next.sendOn < today()) return errorResponse("Pick a send date from today on.");
    }
    await saveIssue(next);
    return json({ issue: next });
  }

  if (req.method === "DELETE") {
    if (typeof body.revoke === "string" && issue.sent) {
      // One partner's copy: deleting the ciphertext ends that link.
      await redis([["DEL", `${K}copy:${body.revoke}`]]);
      return json({ revoked: body.revoke });
    }
    if (issue.status === "sent" && body.everyone === true && issue.sent) {
      const [flat] = await redis([["HKEYS", `${K}send:${issue.sent.sendId}`]]);
      const ids = (Array.isArray(flat) ? (flat as string[]) : []).filter((k) => !k.startsWith("_"));
      if (ids.length) await redis(ids.map((c) => ["DEL", `${K}copy:${c}`]));
      return json({ revoked: ids.length });
    }
    await deleteIssue(issue);
    return json({ deleted: true });
  }
  return errorResponse("Method not allowed.", 405);
});
