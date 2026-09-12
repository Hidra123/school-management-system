"use client";

import AppShell from "@/components/AppShell";
import { Badge, Loader, PageHeader } from "@/components/ui";
import { useFetch } from "@/lib/utils";

type Member = { id: number; name: string; username: string; role: "admin" | "member"; active: boolean; staffRole: string | null; createdAt: string };

export default function LiveSessionsPage() {
  const { data, loading, error, refresh } = useFetch<Member[]>("/api/admin/members");
  const active = (data ?? []).filter((m) => m.active);
  return (
    <AppShell>
      <PageHeader icon=">" title="Live Sessions" subtitle="View accounts currently allowed to access the system">
        <button onClick={refresh} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">Refresh</button>
      </PageHeader>
      <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-3xl font-black text-emerald-700">{active.length}</p><p className="text-sm font-semibold text-emerald-800">Active accounts</p><p className="mt-1 text-xs text-emerald-700">The current authentication system does not store per-browser session heartbeats.</p></div>
      {loading ? <Loader /> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{active.map((m) => <div key={m.id} className="flex items-center justify-between border-b border-slate-100 p-4 last:border-0"><div><p className="font-bold text-slate-800">{m.name}</p><p className="text-xs text-slate-500">@{m.username} {m.staffRole ? `â€¢ ${m.staffRole}` : ""}</p></div><Badge tone={m.role === "admin" ? "indigo" : "emerald"}>{m.role === "admin" ? "Administrator" : "Staff account"}</Badge></div>)}{active.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No active accounts found.</p>}</div>}
    </AppShell>
  );
}
