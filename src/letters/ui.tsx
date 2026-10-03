/** The desk's small building blocks, in the letters' warm paper style. */
import type { ReactNode } from "react";

export const INK = "#2b1a14";
export const SOFT = "#6b5f55";
export const ACCENT = "#8a6a2e";
export const PAPER = "#f6f3ee";
export const GOOD = "#3b6b35";
export const SERIF = "Georgia, 'Times New Roman', serif";

export const inputCls =
  "w-full min-h-11 rounded-xl border border-[#ddd5c7] bg-[#faf8f4] px-3 py-2 text-base text-[#2b2420] placeholder:text-[#a49a8f] focus:border-[#8a6a2e] focus:outline-none focus:ring-2 focus:ring-[#8a6a2e]/20";

export function Box({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(43,26,20,.05),0_10px_30px_-20px_rgba(43,26,20,.3)] sm:p-6 ${className}`}>{children}</section>;
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost" | "danger" | "whatsapp" | "messenger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  href?: string;
};

export function Btn({ children, onClick, kind = "ghost", disabled, type = "button", className = "", href }: BtnProps) {
  const look = {
    primary: "text-white hover:opacity-90",
    ghost: "border border-[#ddd5c7] bg-white hover:bg-[#faf8f4]",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    whatsapp: "text-white hover:opacity-90",
    messenger: "text-white hover:opacity-90",
  }[kind];
  const style = kind === "primary" ? { background: INK } : kind === "whatsapp" ? { background: "#1f8a4c" } : kind === "messenger" ? { background: "#0866ff" } : kind === "ghost" ? { color: INK } : undefined;
  const cls = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[0.95rem] font-bold transition disabled:opacity-50 ${look} ${className}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} style={style}>
      {children}
    </button>
  );
}

export function Label({ text, hint, children }: { text: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold" style={{ color: INK }}>
        {text}
      </span>
      {children}
      {hint && <span className="mt-1 block text-sm" style={{ color: SOFT }}>{hint}</span>}
    </label>
  );
}

export function Err({ children }: { children: string }) {
  return children ? <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p> : null;
}

export function Note({ children }: { children: ReactNode }) {
  return children ? <p className="text-sm font-semibold" style={{ color: GOOD }}>{children}</p> : null;
}

/** A checkbox row with a 44px target. */
export function Check({ checked, onChange, children, disabled }: { checked: boolean; onChange: (on: boolean) => void; children: ReactNode; disabled?: boolean }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[#faf8f4] ${disabled ? "opacity-50" : ""}`}>
      <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#2b1a14]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

export function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "good" | "warn" | "off" }) {
  const c = { plain: ["#efe9df", SOFT], good: ["#e3eedf", GOOD], warn: ["#fdf0dc", "#8a5a0e"], off: ["#f3e3e1", "#9b3a2e"] }[tone];
  return (
    <span className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider" style={{ background: c[0], color: c[1] }}>
      {children}
    </span>
  );
}

/** How a partner can be reached: small tags. */
export function Reach({ email, whatsapp, messenger = "" }: { email: string; whatsapp: string; messenger?: string }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {email && <Tag>Email</Tag>}
      {whatsapp && <Tag>WhatsApp</Tag>}
      {messenger && <Tag>Messenger</Tag>}
    </span>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-[#f2ede4] px-1.5 py-0.5 text-[0.72rem] font-semibold" style={{ color: SOFT }}>{children}</span>;
}

export function Bar({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold" style={{ color: INK }}>{label}</span>
        <span className="tabular-nums" style={{ color: SOFT }}>{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#efe9df]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: ACCENT }} />
      </div>
    </div>
  );
}
