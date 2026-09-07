"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cls } from "@/lib/utils";

/* ---------- Input classes & buttons ---------- */
export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60";

/* ---------- Badge ---------- */
type Tone = "emerald" | "amber" | "red" | "blue" | "slate" | "indigo" | "violet" | "rose";

const tones: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cls(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function scoreTone(score: number): Tone {
  if (score >= 80) return "emerald";
  if (score >= 65) return "blue";
  if (score >= 50) return "amber";
  return "rose";
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cls(
          "my-8 w-full rounded-2xl bg-white shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Field ---------- */
export function Field({
  label,
  required = false,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cls("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

/* ---------- PageHeader ---------- */
export function PageHeader({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600/10 text-2xl">
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/* ---------- StatCard ---------- */
export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "indigo",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  const bubble: Record<Tone, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    rose: "bg-rose-100 text-rose-700",
    blue: "bg-sky-100 text-sky-700",
    slate: "bg-slate-200 text-slate-600",
    indigo: "bg-indigo-100 text-indigo-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1.5 truncate text-2xl font-extrabold text-slate-900">{value}</p>
          {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
        </div>
        <div className={cls("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl", bubble[tone])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, message }: { icon: ReactNode; title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 text-base font-bold text-slate-800">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, tone = "indigo" }: { name: string; tone?: Tone }) {
  const bubble: Record<Tone, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    rose: "bg-rose-100 text-rose-700",
    blue: "bg-sky-100 text-sky-700",
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-100 text-indigo-700",
    violet: "bg-violet-100 text-violet-700",
  };
  const nm = name || "?";
  return (
    <div className={cls("grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold", bubble[tone])}>
      {nm
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")}
    </div>
  );
}

/* ---------- Loader ---------- */
export function Loader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-10 text-sm text-slate-500">
      <Spinner size={20} />
      {label}
    </div>
  );
}

/* ---------- Spinner ---------- */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg className={cls("animate-spin", className)} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ---------- Checkmark (animated) ---------- */
export function Checkmark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-[scaleIn_0.3s_ease-out]">
      <circle cx="12" cy="12" r="10" fill="currentColor" className="opacity-20" />
      <path d="M8 12.5l2.5 2.5 5.5-5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-[drawCheck_0.4s_ease-out_0.1s_both]" />
    </svg>
  );
}

/* ---------- ActionButton (Spinner + Success) ---------- */
export type ActionBtnVariant = "primary" | "ghost" | "danger" | "success" | "warning";

const variantStyles: Record<ActionBtnVariant, { base: string; loading: string; done: string }> = {
  primary: {
    base: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-300",
    loading: "bg-indigo-500 text-white",
    done: "bg-emerald-500 text-white",
  },
  ghost: {
    base: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-indigo-100",
    loading: "border border-slate-200 bg-slate-50 text-slate-500",
    done: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  danger: {
    base: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-300",
    loading: "bg-rose-500 text-white",
    done: "bg-emerald-500 text-white",
  },
  success: {
    base: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300",
    loading: "bg-emerald-500 text-white",
    done: "bg-emerald-500 text-white",
  },
  warning: {
    base: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-300",
    loading: "bg-amber-400 text-white",
    done: "bg-emerald-500 text-white",
  },
};

export function ActionButton({
  children,
  variant = "primary",
  loading = false,
  done = false,
  doneText = "Done!",
  onClick,
  type = "button",
  disabled = false,
  className,
  fullWidth = false,
}: {
  children: ReactNode;
  variant?: ActionBtnVariant;
  loading?: boolean;
  done?: boolean;
  doneText?: string;
  onClick?: (e: React.MouseEvent) => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}) {
  const styles = variantStyles[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading || done}
      className={cls(
        "relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed",
        done ? styles.done : loading ? styles.loading : styles.base,
        (loading || done) && "pointer-events-none",
        fullWidth && "w-full",
        className,
      )}
    >
      {loading ? (
        <>
          <Spinner size={16} className={variant === "ghost" ? "text-slate-500" : "text-white"} />
          <span className="animate-pulse">Please wait...</span>
        </>
      ) : done ? (
        <>
          <Checkmark size={18} />
          <span>{doneText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

/* ---------- useActionState (helper hook) ---------- */
export function useActionState() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    setDone(false);
    try {
      await fn();
      setLoading(false);
      setDone(true);
      timerRef.current = setTimeout(() => setDone(false), 2000);
    } catch {
      setLoading(false);
      setDone(false);
      throw new Error("Action failed");
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setDone(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { loading, done, run, reset };
}
