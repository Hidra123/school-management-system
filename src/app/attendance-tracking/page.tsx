"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import AttendanceReportTab from "@/components/attendance/AttendanceReportTab";
import MonthlyRegisterTab from "@/components/attendance/MonthlyRegisterTab";
import AtRiskStudentsTab from "@/components/attendance-tracking/AtRiskStudentsTab";
import DailySummaryTab from "@/components/attendance-tracking/DailySummaryTab";
import SchoolOverviewTab from "@/components/attendance-tracking/SchoolOverviewTab";
import { EmptyState, Loader, PageHeader } from "@/components/ui";
import { staffRoleLabel } from "@/lib/permissions";
import { cls, longDate, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };

const TABS = [
  { key: "overview", label: "School Overview", icon: "🌐" },
  { key: "daily", label: "Daily Summary", icon: "📅" },
  { key: "monthly", label: "Monthly Register", icon: "📋" },
  { key: "analytics", label: "Analytics Report", icon: "📊" },
  { key: "atrisk", label: "At-Risk Students", icon: "⚠️" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AttendanceTrackingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("overview");
  const classesFetch = useFetch<ClassRow[]>("/api/classes");
  const classList = classesFetch.data ?? [];

  const roleBadge = user?.role === "member" ? staffRoleLabel(user.staffRole) : "🛡️ Admin";

  return (
    <AppShell permission="attendance.trackall">
      <PageHeader icon="🗓️" title="Attendance Tracking Centre" subtitle="View, monitor and analyse all Class Teachers' attendance reports across all classes and time periods">
        {roleBadge && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
            {roleBadge}
          </span>
        )}
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 py-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-xl">🗓️</div>
          <div>
            <p className="text-sm font-bold">Attendance Tracking Centre</p>
            <p className="text-xs text-emerald-100">School-wide attendance monitoring, unscoped from any single class</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-100">Today</p>
            <p className="text-sm font-bold">{longDate()}</p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cls(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
              tab === t.key ? "bg-emerald-500 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {classesFetch.loading ? (
        <Loader label="Loading classes..." />
      ) : classesFetch.error ? (
        <EmptyState icon="⚠️" title="Could not load classes" message={classesFetch.error} />
      ) : (
        <>
          {tab === "overview" && <SchoolOverviewTab />}
          {tab === "daily" && <DailySummaryTab classes={classList} />}
          {tab === "monthly" &&
            (classList.length === 0 ? (
              <EmptyState icon="🏫" title="No classes yet" message="Add classes under Manage Classes first." />
            ) : (
              <MonthlyRegisterTab classes={classList} />
            ))}
          {tab === "analytics" && <AttendanceReportTab classes={classList} allowAllClasses />}
          {tab === "atrisk" && <AtRiskStudentsTab classes={classList} />}
        </>
      )}
    </AppShell>
  );
}
