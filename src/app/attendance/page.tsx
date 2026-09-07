"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import AttendanceReportTab from "@/components/attendance/AttendanceReportTab";
import DailyEntryTab from "@/components/attendance/DailyEntryTab";
import DaysSavedTab from "@/components/attendance/DaysSavedTab";
import MonthlyRegisterTab from "@/components/attendance/MonthlyRegisterTab";
import { EmptyState, PageHeader } from "@/components/ui";
import { staffRoleLabel } from "@/lib/permissions";
import { cls, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };

const TABS = [
  { key: "daily", label: "Daily Entry", icon: "🗓️" },
  { key: "monthly", label: "Monthly Register", icon: "📋" },
  { key: "report", label: "Attendance Report", icon: "📊" },
  { key: "days", label: "Days Saved", icon: "✅" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AttendancePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("daily");
  const classesFetch = useFetch<ClassRow[]>("/api/classes");
  const classList = classesFetch.data ?? [];

  const roleBadge = user?.role === "member" ? staffRoleLabel(user.staffRole) : null;

  return (
    <AppShell permission="attendance.view">
      <PageHeader icon="✅" title="Attendance" subtitle="Mark, review and analyze class attendance">
        {roleBadge && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            {roleBadge}
          </span>
        )}
      </PageHeader>

      {user?.role === "member" && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-100">
          🏫 Showing only the class(es) assigned to you by the admin.
        </div>
      )}

      {/* Tab switcher */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cls(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
              tab === t.key
                ? "bg-emerald-500 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {!classesFetch.loading && classList.length === 0 ? (
        <EmptyState
          icon="🏫"
          title="No classes available"
          message={
            user?.role === "member"
              ? "You have not been assigned any classes yet. Ask the admin to assign you a class."
              : "Add a class first under Manage Classes."
          }
        />
      ) : (
        <>
          {tab === "daily" && <DailyEntryTab classes={classList} />}
          {tab === "monthly" && <MonthlyRegisterTab classes={classList} />}
          {tab === "report" && <AttendanceReportTab classes={classList} />}
          {tab === "days" && <DaysSavedTab classes={classList} />}
        </>
      )}
    </AppShell>
  );
}
