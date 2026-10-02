/**
 * The pieces both screens share: the month view of the log, its totals, and
 * the small form controls. Phone first: every control is at least 44px tall,
 * text never drops below 15px where it is read, and nothing scrolls sideways.
 */
import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import type { Entry, Settings } from "./api";
import { notePoints } from "./notes";
import { dayKey, fmtDay, fmtHours, fmtMoney, fmtMonth, fmtTime, monthKey, shiftMonth } from "./time";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card border border-line bg-panel p-4 shadow-card sm:p-5 ${className}`}>{children}</section>;
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "accent" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
};

export function Button({ children, onClick, kind = "ghost", type = "button", disabled, className = "" }: BtnProps) {
  const look = {
    primary: "bg-navy text-fg-onSolid hover:bg-navy-hover",
    accent: "bg-accent text-accent-ink hover:bg-accent-hover",
    ghost: "border border-line bg-panel text-fg hover:bg-panel-alt",
    danger: "border border-red-300 bg-panel text-red-700 hover:bg-red-50",
  }[kind];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[0.95rem] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`}
    >
      {children}
    </button>
  );
}

const inputCls =
  "w-full min-h-11 rounded-xl border border-line bg-canvas px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-fg">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-fg-soft">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputCls} resize-y ${props.className ?? ""}`} />;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[0.95rem] text-red-800">
      {children}
    </p>
  );
}

/** A panel that rises from the bottom on a phone and sits centred on a desktop. */
export function Sheet({ title, onClose, locked = false, children }: { title: string; onClose: () => void; locked?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Kept in a ref so a parent re-render never re-runs the focus effect below,
  // and a save in flight can't be closed out from under its error message.
  const close = useRef(onClose);
  const lock = useRef(locked);
  useEffect(() => {
    close.current = onClose;
    lock.current = locked;
  });
  const tryClose = () => {
    if (!lock.current) close.current();
  };
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lock.current) close.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={tryClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-solid sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-fg">{title}</h2>
          <button type="button" onClick={tryClose} disabled={locked} className="grid h-11 w-11 place-items-center rounded-full text-2xl text-fg-soft hover:bg-panel-alt" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const sum = (list: Entry[]) => list.reduce((n, e) => n + (e.end - e.start), 0);

/** Hours and amount for a stretch of time, side by side. */
/** A pill-shaped link to a file the server sends as a download. */
export function DownloadLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      download
      className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[0.95rem] font-bold text-fg hover:bg-panel-alt"
    >
      {children}
    </a>
  );
}

export function TotalTile({ label, ms, settings }: { label: string; ms: number; settings: Settings }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-panel px-4 py-3">
      <p className="text-sm font-bold text-fg-soft">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-fg">
        {fmtHours(ms)} <span className="text-base font-bold text-fg-soft">h</span>
      </p>
      <p className="text-[0.95rem] font-semibold tabular-nums text-accent-deep">{fmtMoney(ms, settings.rate, settings.currency)}</p>
    </div>
  );
}

/**
 * One month of the log, newest day first, with a month switcher and the
 * month's total. `onEdit` makes each entry tappable; without it the list is
 * read-only, which is how the client sees it.
 */
