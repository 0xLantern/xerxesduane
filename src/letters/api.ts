/** Typed calls to /api/letters/*, and sign-in through the hours log's owner session. */

export type Partner = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  hello: string;
  active: boolean;
  /** How they give, in a line. */
  giving: string;
  /** MM-DD or YYYY-MM-DD. */
  birthday: string;
  notes: string;
  lastLetterAt: number | null;
};
export type Settings = { sender: string; replyTo: string; waTemplate: string; allowDownload: boolean };
export type Letter = {
  id: string;
  title: string;
  publishedAt: number;
  expiresAt: number;
  size: number;
  chunks: number;
  allowDownload: boolean;
  status: "uploading" | "live" | "withdrawn";
  withdrawnAt?: number;
};
export type LetterSummary = Letter & { copies: number; opened: number; praying: number };
/** A partner's "Praying for you" from inside the letter, with their line if they wrote one. */
export type Praying = { at: number; note: string };
export type CopyRow = { copyId: string; partnerId: string; name: string; opened: number | null; mailed: number | null; praying: Praying | null };
export type PrayerRequest = { id: string; text: string; createdAt: number; answeredAt: number | null; answer: string; photo: string; prayed: number };
export type NewCopy = { copyId: string; partnerId: string; wrapped: string };
export type EmailSend = { partnerId: string; copyId: string; link: string };

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

  letters: () => call<{ letters: LetterSummary[] }>(`${L}letters`),
  letter: (id: string) => call<{ letter: Letter; copies: CopyRow[] }>(`${L}letters?id=${encodeURIComponent(id)}`),
  createLetter: (b: { title: string; size: number; chunks: number; allowDownload: boolean }) => call<{ letter: Letter }>(`${L}letters`, "POST", b),
  finishLetter: (id: string) => call<{ letter: Letter }>(`${L}letters`, "PATCH", { id, done: true }),
  withdrawCopy: (id: string, copyId: string) => call(`${L}letters`, "DELETE", { id, copyId }),
  withdrawAll: (id: string) => call<{ withdrawn: number }>(`${L}letters`, "DELETE", { id }),
  removeLetter: (id: string) => call(`${L}letters`, "DELETE", { id, remove: true }),
  chunk: (id: string, n: number, data: string) => call<{ n: number }>(`${L}chunk`, "POST", { id, n, data }),
  copies: (id: string, copies: NewCopy[]) => call<{ created: string[]; failed: { copyId: string; error: string }[] }>(`${L}copies`, "POST", { id, copies }),
  email: (id: string, sends: EmailSend[]) => call<{ sent: string[]; skipped: { copyId: string; reason: string }[] }>(`${L}email`, "POST", { id, sends }),

  partners: () => call<{ partners: Partner[] }>(`${L}partners`),
  addPartners: (partners: Partial<Partner>[]) => call<{ added: number; skipped: string[] }>(`${L}partners`, "POST", { partners }),
  savePartner: (p: Partner) => call<{ partner: Partner }>(`${L}partners`, "PATCH", p),
  deletePartner: (id: string) => call(`${L}partners`, "DELETE", { id }),
  settings: () => call<{ settings: Settings; defaults: { waTemplate: string } }>(`${L}settings`),

  /** A partner, from inside their letter. */
  react: (copyId: string, note: string) => call<{ ok: true; at: number }>(`${L}react`, "POST", { c: copyId, note }),

  prayer: () => call<{ requests: PrayerRequest[]; token: string }>(`${L}prayer`),
  addPrayer: (text: string, photo = "") => call<{ request: PrayerRequest; requests: PrayerRequest[] }>(`${L}prayer`, "POST", { text, photo }),
  editPrayer: (id: string, patch: { text?: string; answered?: boolean; answer?: string; photo?: string }) => call<{ requests: PrayerRequest[] }>(`${L}prayer`, "PATCH", { id, ...patch }),
  deletePrayer: (id: string) => call<{ requests: PrayerRequest[] }>(`${L}prayer`, "DELETE", { id }),
  rotatePrayer: () => call<{ token: string }>(`${L}prayer`, "POST", { rotate: true }),
  /** The prayer team, through their link. */
  teamPrayer: (token: string) => call<{ requests: PrayerRequest[]; sender: string }>(`${L}prayer?t=${encodeURIComponent(token)}`),
  prayed: (token: string, id: string) => call<{ prayed: number }>(`${L}prayer?t=${encodeURIComponent(token)}`, "POST", { id, prayed: true }),
  saveSettings: (s: Settings) => call<{ settings: Settings; defaults: { waTemplate: string } }>(`${L}settings`, "PATCH", s),
};

/**
 * Retry a call a few times on network trouble or a server hiccup. Not on a
 * refusal (4xx) or on something that isn't set up (503): those won't change.
 */
export async function retry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (i >= tries || ![0, 429, 500, 502, 504].includes(status)) throw e;
      await new Promise((r) => setTimeout(r, 600 * 2 ** i));
    }
  }
}
