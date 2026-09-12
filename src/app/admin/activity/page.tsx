"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Badge, Loader, PageHeader } from "@/components/ui";
import { putJSON, useFetch } from "@/lib/utils";

type Member = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: "admin" | "member";
  active: boolean;
  staffRole: string | null;
  permissions: string[];
  createdAt: string;
};

export default function ActivityControlPage() {
  const { data, loading, error, refresh } = useFetch<Member[]>("/api/admin/members");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const members = useMemo(
    () => (data ?? []).filter((m) => `${m.name} ${m.username} ${m.email}`.toLowerCase().includes(query.toLowerCase())),
    [data, query],
  );

  async function toggle(member: Member) {
    setBusy(member.id);
    try {
      await putJSON(`/api/admin/members/${member.id}`, { active: !member.active });
      refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell>
      <PageHeader icon="!" title="Activity Control" subtitle="Monitor and control staff account activity" />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Accounts" value={data?.length ?? 0} />
        <Stat label="Active" value={(data ?? []).filter((m) => m.active).length} tone="text-emerald-600" />
        <Stat label="Inactive" value={(data ?? []).filter((m) => !m.active).length} tone="text-rose-600" />
        <Stat label="Staff" value={(data ?? []).filter((m) => m.role === "member").length} tone="text-indigo-600" />
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts..." className="mb-4 w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
      {loading ? <Loader /> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-0">
              <div><p className="font-bold text-slate-800">{m.name}</p><p className="text-xs text-slate-500">@{m.username} {m.staffRole ? `â€¢ ${m.staffRole}` : ""}</p></div>
              <div className="flex items-center gap-3"><Badge tone={m.active ? "emerald" : "rose"}>{m.active ? "Active" : "Inactive"}</Badge><button disabled={busy === m.id} onClick={() => toggle(m)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">{busy === m.id ? "Saving..." : m.active ? "Deactivate" : "Activate"}</button></div>
            </div>
          ))}
          {members.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No accounts found.</p>}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: number; tone?: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 text-center"><p className={`text-2xl font-extrabold ${tone}`}>{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div>;
}
