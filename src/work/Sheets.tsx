/**
 * The owner's extra panels: the invoice list (with Mark paid), the month's
 * note for the client, and the trash. Each is small enough to live here
 * rather than crowd Owner.tsx.
 */
import { useMemo, useState, type FormEvent } from "react";
import { api, type Entry, type InvoiceRow, type Owed, type Payment, type Summary, type Trashed } from "./api";
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
  invoices,
  owed,
  guard,
  onChange,
  onClose,
}: {
  invoices: InvoiceRow[];
  owed: Owed;
  guard: Guard;
  onChange: (invoices: InvoiceRow[], owed: Owed) => void;
  onClose: () => void;
}) {
  const [marking, setMarking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const years = useMemo(() => byYear(invoices), [invoices]);
  const currency = invoices[0]?.currency ?? "USD";

  const unmark = async (r: InvoiceRow) => {
    if (!window.confirm(`Mark ${r.number} as not paid after all?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await guard(api.unmarkPaid(r.periodId));
      onChange(res.invoices, res.owed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Invoices" onClose={onClose} locked={busy}>
      <div className="space-y-5">
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
                        {r.hours > 0 && r.status !== "open" && !r.paid && (
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
                              href={`/api/work/invoice?p=${r.periodId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[0.95rem] font-bold text-fg hover:bg-panel-alt"
                            >
                              View
                            </a>
                            <DownloadLink href={`/api/work/pdf?kind=invoice&p=${r.periodId}`}>PDF</DownloadLink>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <DownloadLink href={`/api/work/pdf?kind=year&y=${year}`}>Year statement {year} (PDF)</DownloadLink>
              </div>
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}

function MarkPaidForm({
  row,
  guard,
  onDone,
  onCancel,
}: {
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
      const res = await guard(api.markPaid(row.periodId, { currency, amount: n, paidAt: date, note: note.trim() }));
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
  client: string;
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
      const res = await guard(api.saveSummary(month, { delivered, next, decide }));
      onSaved(res.summaries);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that.");
      setBusy(false);
    }
  };

  return (
    <Sheet title={`${fmtMonth(month)} for ${client}`} onClose={onClose} locked={busy}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-[0.95rem] text-fg-soft">
          Three short lines at the top of {client}'s page for this month, so the board reads the month at a glance. Leave a line empty to hide it.
        </p>
        <Field label="Delivered" hint="What was finished this month.">
          <TextArea rows={3} value={delivered} onChange={(e) => setDelivered(e.target.value)} maxLength={400} placeholder="Directory page live; proposal revised with Beat's feedback" />
        </Field>
        <Field label="Next" hint="What comes next month.">
          <TextArea rows={2} value={next} onChange={(e) => setNext(e.target.value)} maxLength={400} placeholder="Workflow page and post type review" />
        </Field>
        <Field label="Needs your decision" hint={`What ${client} has to decide, so it doesn't wait.`}>
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
