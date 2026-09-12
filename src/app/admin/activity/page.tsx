"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Avatar, Badge, EmptyState, Loader, PageHeader, StatCard } from "@/components/ui";
import { putJSON, useFetch } from "@/lib/utils";

type Member={id:number;name:string;username:string;email:string;role:"admin"|"member";active:boolean;staffRole:string|null;permissions:string[];createdAt:string};
type AuditEvent={id:number;action:string;actorName:string|null;targetName:string|null;createdAt:string};

export default function ActivityControlPage(){
 const {data,loading,error,refresh}=useFetch<Member[]>("/api/admin/members");
 const events=useFetch<AuditEvent[]>("/api/admin/activity?limit=12");
 const [query,setQuery]=useState(""); const [busy,setBusy]=useState<number|null>(null);
 const members=useMemo(()=> (data??[]).filter(m=>(m.name+" "+m.username+" "+m.email).toLowerCase().includes(query.toLowerCase())),[data,query]);
 async function toggle(member:Member){setBusy(member.id);try{await putJSON("/api/admin/members/"+member.id,{active:!member.active});refresh();events.refresh();}finally{setBusy(null);}}
 return <AppShell>
  <PageHeader icon="!" title="Activity Control" subtitle="Monitor and control staff account activity"><button onClick={()=>{refresh();events.refresh();}} className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm hover:bg-indigo-50">Refresh</button></PageHeader>
  <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon="*" label="Total accounts" value={data?.length??0} sub="All registered accounts"/><StatCard icon="+" label="Active accounts" value={(data??[]).filter(m=>m.active).length} sub="Can access the system" tone="emerald"/><StatCard icon="-" label="Inactive accounts" value={(data??[]).filter(m=>!m.active).length} sub="Access paused" tone="rose"/><StatCard icon="#" label="Staff members" value={(data??[]).filter(m=>m.role==="member").length} sub="Non-admin accounts" tone="violet"/></div>
  <section className="overflow-hidden rounded-3xl border-2 border-indigo-100 bg-white shadow-lg shadow-indigo-100/40"><div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-indigo-50 bg-gradient-to-r from-indigo-50 to-white px-5 py-4"><div><h2 className="font-bold text-slate-900">Account directory</h2><p className="text-xs text-slate-500">Activate or pause access for each account.</p></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search accounts..." className="w-full rounded-xl border-2 border-indigo-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400 sm:w-72"/></div>
   {loading?<Loader/>:error?<p className="p-5 text-sm text-rose-700">{error}</p>:<div>{members.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 hover:bg-indigo-50/40"><div className="flex items-center gap-3"><Avatar name={m.name} tone={m.active?"indigo":"slate"}/><div><p className="font-bold text-slate-800">{m.name}</p><p className="text-xs text-slate-500">@{m.username}{m.staffRole?" - "+m.staffRole:""}</p></div></div><div className="flex items-center gap-3"><Badge tone={m.active?"emerald":"rose"}>{m.active?"Active":"Inactive"}</Badge><button disabled={busy===m.id} onClick={()=>toggle(m)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">{busy===m.id?"Saving...":m.active?"Deactivate":"Activate"}</button></div></div>)}{members.length===0&&<EmptyState icon="?" title="No accounts found" message="Try a different search term."/>}</div>}
  </section>
  <section className="mt-6 overflow-hidden rounded-3xl border-2 border-amber-100 bg-white shadow-lg shadow-amber-100/30"><div className="flex items-center justify-between border-b-2 border-amber-50 bg-gradient-to-r from-amber-50 to-white px-5 py-4"><div><h2 className="font-bold text-slate-800">Recent activity</h2><p className="text-xs text-slate-500">Latest security and account events</p></div><Badge tone="amber">{events.data?.length??0} events</Badge></div>{events.loading?<Loader/>:events.error?<p className="p-4 text-sm text-rose-700">{events.error}</p>:(events.data??[]).map(e=><div key={e.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 px-5 py-3 last:border-0"><div><p className="font-semibold text-slate-700">{e.action.replaceAll("."," ")}</p><p className="text-xs text-slate-500">{e.actorName??"System"}{e.targetName?" -> "+e.targetName:""}</p></div><time className="text-xs text-slate-400">{new Date(e.createdAt).toLocaleString()}</time></div>)}</section>
 </AppShell>;
}
"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Avatar, Badge, EmptyState, Loader, PageHeader, StatCard } from "@/components/ui";
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
type AuditEvent = {
    id: number;
    action: string;
    details: Record<string, unknown> | null;
    actorName: string | null;
    actorUsername: string | null;
    targetName: string | null;
    targetUsername: string | null;
    createdAt: string;
};

export default function ActivityControlPage() {
    const { data, loading, error, refresh } = useFetch<Member[]>("/api/admin/members");
    const events = useFetch<AuditEvent[]>("/api/admin/activity?limit=12");
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
                events.refresh();
        } finally {
                setBusy(null);
        }
  }

  return (
        <AppShell>
              <PageHeader icon="!" title="Activity Control" subtitle="Monitor and control staff account activity">
                      <button onClick={() => { refresh(); events.refresh(); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50">Refresh</button>button>
              </PageHeader>PageHeader>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <StatCard icon="*" label="Total accounts" value={data?.length ?? 0} sub="All registered accounts" />
                      <StatCard icon="+" label="Active accounts" value={(data ?? []).filter((m) => m.active).length} sub="Can access the system" tone="emerald" />
                      <StatCard icon="-" label="Inactive accounts" value={(data ?? []).filter((m) => !m.active).length} sub="Access currently paused" tone="rose" />
                      <StatCard icon="#" label="Staff members" value={(data ?? []).filter((m) => m.role === "member").length} sub="Non-admin accounts" tone="violet" />
              </div>div>
              <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white px-5 py-4">
                                <div><h2 className="font-bold text-slate-900">Account directory</h2>h2><p className="text-xs text-slate-500">Activate or pause access for each account.</p>p></div>div>
                                <div className="relative w-full sm:w-72">
                                            <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400">Search</span>span>
                                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search accounts..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-16 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                                </div>div>
                      </div>div>
                {loading ? <Loader /> : error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>p> : (
                        <div>
                          {members.map((m) => (
                        <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 transition last:border-0 hover:bg-slate-50/70">
                                        <div className="flex items-center gap-3"><Avatar name={m.name} tone={m.active ? "indigo" : "slate"} /><div><p className="font-bold text-slate-800">{m.name}</p>p><p className="text-xs text-slate-500">@{m.username} {m.staffRole ? `- ${m.staffRole}` : ""}</p>p></div>div></div>div>
                                        <div className="flex items-center gap-3"><Badge tone={m.active ? "emerald" : "rose"}>{m.active ? "Active" : "Inactive"}</Badge>Badge><button disabled={busy === m.id} onClick={() => toggle(m)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">{busy === m.id ? "Saving..." : m.active ? "Deactivate" : "Activate"}</button>button></div>div>
                        </div>div>
                      ))}
                          {members.length === 0 && <EmptyState icon="?" title="No accounts found" message="Try a different search term." />}
                        </div>div>
                      )}
              </section>section>
              <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-50/70 to-white px-5 py-4">
                                <div><h2 className="text-sm font-bold text-slate-800">Recent activity</h2>h2><p className="text-xs text-slate-500">Latest security and account events</p>p></div>div>
                                <Badge tone="amber">{events.data?.length ?? 0} events</Badge>Badge>
                      </div>div>
                {events.loading ? <Loader /> : events.error ? <p className="p-4 text-sm text-rose-700">{events.error}</p>p> : (events.data ?? []).map((event) => (
                        <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-0">
                                    <div><p className="font-semibold text-slate-700">{event.action.replaceAll(".", " ")}</p>p><p className="text-xs text-slate-500">{event.actorName ?? "System"}{event.targetName ? ` -> ${event.targetName}` : ""}</p>p></div>div>
                                    <time className="text-xs text-slate-400">{new Date(event.createdAt).toLocaleString()}</time>time>
                        </div>div>
                      ))}
                {!events.loading && !events.error && (events.data ?? []).length === 0 && <p className="p-6 text-center text-sm text-slate-500">No activity recorded yet.</p>p>}
              </section>section>
        </AppShell>AppShell>
      );
}
</AppShell>
