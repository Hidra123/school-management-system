"use client";

import AppShell from "@/components/AppShell";
import { Badge, Loader, PageHeader } from "@/components/ui";
import { useFetch } from "@/lib/utils";

type Member = { id: number; name: string; username: string; role: "admin" | "member"; active: boolean; permissions: string[]; createdAt: string };

export default function AuditTrailPage() {
  const { data, loading, error } = useFetch<Member[]>("/api/admin/members");
  const rows = [...(data ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <AppShell>
      <PageHeader icon="=" title="Audit Trail" subtitle="Review account records, roles and assigned access" />
      {loading ? <Loader /> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Account</th><th className="p-4">Role</th><th className="p-4">Status</th><th className="p-4">Permissions</th><th className="p-4">Created</th></tr></thead><tbody>{rows.map((m) => <tr key={m.id} className="border-t border-slate-100"><td className="p-4"><p className="font-bold text-slate-800">{m.name}</p><p className="text-xs text-slate-500">@{m.username}</p></td><td className="p-4 capitalize">{m.role}</td><td className="p-4"><Badge tone={m.active ? "emerald" : "rose"}>{m.active ? "Active" : "Inactive"}</Badge></td><td className="p-4 font-semibold text-indigo-600">{m.role === "admin" ? "All access" : m.permissions.length}</td><td className="p-4 text-slate-500">{new Date(m.createdAt).toLocaleString()}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No account records found.</p>}</div>}
      <p className="mt-4 text-xs text-slate-500">This view uses the existing users table. Detailed per-action audit events require a dedicated audit log table.</p>
    </AppShell>
  );
}
