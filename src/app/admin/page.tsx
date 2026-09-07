"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Loader, StatCard } from "@/components/ui";
import { useFetch } from "@/lib/utils";

type Stats = {
  counts: { students: number; teachers: number; classes: number; subjects: number; grades: number };
  fees: { expected: number; collected: number; balance: number };
};

type Member = { id: number; role: string; active: boolean };

export default function AdminOverviewPage() {
  const stats = useFetch<Stats>("/api/stats");
  const members = useFetch<Member[]>("/api/admin/members");
  const s = stats.data;
  const m = members.data ?? [];

  const activeUsers = m.filter((u) => u.active).length;
  const totalUsers = m.length;

  return (
    <AppShell>
      {/* Welcome Banner */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-indigo-400/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              System Online
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Secured</span>
              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </p>
            <p className="mt-2 text-sm text-slate-400">Welcome back,</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Administrator</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-extrabold text-amber-400">{s?.counts.students ?? "—"}</p>
            <p className="text-xs font-semibold text-slate-400">Total Students Enrolled</p>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      {stats.loading ? (
        <Loader />
      ) : (
        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
          <StatCard icon="👨‍🏫" label="Total Teachers" value={s?.counts.teachers ?? 0} tone="indigo" />
          <StatCard icon="👨‍🎓" label="Total Students" value={s?.counts.students ?? 0} tone="blue" />
          <StatCard icon="🏫" label="Classes" value={s?.counts.classes ?? 0} tone="emerald" />
          <StatCard icon="📚" label="Subjects" value={s?.counts.subjects ?? 0} tone="violet" />
          <StatCard icon="👥" label="Active Users" value={activeUsers} sub={`${totalUsers} total`} tone="amber" />
          <StatCard icon="📝" label="Score Records" value={s?.counts.grades ?? 0} tone="rose" />
        </section>
      )}

      {/* Quick Actions */}
      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">⚡ Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Add Teacher", icon: "👨‍🏫", href: "/admin/teachers", color: "bg-emerald-500 hover:bg-emerald-600" },
            { label: "Approvals", icon: "✅", href: "/admin/admissions", color: "bg-indigo-500 hover:bg-indigo-600" },
            { label: "Monitor", icon: "📡", href: "/admin/monitor", color: "bg-violet-500 hover:bg-violet-600" },
            { label: "Activity", icon: "🔔", href: "/admin/activity", color: "bg-amber-500 hover:bg-amber-600" },
            { label: "Sessions", icon: "👥", href: "/admin/sessions", color: "bg-rose-500 hover:bg-rose-600" },
            { label: "Settings", icon: "⚙️", href: "/admin/settings", color: "bg-slate-600 hover:bg-slate-700" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition ${a.color}`}
            >
              <span>{a.icon}</span> {a.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Two column: Recent Activity + Live Feed placeholder */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">📋 Recent Activity</h2>
            <Link href="/admin/audit" className="text-sm font-semibold text-indigo-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl">📋</div>
            <p className="mt-3 text-sm font-semibold text-slate-500">Activity tracking coming soon</p>
            <p className="mt-1 text-xs text-slate-400">All system activities will be logged here</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">📡 Live Activity Feed</h2>
            <button className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
              🔄
            </button>
          </div>
          <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl opacity-40">📡</div>
            <p className="mt-3 text-sm font-semibold text-slate-400">No activity recorded yet.</p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
