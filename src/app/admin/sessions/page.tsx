"use client";

import AppShell from "@/components/AppShell";
import { Avatar, Badge, EmptyState, Loader, PageHeader, StatCard } from "@/components/ui";
import { useFetch } from "@/lib/utils";
import { useState } from "react";

type Session = {
  id: number;
  userId: number;
  name: string;
  username: string;
  role: "admin" | "member";
  staffRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

export default function LiveSessionsPage() {
  const { data, loading, error, refresh } = useFetch<Session[]>("/api/admin/sessions");
  const [busy, setBusy] = useState<number | null>(null);
  async function revoke(session: Session) {
    if (!window.confirm(`Sign out ${session.name} from this device?`)) return;
    setBusy(session.id);
    try {
      const response = await fetch("/api/admin/sessions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.id }) });
      if (!response.ok) throw new Error("Failed to revoke session.");
    } catch {
      // Refresh keeps the displayed list authoritative after a failed request.
    } finally {
      setBusy(null);
      refresh();
    }
  }
  return (
    <AppShell>
      <PageHeader icon=">" title="Live Sessions" subtitle="View and revoke active browser sessions">
        <button onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50">Refresh</button>
      </PageHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon="*" label="Online now" value={data?.length ?? 0} sub="Recent browser activity" tone="emerald" />
        <StatCard icon="~" label="Heartbeat window" value="5 min" sub="Online status refresh" tone="blue" />
        <StatCard icon="#" label="Protected devices" value={new Set((data ?? []).map((session) => session.userId)).size} sub="Unique signed-in users" tone="violet" />
      </div>
      {loading ? <Loader /> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white px-5 py-4"><h2 className="font-bold text-slate-900">Connected devices</h2><p className="text-xs text-slate-500">Revoke access instantly when a device is unfamiliar.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Account</th><th className="p-4">Device / IP</th><th className="p-4">Last seen</th><th className="p-4">Status</th><th className="p-4" /></tr></thead>
            <tbody>{(data ?? []).map((session) => <tr key={session.id} className="border-t border-slate-100"><td className="p-4"><div className="flex items-center gap-3"><Avatar name={session.name} tone="emerald" /><div><p className="font-bold text-slate-800">{session.name}</p><p className="text-xs text-slate-500">@{session.username} - {session.role}</p></div></div></td><td className="max-w-[280px] p-4 text-xs text-slate-500"><p>{session.ipAddress ?? "Unknown IP"}</p><p className="truncate" title={session.userAgent ?? ""}>{session.userAgent ?? "Unknown device"}</p></td><td className="p-4 text-xs text-slate-500">{new Date(session.lastSeenAt).toLocaleString()}</td><td className="p-4"><Badge tone="emerald">Online</Badge></td><td className="p-4 text-right"><button disabled={busy === session.id} onClick={() => revoke(session)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50">{busy === session.id ? "Signing out..." : "Sign out"}</button></td></tr>)}</tbody>
          </table></div>
          {(data ?? []).length === 0 && <EmptyState icon="-" title="No active sessions" message="Signed-in browsers will appear here automatically." />}
        </div>
      )}
    </AppShell>
  );
}
