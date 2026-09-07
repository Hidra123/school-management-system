"use client";

import Link from "next/link";
import { useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { Avatar, Badge, EmptyState, Loader, StatCard } from "@/components/ui";
import { cls, longDate, money, useFetch } from "@/lib/utils";

type RecentStudent = {
  id: number;
  admissionNo: string;
  name: string;
  gender: "male" | "female";
  className: string | null;
  enrollmentDate: string | null;
};

type Stats = {
  counts: { students: number; teachers: number; classes: number; subjects: number; grades: number };
  fees: {
    expected: number;
    collected: number;
    balance: number;
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
    overdueCount: number;
    totalRecords: number;
  };
  attendance: { date: string; present: number; absent: number; late: number; excused: number };
  recentStudents: RecentStudent[];
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error, refresh } = useFetch<Stats>("/api/stats");

  // Admin has its own dashboard
  useEffect(() => {
    if (user?.role === "admin") window.location.href = "/admin";
  }, [user]);

  if (loading && !data) return <AppShell permission="dashboard"><Loader label="Loading school statistics..." /></AppShell>;
  if (error && !data)
    return <AppShell permission="dashboard"><EmptyState icon="⚠️" title="Failed to load data" message={error} /></AppShell>;
  if (!data) return <AppShell permission="dashboard"><EmptyState icon="📭" title="No data" message="Click Refresh to reload." /></AppShell>;

  const { counts, fees, attendance, recentStudents } = data;
  const recorded = attendance.present + attendance.absent + attendance.late + attendance.excused;
  const notRecorded = Math.max(0, counts.students - recorded);
  const collectPct = fees.expected > 0 ? Math.round((fees.collected / fees.expected) * 100) : 0;

  return (
    <AppShell permission="dashboard">
    <div className="space-y-6">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-indigo-200">{longDate()}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome back! 👋
            </h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/90">
              Here is your school at a glance — students, teachers, attendance, grades and fees,
              all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/attendance"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              ✅ Take Attendance
            </Link>
            <Link
              href="/grades"
              className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/25"
            >
              📝 Enter Grades
            </Link>
          </div>
        </div>
      </section>

      {/* Counts */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="👨‍🎓" label="Students" value={counts.students} sub={`${counts.grades} grade records`} tone="indigo" />
        <StatCard icon="👨‍🏫" label="Teachers" value={counts.teachers} sub="Registered teachers" tone="violet" />
        <StatCard icon="🏫" label="Classes" value={counts.classes} sub="Total classes" tone="blue" />
        <StatCard icon="📚" label="Subjects" value={counts.subjects} sub="Subjects taught" tone="emerald" />
      </section>

      {/* Detail row */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Fees */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">💰 Fees Overview</h2>
            <Link href="/fees" className="text-sm font-semibold text-indigo-600 hover:underline">
              Open →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-700">Collected</p>
              <p className="mt-0.5 text-lg font-extrabold text-emerald-800">{money(fees.collected)}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-3">
              <p className="text-xs font-semibold text-rose-700">Outstanding (Debt)</p>
              <p className="mt-0.5 text-lg font-extrabold text-rose-800">{money(fees.balance)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600">Expected</p>
              <p className="mt-0.5 text-base font-bold text-slate-800">{money(fees.expected)}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700">Overdue</p>
              <p className="mt-0.5 text-base font-bold text-red-800">{fees.overdueCount}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Collection progress</span>
              <span>{collectPct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                style={{ width: `${collectPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Attendance */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">✅ Today&apos;s Attendance</h2>
            <Link href="/attendance" className="text-sm font-semibold text-indigo-600 hover:underline">
              Open →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Present", v: attendance.present, icon: "🟢" },
              { label: "Absent", v: attendance.absent, icon: "🔴" },
              { label: "Late", v: attendance.late, icon: "🟡" },
              { label: "Excused", v: attendance.excused, icon: "🔵" },
            ].map((x) => (
              <div key={x.label} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <span className="text-lg">{x.icon}</span>
                <div>
                  <p className="text-lg font-extrabold leading-none text-slate-900">{x.v}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">{x.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2.5 text-sm">
            <span className="font-semibold text-indigo-800">Not yet marked</span>
            <span className="font-extrabold text-indigo-900">{notRecorded}</span>
          </div>
        </div>

        {/* Recent students */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">🆕 Recently Added Students</h2>
            <Link href="/students" className="text-sm font-semibold text-indigo-600 hover:underline">
              View all →
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No students yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {recentStudents.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={s.name} tone={s.gender === "female" ? "rose" : "indigo"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.admissionNo}</p>
                  </div>
                  <Badge tone="slate">{s.className ?? "No class"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Refresh */}
      <div className="flex items-center justify-end">
        <button
          onClick={refresh}
          className={cls(
            "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50",
            loading && "opacity-60",
          )}
        >
          {loading ? "Loading..." : "🔄 Refresh"}
        </button>
      </div>
    </div>
    </AppShell>
  );
}
