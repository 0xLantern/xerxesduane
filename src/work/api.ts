/** Typed calls to /api/work/*. Every error carries the server's own message. */

export type Entry = { id: string; start: number; end: number; task: string; notes: string; link: string; client: string };
export type Timer = { start: number; task: string; notes: string; link: string; client: string };
/** The invoice's view: the owner's name with one client's rate. */
export type Settings = { name: string; client: string; rate: number; currency: string };

export type BillTo = { name: string; lines: string[]; phone: string; email: string; web: string };
export type Client = {
  id: string;
  name: string;
  /** The tag in invoice numbers: XD-<short>-<period>. */
  short: string;
  rate: number;
  currency: string;
  billTo: BillTo;
  invoiceTo: string[];
  autoInvoice: boolean;
  logo: string;
  slug: string;
  createdAt: number;
  archived: boolean;
};
export type ClientFields = Pick<Client, "name" | "short" | "rate" | "currency" | "billTo" | "invoiceTo" | "autoInvoice" | "archived">;

/** A payment the owner recorded against an invoice. */
export type Payment = { paidAt: number; currency: "USD" | "CHF"; amount: number | null; note: string };

/** One month's invoice: what it came to, whether it went out, whether it was paid. */
export type InvoiceRow = {
  client: string;
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
  clients: Client[];
  /** Each client's private link token, by client id. */
  shareTokens: Record<string, string>;
  /** Every client's rows; each names its client. */
  invoices: InvoiceRow[];
  /** By client id, then month. */
  summaries: Record<string, Record<string, Summary>>;
  trash: Trashed[];
  now: number;
};
export type ReportData = {
  entries: Entry[];
  settings: Settings;
  client: { id: string; name: string; logo: string };
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
  saveName: (name: string) => call<{ settings: Settings; clients: Client[] }>("settings", "PATCH", { name }),
  addClient: (c: ClientFields) => call<{ client: Client; clients: Client[] }>("settings", "POST", { add: c }),
  saveClient: (clientId: string, c: ClientFields) => call<{ client: Client; clients: Client[]; settings: Settings }>("settings", "PATCH", { clientId, ...c }),
  rotateLink: (client: string) => call<{ client: string; shareToken: string }>("settings", "POST", { rotate: true, client }),
  emailInvoice: (client: string, period: "last" | "current", resend = false) =>
    call<{ sent: string; to: string[] }>("invoice", "POST", { client, period, resend }),
  invoices: (client: string) => call<{ invoices: InvoiceRow[]; owed: Owed }>(`invoices?c=${encodeURIComponent(client)}`),
  markPaid: (client: string, period: string, p: { currency: "USD" | "CHF"; amount: number | null; paidAt: string; note: string }) =>
    call<{ invoices: InvoiceRow[]; owed: Owed }>("invoices", "POST", { client, period, paid: true, ...p }),
  unmarkPaid: (client: string, period: string) => call<{ invoices: InvoiceRow[]; owed: Owed }>("invoices", "POST", { client, period, paid: false }),
  saveSummary: (client: string, month: string, s: Pick<Summary, "delivered" | "next" | "decide">) =>
    call<{ client: string; summaries: Record<string, Summary> }>("summary", "PATCH", { client, month, ...s }),
  restore: (id: string) => call<{ entry: Entry; trash: Trashed[] }>("trash", "POST", { id, action: "restore" }),
  purge: (id: string) => call<{ trash: Trashed[] }>("trash", "POST", { id, action: "purge" }),
  clientLogin: (password: string) => call<{ ok: true }>("client-login", "POST", { password }),
  report: (token: string) => call<ReportData>(`report?t=${encodeURIComponent(token)}`),
};
