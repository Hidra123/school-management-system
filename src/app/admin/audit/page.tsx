"use client";

import AppShell from "@/components/AppShell";
import { Badge, EmptyState, Loader, PageHeader, StatCard } from "@/components/ui";
import { useFetch } from "@/lib/utils";

type AuditEvent = {
  id: number;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actorName: string | null;
  actorUsername: string | null;
  targetName: string | null;
  targetUsername: string | null;
};

export default function AuditTrailPage() {
  const { data, loading, error, refresh } = useFetch<AuditEvent[]>("/api/admin/audit?limit=200");
  return (
    <AppShell>
      <PageHeader icon="=" title="Audit Trail" subtitle="Review authentication and user-control events">
        <button onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50">Refresh</button>
      </PageHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon="=" label="Total events" value={data?.length ?? 0} sub="Loaded audit records" tone="violet" />
        <StatCard icon=">" label="Authentication" value={(data ?? []).filter((event) => event.action.startsWith("auth.")).length} sub="Login and logout events" tone="blue" />
        <StatCard icon="#" label="Account control" value={(data ?? []).filter((event) => !event.action.startsWith("auth.")).length} sub="Administrative actions" tone="amber" />
      </div>
      {loading ? <Loader /> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-white px-5 py-4"><div><h2 className="font-bold text-slate-900">Security event log</h2><p className="text-xs text-slate-500">A complete record of recent user-control activity.</p></div><Badge tone="violet">Latest 200</Badge></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Time</th><th className="p-4">Action</th><th className="p-4">Actor</th><th className="p-4">Target</th><th className="p-4">IP address</th><th className="p-4">Details</th></tr></thead>
            <tbody>{(data ?? []).map((event) => <tr key={event.id} className="border-t border-slate-100"><td className="whitespace-nowrap p-4 text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</td><td className="p-4"><Badge tone={event.action.startsWith("auth.") ? "blue" : "violet"}>{event.action}</Badge></td><td className="p-4 text-slate-600">{event.actorName ?? "System"}<span className="block text-xs text-slate-400">{event.actorUsername ? `@${event.actorUsername}` : ""}</span></td><td className="p-4 text-slate-600">{event.targetName ?? "-"}<span className="block text-xs text-slate-400">{event.targetUsername ? `@${event.targetUsername}` : ""}</span></td><td className="p-4 text-xs text-slate-500">{event.ipAddress ?? "-"}</td><td className="max-w-[260px] p-4 text-xs text-slate-500">{event.details ? JSON.stringify(event.details) : "-"}</td></tr>)}</tbody>
          </table></div>
          {(data ?? []).length === 0 && <EmptyState icon="=" title="No audit events" message="System activity will appear here as users sign in and make changes." />}
        </div>
      )}
    </AppShell>
  );
}
