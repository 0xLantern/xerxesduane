/** Typed calls to /api/letters/*, and sign-in through the hours log's owner session. */
import type { Draft } from "./shared";

export type Partner = { id: string; name: string; email: string; hello: string; active: boolean };
export type Settings = { sender: string; sendDay: number; givingUrl: string; givingLabel: string; replyTo: string };
export type Issue = {
  id: string;
  status: "draft" | "scheduled" | "sent";
  sendOn: string;
  draft: Draft;
  created: number;
  modified: number;
  sent?: { sendId: string; at: number; expiresAt: number; count: number };
};
export type Reader = { copyId: string; partner: string; opened: number | null };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("You're offline, or the site couldn't be reached. Try again.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? `Something went wrong (${res.status}).`, res.status);
  return data as T;
}

const L = "/api/letters/";
export const api = {
  session: () => call<{ authed: boolean; configured: boolean }>("/api/work/session"),
  login: (email: string, password: string) => call("/api/work/session", "POST", { email, password }),
  logout: () => call("/api/work/session", "DELETE", {}),
  issues: () => call<{ issues: Issue[]; today: string }>(`${L}issues`),
  issue: (id: string) => call<{ issue: Issue; readers: Reader[] }>(`${L}issues?id=${id}`),
  newIssue: () => call<{ issue: Issue }>(`${L}issues`, "POST", {}),
  saveIssue: (id: string, patch: { draft?: Draft; sendOn?: string; status?: "draft" | "scheduled" }) =>
    call<{ issue: Issue }>(`${L}issues`, "PATCH", { id, ...patch }),
  deleteIssue: (id: string) => call(`${L}issues`, "DELETE", { id }),
  revoke: (id: string, copyId: string) => call(`${L}issues`, "DELETE", { id, revoke: copyId }),
  revokeAll: (id: string) => call<{ revoked: number }>(`${L}issues`, "DELETE", { id, everyone: true }),
  upload: (issue: string, data: string) => call<{ id: string }>(`${L}image`, "POST", { issue, data }),
  send: (id: string, test: boolean) => call<{ sent: number; expiresAt: number; test: boolean }>(`${L}send`, "POST", { id, test }),
  partners: () => call<{ partners: Partner[] }>(`${L}partners`),
  addPartners: (partners: Partial<Partner>[]) => call<{ added: number; skipped: string[] }>(`${L}partners`, "POST", { partners }),
  savePartner: (p: Partner) => call(`${L}partners`, "PATCH", p),
  deletePartner: (id: string) => call(`${L}partners`, "DELETE", { id }),
  settings: () => call<{ settings: Settings }>(`${L}settings`),
  saveSettings: (s: Settings) => call<{ settings: Settings }>(`${L}settings`, "PATCH", s),
};

/** Shrink a photo in the browser to a JPEG of at most 1600px, so uploads stay small. */
export async function resizePhoto(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  for (const q of [0.82, 0.7, 0.55]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length < 880_000) return url;
  }
  throw new Error("That photo is too large even after shrinking.");
}
