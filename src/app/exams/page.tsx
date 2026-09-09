"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import ExamRoutineResultsTab from "@/components/exams/ExamRoutineResultsTab";
import ManageExaminationsTab from "@/components/exams/ManageExaminationsTab";
import { EmptyState, PageHeader } from "@/components/ui";
import { staffRoleLabel } from "@/lib/permissions";
import { cls } from "@/lib/utils";

export default function ExaminationsPage() {
  const { user, hasPerm } = useAuth();
  const canManage = hasPerm("exams.manage");
  const canPublish = hasPerm("exams.results");

  const tabs = [
    canManage && { key: "manage" as const, label: "Manage Examinations", icon: "📝" },
    canPublish && { key: "results" as const, label: "Exam Routine & Results", icon: "📊" },
  ].filter(Boolean) as { key: "manage" | "results"; label: string; icon: string }[];

  const [tab, setTab] = useState<"manage" | "results">(tabs[0]?.key ?? "manage");
  const roleBadge = user?.role === "member" ? staffRoleLabel(user.staffRole) : "🛡️ Admin";

  return (
    <AppShell permission="exams.view">
      <PageHeader icon="📋" title="Examinations" subtitle="Manage examinations, routines and publish results">
        {roleBadge && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
            {roleBadge}
          </span>
        )}
      </PageHeader>

      {/* Exam Type legend — the school uses exactly two exam types */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
          <p className="text-sm font-bold text-indigo-900">SE — School Examination</p>
          <p className="mt-0.5 text-xs text-indigo-700">
            Official school examinations: mid-term, terminal and final papers.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
          <p className="text-sm font-bold text-amber-900">CA — Continuously Assessment (CAs)</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Continuous assessment: tests, quizzes, assignments and projects.
          </p>
        </div>
      </div>

      {tabs.length === 0 ? (
        <EmptyState icon="🔒" title="View-only access" message="You can view this page but do not have permission to manage examinations or publish results. Contact the admin to request access." />
      ) : (
        <>
          {tabs.length > 1 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition",
                    tab === t.key ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          )}

          {tab === "manage" && canManage && <ManageExaminationsTab />}
          {tab === "results" && canPublish && <ExamRoutineResultsTab />}
        </>
      )}
    </AppShell>
  );
}
