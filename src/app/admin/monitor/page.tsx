"use client";

import { useMemo, useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { Badge, EmptyState, Loader, PageHeader, btnPrimary, inputCls } from "@/components/ui";
import { cls, postJSON, putJSON, useFetch } from "@/lib/utils";
import { staffRoleLabel } from "@/lib/permissions";

type MemberRow = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: "admin" | "member";
  active: boolean;
  staffRole: string | null;
  permissions: string[];
};

type LockState = { allAccountsLocked: boolean; lockMessage: string };

export default function MonitorDashboardsPage() {
  const lockFetch = useFetch<LockState>("/api/admin/system-lock");
  const membersFetch = useFetch<MemberRow[]>("/api/admin/members");
  const [lockDraft, setLockDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const locked = lockFetch.data?.allAccountsLocked ?? false;
  const members = useMemo(() => (membersFetch.data ?? []).filter((m) => m.role === "member"), [membersFetch.data]);
  const shown = useMemo(() => members.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.username.includes(q)), [members, q]);

  useEffect(() => {
    if (lockFetch.data) setLockDraft(lockFetch.data.lockMessage);
  }, [lockFetch.data]);

  async function saveLock(next: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await putJSON<LockState>("/api/admin/system-lock", {
        allAccountsLocked: next,
        lockMessage: lockDraft.trim(),
      });
      setMsg(next ? "🔒 All member accounts are now LOCKED." : "🔓 All member accounts are ACTIVE again.");
      lockFetch.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(m: MemberRow) {
    const target = !m.active;
    if (!window.confirm(target ? `Unlock ${m.name}'s account?` : `Lock ${m.name} out of the system?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      await putJSON(`/api/admin/members/${m.id}`, { active: target });
      setMsg(target ? `🔓 ${m.name} is unlocked.` : `🔒 ${m.name} is locked.`);
      membersFetch.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to update account.");
    } finally {
      setBusy(false);
    }
  }

  if (lockFetch.loading || membersFetch.loading) {
    return (
      <AppShell>
        <Loader label="Loading monitor..." />
      </AppShell>
    );
  }
  if (lockFetch.error || membersFetch.error) {
    return (
      <AppShell>
        <EmptyState icon="⚠️" title="Could not load" message={lockFetch.error ?? membersFetch.error ?? "Unknown error"} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader icon="📡" title="Monitor Dashboards" subtitle="Control whether member accounts can access the system" />

      {msg && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">{msg}</p>}

      {/* Global switch */}
      <section className={cls("mb-6 overflow-hidden rounded-2xl border shadow-sm", locked ? "border-rose-200 bg-rose-50/60" : "border-emerald-200 bg-emerald-50/60")}>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className={cls("grid h-12 w-12 place-items-center rounded-2xl text-2xl", locked ? "bg-rose-600" : "bg-emerald-600", "text-white")}>
              {locked ? "🔒" : "🔓"}
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900">
                System Status: {locked ? "ALL ACCOUNTS LOCKED" : "OPERATIONAL"}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {locked ? "Every member is blocked from signing in or using the app. Admins are never locked." : "Members can sign in and work normally. Admins are never locked."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={lockDraft}
              onChange={(e) => setLockDraft(e.target.value)}
              placeholder="Lock message shown to members (optional)…"
              className={cls(inputCls, "w-72")}
            />
            {locked ? (
              <button onClick={() => saveLock(false)} disabled={busy} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                🔓 Unlock All Accounts
              </button>
            ) : (
              <button onClick={() => saveLock(true)} disabled={busy} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50">
                🔒 Lock All Accounts
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Per-account switches */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <p className="text-sm font-bold text-slate-900">👥 Member Accounts ({members.length})</p>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or check number…" className={cls(inputCls, "w-64")} />
        </div>
        {shown.length === 0 ? (
          <EmptyState icon="👥" title="No members found" message="Try a different search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold">Staff Member</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">Check Number</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-bold">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((m) => (
                  <tr key={m.id} className={cls("odd:bg-white even:bg-slate-50/60", !m.active && "bg-rose-50/40")}>
                    <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{m.username}</td>
                    <td className="px-4 py-3 text-slate-600">{staffRoleLabel(m.staffRole) ?? "Staff"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={m.active ? "emerald" : "rose"}>{m.active ? "active" : "locked"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleActive(m)}
                        disabled={busy}
                        className={cls(
                          "rounded-lg px-3.5 py-1.5 text-xs font-bold text-white transition disabled:opacity-40",
                          m.active ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700",
                        )}
                      >
                        {m.active ? "🔒 Lock" : "🔓 Unlock"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
