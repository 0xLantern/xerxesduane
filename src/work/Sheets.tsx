/**
 * The owner's extra panels: the invoice list (with Mark paid), the month's
 * note for the client, and the trash. Each is small enough to live here
 * rather than crowd Owner.tsx.
 */
import { useMemo, useState, type FormEvent } from "react";
import { api, type Client, type ClientFields, type Entry, type InvoiceRow, type Owed, type Payment, type Summary, type Trashed } from "./api";
import { TONE, byYear, fmtDate, invoiceState, money, yearTotals } from "./invoices";
import { Button, DownloadLink, ErrorNote, Field, Sheet, TextArea, TextInput } from "./ui";
import { dateInput, fmtDay, fmtHours, fmtMonth, fmtTime } from "./time";

type Guard = <T>(p: Promise<T>) => Promise<T>;

export function StatusPill({ row }: { row: InvoiceRow }) {
  const st = invoiceState(row);
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[st.tone]}`}>{st.label}</span>;
}


// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export function InvoicesSheet({
  client,
  invoices,
  owed,
  guard,
  onChange,
  onClose,
}: {
  client: Client;
  invoices: InvoiceRow[];
  owed: Owed;
  guard: Guard;
  onChange: (invoices: InvoiceRow[], owed: Owed) => void;
  onClose: () => void;
}) {
  const c = `&c=${encodeURIComponent(client.id)}`;
  const [marking, setMarking] = useState<string | null>(null);
  const [sending, setSending] = useState<InvoiceRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const years = useMemo(() => byYear(invoices), [invoices]);
  const currency = invoices[0]?.currency ?? "USD";

  const unmark = async (r: InvoiceRow) => {
    if (!window.confirm(`Mark ${r.number} as not paid after all?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await guard(api.unmarkPaid(client.id, r.periodId));
      onChange(res.invoices, res.owed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={`Invoices · ${client.name}`} onClose={onClose} locked={busy}>
      {sending && (
        <SendPanel
          client={client}
          row={sending}
          guard={guard}
          onCancel={() => setSending(null)}
          onSent={async () => {
            setSending(null);
            const res = await guard(api.invoices(client.id));
            onChange(res.invoices, res.owed);
          }}
        />
      )}
      <div className={`space-y-5 ${sending ? "hidden" : ""}`}>
        <div className="rounded-2xl border border-line bg-canvas px-4 py-3">
          <p className="text-sm font-bold text-fg-soft">Still owed</p>
          <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-fg">{money(owed.total, currency)}</p>
          <p className="text-sm text-fg-soft">
            {owed.count === 0 ? "Every sent invoice is paid." : `${owed.count} ${owed.count === 1 ? "invoice" : "invoices"} sent and not yet paid.`}
          </p>
        </div>
        <ErrorNote>{error}</ErrorNote>
        {years.length === 0 && <p className="text-[0.95rem] text-fg-soft">No invoices yet: they appear once hours are logged.</p>}
        {years.map(([year, rows]) => {
          const t = yearTotals(rows);
          return (
            <section key={year}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-fg">{year}</h3>
                <p className="text-sm tabular-nums text-fg-soft">
                  {t.hours.toFixed(2)} h · {money(t.amount, currency)}
                </p>
              </div>
              <p className="mt-0.5 text-sm tabular-nums text-fg-soft">
                Invoiced {money(t.invoiced, currency)} · paid {money(t.paid, currency)}
                {t.due > 0 && <span className="font-semibold text-amber-800"> · due {money(t.due, currency)}</span>}
              </p>
              <ul className="mt-3 space-y-2">
                {rows.map((r) => (
                  <li key={r.periodId} className="rounded-2xl border border-line bg-panel p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-fg">{r.label}</p>
                        <p className="text-sm tabular-nums text-fg-soft">
                          {r.number} · {r.hours.toFixed(2)} h
                        </p>
                      </div>
                      <p className="shrink-0 font-display text-lg font-bold tabular-nums text-fg">{money(r.total, currency)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusPill row={r} />
                      {r.paid?.amount != null && (
                        <span className="text-sm tabular-nums text-fg-soft">
                          received {money(r.paid.amount, r.paid.currency)}
                        </span>
                      )}
                      {r.paid?.note && <span className="text-sm text-fg-soft">{r.paid.note}</span>}
                    </div>
                    {marking === r.periodId ? (
                      <MarkPaidForm
                        client={client.id}
                        row={r}
                        guard={guard}
                        onDone={(inv, o) => {
                          onChange(inv, o);
                          setMarking(null);
                        }}
                        onCancel={() => setMarking(null)}
                      />
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.hours > 0 && r.status !== "sent" && (
                          <Button kind={r.status === "pending" ? "primary" : "ghost"} onClick={() => setSending(r)} disabled={busy}>
                            Send now…
                          </Button>
                        )}
                        {r.hours > 0 && r.status === "sent" && !r.paid && (
                          <Button kind="primary" onClick={() => setMarking(r.periodId)} disabled={busy}>
                            Mark paid
                          </Button>
                        )}
                        {r.paid && (
                          <Button kind="ghost" onClick={() => void unmark(r)} disabled={busy}>
                            Not paid after all
                          </Button>
                        )}
                        {r.hours > 0 && (
                          <>
                            <a
                              href={`/api/work/invoice?p=${r.periodId}${c}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[0.95rem] font-bold text-fg hover:bg-panel-alt"
                            >
                              View
                            </a>
                            <DownloadLink href={`/api/work/pdf?kind=invoice&p=${r.periodId}${c}`}>PDF</DownloadLink>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <DownloadLink href={`/api/work/pdf?kind=year&y=${year}${c}`}>Year statement {year} (PDF)</DownloadLink>
              </div>
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}

function MarkPaidForm({
  client,
  row,
  guard,
  onDone,
  onCancel,
}: {
  client: string;
  row: InvoiceRow;
  guard: Guard;
  onDone: (invoices: InvoiceRow[], owed: Owed) => void;
  onCancel: () => void;
}) {
  const [currency, setCurrency] = useState<Payment["currency"]>("USD");
  const [amount, setAmount] = useState(String(row.total));
  const [date, setDate] = useState(() => dateInput(Date.now()));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = (c: Payment["currency"]) => {
    setCurrency(c);
    // The CHF amount is whatever the bank sent; the USD one is the invoice.
    setAmount(c === "USD" ? String(row.total) : "");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const n = amount.trim() === "" ? null : Number(amount);
      if (n !== null && !Number.isFinite(n)) throw new Error("The amount has to be a number, or left empty.");
      const res = await guard(api.markPaid(client, row.periodId, { currency, amount: n, paidAt: date, note: note.trim() }));
      onDone(res.invoices, res.owed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-2xl border border-line bg-canvas p-3">
      <p className="text-sm font-bold text-fg">Paid in</p>
      <div className="grid grid-cols-2 gap-2">
        {(["USD", "CHF"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => pick(c)}
            className={`min-h-11 rounded-full border text-[0.95rem] font-bold transition ${currency === c ? "border-navy bg-navy text-fg-onSolid" : "border-line bg-panel text-fg hover:bg-panel-alt"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Amount received (${currency})`} hint={currency === "CHF" ? "What arrived, if you know it" : undefined}>
          <TextInput type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="optional" />
        </Field>
        <Field label="Date received">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
      </div>
      <Field label="Note (optional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. bank reference" />
      </Field>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex gap-2">
        <Button kind="primary" type="submit" disabled={busy} className="flex-1">
          {busy ? "Saving…" : `Mark ${row.number} paid`}
        </Button>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// The month's note for the client
// ---------------------------------------------------------------------------

export function SummarySheet({
  month,
  client,
  summary,
  guard,
  onSaved,
  onClose,
}: {
  month: string;
  client: Client;
  summary: Summary | undefined;
  guard: Guard;
  onSaved: (s: Record<string, Summary>) => void;
  onClose: () => void;
}) {
  const [delivered, setDelivered] = useState(summary?.delivered ?? "");
  const [next, setNext] = useState(summary?.next ?? "");
  const [decide, setDecide] = useState(summary?.decide ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await guard(api.saveSummary(client.id, month, { delivered, next, decide }));
      onSaved(res.summaries);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
      setBusy(false);
    }
  };

  return (
    <Sheet title={`${fmtMonth(month)} for ${client.name}`} onClose={onClose} locked={busy}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-[0.95rem] text-fg-soft">
          Three short lines at the top of {client.name}'s page for this month, so the board reads the month at a glance. Leave a line empty to hide it.
        </p>
        <Field label="Delivered" hint="What was finished this month.">
          <TextArea rows={3} value={delivered} onChange={(e) => setDelivered(e.target.value)} maxLength={400} placeholder="Directory page live; proposal revised with Beat's feedback" />
        </Field>
        <Field label="Next" hint="What comes next month.">
          <TextArea rows={2} value={next} onChange={(e) => setNext(e.target.value)} maxLength={400} placeholder="Workflow page and post type review" />
        </Field>
        <Field label="Needs your decision" hint={`What ${client.name} has to decide, so it doesn't wait.`}>
          <TextArea rows={2} value={decide} onChange={(e) => setDecide(e.target.value)} maxLength={400} placeholder="Which of the two logo colours for the print version" />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button kind="primary" type="submit" disabled={busy} className="flex-1">
            {busy ? "Saving…" : "Save"}
          </Button>
          {summary && (
            <Button
              kind="danger"
              disabled={busy}
              onClick={() => {
                setDelivered("");
                setNext("");
                setDecide("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Trash
// ---------------------------------------------------------------------------

export function TrashList({
  trash,
  guard,
  onRestored,
  onTrash,
}: {
  trash: Trashed[];
  guard: Guard;
  onRestored: (e: Entry) => void;
  onTrash: (t: Trashed[]) => void;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const act = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy("");
    }
  };
  if (!trash.length) return <p className="text-[0.95rem] text-fg-soft">Nothing deleted lately. Deleted entries wait here 90 days.</p>;
  return (
    <div className="space-y-2">
      <ErrorNote>{error}</ErrorNote>
      <ul className="space-y-2">
        {trash.map(({ entry: e, deletedAt }) => (
          <li key={e.id} className="rounded-2xl border border-line bg-panel p-3">
            <p className="font-bold text-fg">{e.task}</p>
            <p className="text-sm tabular-nums text-fg-soft">
              {fmtDay(e.start)} · {fmtTime(e.start)}–{fmtTime(e.end)} · {fmtHours(e.end - e.start)} h · deleted {fmtDate(deletedAt)}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                kind="primary"
                disabled={!!busy}
                onClick={() =>
                  void act(e.id, async () => {
                    const res = await guard(api.restore(e.id));
                    onRestored(res.entry);
                    onTrash(res.trash);
                  })
                }
              >
                {busy === e.id ? "Restoring…" : "Restore"}
              </Button>
              <Button
                kind="danger"
                disabled={!!busy}
                onClick={() =>
                  void act(e.id, async () => {
                    if (!window.confirm("Delete this entry for good? It can't be brought back after this.")) return;
                    const res = await guard(api.purge(e.id));
                    onTrash(res.trash);
                  })
                }
              >
                Delete for good
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A client: name, rate, billing details, where invoices go
// ---------------------------------------------------------------------------

export function ClientSheet({
  client,
  guard,
  onSaved,
  onClose,
}: {
  /** null: a new client. */
  client: Client | null;
  guard: Guard;
  onSaved: (clients: Client[], saved: Client) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(client?.name ?? "");
  const [short, setShort] = useState(client?.short ?? "");
  const [rate, setRate] = useState(client ? String(client.rate) : "");
  const [currency, setCurrency] = useState(client?.currency ?? "USD");
  const [billName, setBillName] = useState(client?.billTo.name ?? "");
  const [lines, setLines] = useState(client?.billTo.lines.join("\n") ?? "");
  const [phone, setPhone] = useState(client?.billTo.phone ?? "");
  const [email, setEmail] = useState(client?.billTo.email ?? "");
  const [web, setWeb] = useState(client?.billTo.web ?? "");
  const [invoiceTo, setInvoiceTo] = useState(client?.invoiceTo.join(", ") ?? "");
  const [auto, setAuto] = useState(client?.autoInvoice ?? true);
  const [archived, setArchived] = useState(client?.archived ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields: ClientFields = {
      name: name.trim(),
      short: (short.trim() || name).toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12),
      rate: Number(rate),
      currency: currency.trim().toUpperCase(),
      billTo: { name: billName.trim() || name.trim(), lines: lines.split("\n").map((l) => l.trim()).filter(Boolean), phone: phone.trim(), email: email.trim(), web: web.trim() },
      invoiceTo: invoiceTo.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean),
      autoInvoice: auto,
      archived,
    };
    try {
      const res = client ? await guard(api.saveClient(client.id, fields)) : await guard(api.addClient(fields));
      onSaved(res.clients, res.client);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
      setBusy(false);
    }
  };

  return (
    <Sheet title={client ? `${client.name}` : "New client"} onClose={onClose} locked={busy}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Client">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="e.g. Hope Church" />
          </Field>
          <Field label="Tag" hint="In invoice numbers">
            <TextInput value={short} onChange={(e) => setShort(e.target.value.toUpperCase())} maxLength={12} placeholder="HOPE" className="font-mono uppercase" />
          </Field>
        </div>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Hourly rate" hint={client ? "Changing it recalculates every total, past ones included." : undefined}>
            <TextInput type="number" inputMode="decimal" min="0.01" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} required />
          </Field>
          <Field label="Currency">
            <TextInput value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} required className="font-mono uppercase" />
          </Field>
        </div>
        <h3 className="pt-2 font-bold text-fg">On the invoice: bill to</h3>
        <Field label="Name on the invoice" hint="Empty: the client's name.">
          <TextInput value={billName} onChange={(e) => setBillName(e.target.value)} maxLength={120} placeholder={name || "e.g. Hope Church Trust"} />
        </Field>
        <Field label="Address" hint="One line per row.">
          <TextArea rows={3} value={lines} onChange={(e) => setLines(e.target.value)} placeholder={"Mattenstrasse 62\n3800 Matten – Switzerland"} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone (optional)">
            <TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
          </Field>
          <Field label="Website (optional)">
            <TextInput value={web} onChange={(e) => setWeb(e.target.value)} maxLength={120} placeholder="www.example.org" />
          </Field>
        </div>
        <Field label="Billing email (optional)" hint="Printed on the invoice.">
          <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
        </Field>
        <h3 className="pt-2 font-bold text-fg">Sending invoices</h3>
        <Field label="Email invoices to" hint="Comma-separated. Empty: invoices are made and saved but not emailed.">
          <TextInput value={invoiceTo} onChange={(e) => setInvoiceTo(e.target.value)} placeholder="finance@example.org, pastor@example.org" />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-navy" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span className="text-[0.95rem] text-fg">Email the month's invoice automatically the night the month ends</span>
        </label>
        {client && client.id !== "gcn" && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" className="h-5 w-5 accent-navy" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            <span className="text-[0.95rem] text-fg">Archived: hidden from the switcher, no more invoices (the hours and link stay)</span>
          </label>
        )}
        <ErrorNote>{error}</ErrorNote>
        <div className="flex gap-2 pt-1">
          <Button kind="primary" type="submit" disabled={busy} className="flex-1">
            {busy ? "Saving…" : client ? "Save client" : "Add client"}
          </Button>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/**
 * Send one invoice now, after a look at it: who it goes to, what's on it,
 * and the invoice itself in a new tab. For a client whose month shouldn't
 * wait for the cron, or one that doesn't send automatically.
 */
function SendPanel({ client, row, guard, onCancel, onSent }: { client: Client; row: InvoiceRow; guard: Guard; onCancel: () => void; onSent: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const to = client.invoiceTo.length ? client.invoiceTo : client.id === "gcn" ? ["bb@gcn.live"] : [];
  const open = row.status === "open";
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await guard(api.emailInvoice(client.id, row.periodId));
      setDone(`Sent ${res.sent} to ${res.to.join(", ")}.`);
      window.setTimeout(() => void onSent(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send it.");
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <Button onClick={onCancel} disabled={busy}>
        ‹ All invoices
      </Button>
      <div className="rounded-2xl border border-line bg-canvas p-4">
        <p className="text-sm font-bold text-fg-soft">Invoice {row.number}</p>
        <p className="mt-1 font-display text-2xl font-bold tabular-nums text-fg">{money(row.total, row.currency)}</p>
        <p className="text-[0.95rem] tabular-nums text-fg-soft">
          {row.label} · {row.hours.toFixed(2)} h at {money(client.rate, client.currency)}/h
        </p>
        <dl className="mt-3 space-y-1 text-[0.95rem]">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 font-bold text-fg-soft">To</dt>
            <dd className="min-w-0 break-words text-fg">{to.length ? to.join(", ") : "No invoice email: add one under the client's details first."}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 font-bold text-fg-soft">Copy</dt>
            <dd className="text-fg">you, with replies coming to you</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 font-bold text-fg-soft">With</dt>
            <dd className="text-fg">the invoice as the email and as a PDF</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/work/invoice?p=${row.periodId}&c=${encodeURIComponent(client.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[0.95rem] font-bold text-fg hover:bg-panel-alt"
        >
          Preview the invoice
        </a>
        <DownloadLink href={`/api/work/pdf?kind=invoice&p=${row.periodId}&c=${encodeURIComponent(client.id)}`}>Preview PDF</DownloadLink>
      </div>
      {open && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[0.95rem] text-amber-900">
          {row.label} isn't over yet. Sending now closes this invoice with the hours logged so far; anything logged later this month won't be billed on it.
        </p>
      )}
      <p className="text-[0.95rem] text-fg-soft">Once sent it's saved as sent and never changes, and the automatic send skips it.</p>
      <ErrorNote>{error}</ErrorNote>
      {done && <p className="text-[0.95rem] font-semibold text-accent-deep">{done}</p>}
      <div className="flex gap-2">
        <Button kind="primary" onClick={() => void send()} disabled={busy || !to.length || !!done} className="flex-1">
          {busy ? "Sending…" : `Send ${row.number}`}
        </Button>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
