/** Typed calls to /api/work/*. Every error carries the server's own message. */

export type Entry = { id: string; start: number; end: number; task: string; notes: string; link: string };
export type Timer = { start: number; task: string; notes: string; link: string };
export type Settings = { name: string; client: string; rate: number; currency: string };

/** A payment the owner recorded against an invoice. */
export type Payment = { paidAt: number; currency: "USD" | "CHF"; amount: number | null; note: string };

/** One month's invoice: what it came to, whether it went out, whether it was paid. */
export type InvoiceRow = {
  periodId: string;
  label: string;
  number: string;
  hours: number;
  total: number;
  currency: string;
  /** open: the month still running · pending: closed, invoice not sent yet · sent */
  status: "open" | "pending" | "sent";
  sentAt: number | null;
  paid: Payment | null;
};
export type Owed = { total: number; count: number };

/** The owner's three lines for a month, for the client. */
export type Summary = { delivered: string; next: string; decide: string; updatedAt: number };

export type Trashed = { entry: Entry; deletedAt: number };

export type OwnerData = {
  entries: Entry[];
  timer: Timer | null;
  settings: Settings;
  shareToken: string;
  invoices: InvoiceRow[];
  owed: Owed;
  summaries: Record<string, Summary>;
  trash: Trashed[];
  now: number;
};
export type ReportData = {
  entries: Entry[];
  settings: Settings;
  invoices: InvoiceRow[];
  owed: Owed;
  summaries: Record<string, Summary>;
  email: string;
  working: { start: number } | null;
  now: number;
};

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
    res = await fetch(`/api/work/${path}`, {
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

export const api = {
  session: () => call<{ authed: boolean; configured: boolean }>("session"),
  login: (email: string, password: string) => call<{ authed: true }>("session", "POST", { email, password }),
  logout: () => call<{ authed: false }>("session", "DELETE", {}),
  data: () => call<OwnerData>("data"),
  addEntry: (e: Omit<Entry, "id"> & { key?: string }) => call<{ entry: Entry }>("entries", "POST", e),
  updateEntry: (e: Entry) => call<{ entry: Entry }>("entries", "PATCH", e),
  deleteEntry: (id: string) => call<{ deleted: string }>("entries", "DELETE", { id }),
  timer: (action: "start" | "update" | "stop" | "discard", fields: Partial<Timer> = {}) =>
    call<{ timer: Timer | null; entry?: Entry | null; note?: string }>("timer", "POST", { action, ...fields }),
  saveSettings: (s: Pick<Settings, "name" | "client" | "rate">) => call<{ settings: Settings }>("settings", "PATCH", s),
  rotateLink: () => call<{ shareToken: string }>("settings", "POST", { rotate: true }),
  emailInvoice: (period: "last" | "current", resend = false) =>
    call<{ sent: string; to: string[] }>("invoice", "POST", { period, resend }),
  invoices: () => call<{ invoices: InvoiceRow[]; owed: Owed }>("invoices"),
  markPaid: (period: string, p: { currency: "USD" | "CHF"; amount: number | null; paidAt: string; note: string }) =>
    call<{ invoices: InvoiceRow[]; owed: Owed }>("invoices", "POST", { period, paid: true, ...p }),
  unmarkPaid: (period: string) => call<{ invoices: InvoiceRow[]; owed: Owed }>("invoices", "POST", { period, paid: false }),
  saveSummary: (month: string, s: Pick<Summary, "delivered" | "next" | "decide">) =>
    call<{ summaries: Record<string, Summary> }>("summary", "PATCH", { month, ...s }),
  restore: (id: string) => call<{ entry: Entry; trash: Trashed[] }>("trash", "POST", { id, action: "restore" }),
  purge: (id: string) => call<{ trash: Trashed[] }>("trash", "POST", { id, action: "purge" }),
  clientLogin: (password: string) => call<{ ok: true }>("client-login", "POST", { password }),
  report: (token: string) => call<ReportData>(`report?t=${encodeURIComponent(token)}`),
};
