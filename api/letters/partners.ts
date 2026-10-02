// The partner list. GET lists; POST adds one or many ({partners:[...]});
// PATCH updates one; DELETE removes one.
import { allPartners, deletePartner, errorResponse, handle, json, randomToken, readJson, requireOwner, savePartners, type Partner } from "./_lib";

export const config = { runtime: "edge" };

function clean(p: Record<string, unknown>, id?: string): Partner | string {
  const name = String(p.name ?? "").trim().slice(0, 100);
  const email = String(p.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!name) return "Give the partner's name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return `"${email || name}" doesn't look like an email address.`;
  const hello = String(p.hello ?? "").trim().slice(0, 60) || name.split(/\s+/)[0];
  return { id: id ?? randomToken(8), name, email, hello, active: p.active !== false };
}

export default handle(async (req) => {
  const denied = await requireOwner(req, req.method !== "GET");
  if (denied) return denied;
  if (req.method === "GET") return json({ partners: await allPartners() });
  const body = await readJson(req);

  if (req.method === "POST") {
    const list = Array.isArray(body.partners) ? body.partners : [body];
    const existing = new Set((await allPartners()).map((p) => p.email));
    const add: Partner[] = [];
    const skipped: string[] = [];
    for (const raw of list.slice(0, 500)) {
      const p = clean((raw ?? {}) as Record<string, unknown>);
      if (typeof p === "string") skipped.push(p);
      else if (existing.has(p.email)) skipped.push(`${p.email} is already on the list.`);
      else {
        existing.add(p.email);
        add.push(p);
      }
    }
    await savePartners(add);
    return json({ added: add.length, skipped });
  }

  if (req.method === "PATCH") {
    const id = String(body.id ?? "");
    const p = clean(body, id);
    if (!id) return errorResponse("Which partner?");
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
