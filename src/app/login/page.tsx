"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { btnPrimary, inputCls } from "@/components/ui";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      window.location.href = "/";
    }
  }, [authLoading, user]);

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
      window.location.href = "/";
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
          <h2 className="mb-6 text-xl font-bold text-white">Sign in to your account</h2>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-500/20 px-4 py-3 text-sm font-semibold text-rose-300 ring-1 ring-inset ring-rose-400/30">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-indigo-200">Check Number</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your check number"
                required
                autoComplete="username"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-indigo-200">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={inputCls}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={`${btnPrimary} mt-6 w-full`}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