export function MonthLog({
  entries,
  settings,
  month,
  setMonth,
  onEdit,
  emptyText,
  current,
}: {
  entries: Entry[];
  settings: Settings;
  month: string;
  /** This month, from the server's clock; the switcher stops there. */
  current: string;
  setMonth: (m: string) => void;
  onEdit?: (e: Entry) => void;
  emptyText: string;
}) {
  const inMonth = useMemo(() => entries.filter((e) => monthKey(e.start) === month), [entries, month]);
  const days = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of [...inMonth].sort((a, b) => b.start - a.start)) {
      const k = dayKey(e.start);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [inMonth]);
  const total = sum(inMonth);
  const months = useMemo(() => new Set(entries.map((e) => monthKey(e.start))), [entries]);
  const earliest = entries.length ? monthKey(Math.min(...entries.map((e) => e.start))) : month;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={month <= earliest}
          className="grid h-11 w-11 place-items-center rounded-full border border-line bg-panel text-xl text-fg disabled:opacity-30"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="min-w-0 text-center">
          <h2 className="font-display text-lg font-bold text-fg">{fmtMonth(month)}</h2>
          <p className="text-[0.95rem] tabular-nums text-fg-soft">
            {fmtHours(total)} h · <span className="font-semibold text-accent-deep">{fmtMoney(total, settings.rate, settings.currency)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= current}
          className="grid h-11 w-11 place-items-center rounded-full border border-line bg-panel text-xl text-fg disabled:opacity-30"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {days.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-6 text-center text-[0.95rem] text-fg-soft">
          {months.size ? "No hours logged this month." : emptyText}
        </p>
      ) : (
        <ol className="mt-4 space-y-4">
          {days.map(([key, list]) => (
            <li key={key}>
              <div className="mb-1.5 flex items-baseline justify-between px-1">
                <h3 className="text-[0.95rem] font-bold text-fg">{fmtDay(list[0].start)}</h3>
                <span className="text-sm font-semibold tabular-nums text-fg-soft">{fmtHours(sum(list))} h</span>
              </div>
              <ul className="space-y-2">
                {list.map((e) => (
                  <li key={e.id}>
                    <EntryCard entry={e} onEdit={onEdit} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** How many points show before "Show all". */
const FOLD = 3;

function EntryCard({ entry: e, onEdit }: { entry: Entry; onEdit?: (e: Entry) => void }) {
  const [open, setOpen] = useState(false);
  const overnight = dayKey(e.start) !== dayKey(e.end);
  const points = useMemo(() => notePoints(e.notes), [e.notes]);
  const shown = open ? points : points.slice(0, FOLD);
  const head = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words text-[0.98rem] font-bold leading-snug text-fg">{e.task}</p>
        <span className="shrink-0 rounded-full bg-panel-alt px-2.5 py-0.5 text-sm font-bold tabular-nums text-fg">{fmtHours(e.end - e.start)} h</span>
      </div>
      <p className="mt-0.5 text-sm tabular-nums text-fg-soft">
        {fmtTime(e.start)}–{fmtTime(e.end)}
        {overnight && " (next day)"}
        {onEdit && <span className="ml-2 font-semibold text-accent-deep">Edit</span>}
      </p>
    </>
  );
  return (
    <div className="rounded-2xl border border-line bg-panel">
      {onEdit ? (
        <button type="button" onClick={() => onEdit(e)} className="block w-full rounded-t-2xl px-4 pb-2 pt-3 text-left hover:bg-panel-alt" aria-label={`Edit: ${e.task}`}>
          {head}
        </button>
      ) : (
        <div className="px-4 pb-2 pt-3">{head}</div>
      )}
      {points.length > 0 && (
        <div className="border-t border-line px-4 py-2.5">
          <ul className="space-y-1.5">
            {shown.map((p, i) => (
              <li key={i} className="flex gap-2 text-[0.93rem] leading-relaxed text-fg-soft">
                <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span className="min-w-0 break-words">{p}</span>
              </li>
            ))}
          </ul>
          {points.length > FOLD && (
            <button type="button" onClick={() => setOpen(!open)} className="mt-1.5 text-sm font-semibold text-accent-deep hover:underline">
              {open ? "Show less" : `Show all ${points.length} points`}
            </button>
          )}
        </div>
      )}
      {e.link && (
        <a
          href={e.link}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="block break-all border-t border-line px-4 py-2.5 text-sm font-semibold text-accent-deep underline-offset-2 hover:underline"
        >
          {e.link.replace(/^https?:\/\//, "")}
        </a>
      )}
    </div>
  );
}
