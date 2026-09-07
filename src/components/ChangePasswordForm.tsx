"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ActionButton, Field, inputCls, useActionState } from "@/components/ui";
import { postJSON } from "@/lib/utils";

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/** Password input with a show/hide eye toggle. */
export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}) {
  const [hidden, setHidden] = useState(true);
  return (
    <div className="relative">
      <input
        type={hidden ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={`${className ?? inputCls} pr-11`}
      />
      <button
        type="button"
        onClick={() => setHidden((h) => !h)}
        tabIndex={-1}
        title={hidden ? "Show password" : "Hide password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <EyeIcon hidden={hidden} />
      </button>
    </div>
  );
}

function strength(pw: string): { score: number; label: string; tone: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", tone: "bg-rose-500" };
  if (score <= 3) return { score, label: "Fair", tone: "bg-amber-500" };
  return { score, label: "Strong", tone: "bg-emerald-500" };
}

export default function ChangePasswordForm({ redirectTo }: { redirectTo?: string }) {
  const { refresh } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { loading, done, run } = useActionState();

  const s = strength(next);
  const mismatch = confirm.length > 0 && next !== confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 6) return setError("New password must be at least 6 characters.");
    if (next !== confirm) return setError("New password and confirmation do not match.");
    try {
      await run(async () => {
        try {
          await postJSON("/api/auth/change-password", {
            currentPassword: current,
            newPassword: next,
            confirmPassword: confirm,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to change password.");
          throw err;
        }
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      refresh();
      if (redirectTo) {
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 1200);
      }
    } catch {
      /* error already shown */
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold text-slate-900">🔐 Set a new password</h2>
      <p className="mt-1 text-xs text-slate-500">Use at least 6 characters. Mixing letters, numbers and symbols makes it stronger.</p>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4">
        <Field label="Current Password" required>
          <PasswordInput value={current} onChange={setCurrent} placeholder="Enter current password" autoComplete="current-password" />
        </Field>
        <Field label="New Password" required>
          <PasswordInput value={next} onChange={setNext} placeholder="Enter new password" autoComplete="new-password" />
          {next.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i < s.score ? s.tone : "bg-slate-200"}`} />
                ))}
              </div>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">Strength: {s.label}</p>
            </div>
          )}
        </Field>
        <Field label="Confirm New Password" required>
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Re-enter new password" autoComplete="new-password" />
          {mismatch && <p className="mt-1 text-[11px] font-semibold text-rose-600">Passwords do not match.</p>}
        </Field>
      </div>

      <div className="mt-6 flex justify-end">
        <ActionButton type="submit" loading={loading} done={done} doneText="Password changed!" disabled={mismatch}>
          💾 Save New Password
        </ActionButton>
      </div>
    </form>
  );
}
