// The partner list. GET lists; POST adds one or many ({partners:[...]});
// PATCH updates one; DELETE removes one. Each partner needs an email address
// or a WhatsApp number (or both).
import { allPartners, cleanPartner, deletePartner, errorResponse, handle, json, readJson, requireOwner, savePartners, type Partner } from "./_lib";

export const config = { runtime: "edge" };

export default handle(async (req) => {
  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;
  if (req.method === "GET") return json({ partners: await allPartners() });
  const body = await readJson(req);

  if (req.method === "POST") {
    const list = Array.isArray(body.partners) ? body.partners : [body];
    const current = await allPartners();
    const emails = new Set(current.map((p) => p.email).filter(Boolean));
    const numbers = new Set(current.map((p) => p.whatsapp).filter(Boolean));
    const fbs = new Set(current.map((p) => p.messenger.toLowerCase()).filter(Boolean));
    const add: Partner[] = [];
    const skipped: string[] = [];
    for (const raw of list.slice(0, 500)) {
      const p = cleanPartner((raw ?? {}) as Record<string, unknown>);
      if (typeof p === "string") skipped.push(p);
      else if (p.email && emails.has(p.email)) skipped.push(`${p.email} is already on the list.`);
      else if (p.whatsapp && numbers.has(p.whatsapp)) skipped.push(`+${p.whatsapp} is already on the list.`);
      else if (p.messenger && fbs.has(p.messenger.toLowerCase())) skipped.push(`${p.name}'s Messenger is already on the list.`);
      else {
        if (p.email) emails.add(p.email);
        if (p.whatsapp) numbers.add(p.whatsapp);
        if (p.messenger) fbs.add(p.messenger.toLowerCase());
        add.push(p);
      }
    }
    await savePartners(add);
    return json({ added: add.length, skipped });
  }

  if (req.method === "PATCH") {
    const id = String(body.id ?? "");
    const current = (await allPartners()).find((p) => p.id === id);
    if (!id || !current) return errorResponse("That partner isn't on the list any more.", 404);
    const p = cleanPartner(body, id, current);
    if (typeof p === "string") return errorResponse(p);
    await savePartners([p]);
    return json({ partner: p });
  }

  if (req.method === "DELETE") {
    await deletePartner(String(body.id ?? ""));
    return json({ deleted: true });
  }
  return errorResponse("Method not allowed.", 405);
});
