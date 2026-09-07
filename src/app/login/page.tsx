"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PasswordInput } from "@/components/ChangePasswordForm";
import { Spinner, inputCls } from "@/components/ui";
import { cls } from "@/lib/utils";

type Mode = "staff" | "admin";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("staff");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      window.location.href = user.role === "admin" ? "/admin" : user.mustChangePassword ? "/profile" : "/";
    }
  }, [authLoading, user]);

  const isAdmin = mode === "admin";
  const idLabel = isAdmin ? "Username" : "Check Number";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      // One form works for both roles — route based on the account that signed in
      if (data.role === "admin") {
        window.location.href = "/admin";
      } else if (data.mustChangePassword) {
        window.location.href = "/profile";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl text-white shadow-lg">
            🎓
          </div>
          <h1 className="text-3xl font-extrabold text-white">ShuleHub</h1>
          <p className="mt-1 text-sm text-indigo-300">School Management System</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur"
        >
          {/* Role toggle */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
            {(["staff", "admin"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={cls(
                  "rounded-lg px-3 py-2 text-sm font-bold transition",
                  mode === m ? "bg-indigo-500 text-white shadow" : "text-indigo-200/80 hover:text-white",
                )}
              >
                {m === "staff" ? "👨‍🏫 Staff Login" : "🛡️ Admin Login"}
              </button>
            ))}
          </div>

          <h2 className="mb-1 text-xl font-bold text-white">
            {isAdmin ? "Administrator sign in" : "Sign in to your account"}
          </h2>
          <p className="mb-6 text-xs text-indigo-300/80">
            {isAdmin
              ? "Use your admin username and password."
              : "Use the check number and password given to you by the admin."}
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-500/20 px-4 py-3 text-sm font-semibold text-rose-300 ring-1 ring-inset ring-rose-400/30">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-indigo-200">{idLabel}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isAdmin ? "Enter your username" : "Enter your check number"}
                required
                autoComplete="username"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-indigo-200">Password</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (<><Spinner size={16} className="text-white" /> Signing in...</>) : "Sign In"}
          </button>

          {!isAdmin && (
            <p className="mt-4 text-center text-[11px] text-indigo-300/70">
              First time? Sign in with the default password and you will be asked to set your own.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
