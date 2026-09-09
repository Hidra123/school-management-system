"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Badge, EmptyState, Loader, PageHeader, StatCard, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { EXAM_TYPES, examTypeShort, examTypeTone } from "@/lib/examTypes";
import { cls, useFetch } from "@/lib/utils";
import { staffRoleLabel } from "@/lib/permissions";

type ClassRow = { id: number; name: string; section: string };
type ExamOption = { id: number; name: string; examType: string; academicYear: string };
type TrackRow = {
  examId: number;
  examName: string;
  examType: string;
  academicYear: string;
  classId: number;
  className: string;
  section: string;
  subjectId: number;
  subjectName: string;
  code: string;
  teacherName: string;
  students: number;
  submitted: number;
  expected: number;
  status: "submitted" | "pending";
  submittedAt: string | null;
};
type TrackResponse = {
  exams: ExamOption[];
  rows: TrackRow[];
  stats: { totalAssignments: number; submitted: number; pending: number; completionRate: number };
};

function fmtDT(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const TABS = [
  { key: "progress", label: "Submission Progress", icon: "📋" },
  { key: "detailed", label: "Detailed Score View", icon: "📊" },
  { key: "teacher", label: "By Teacher", icon: "👤" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function ScoreTrackingPage() {
  const { user } = useAuth();
  const classesFetch = useFetch<ClassRow[]>("/api/classes");
  const examsFetch = useFetch<ExamOption[]>("/api/exams/active");

  const [classId, setClassId] = useState("");
  const [examType, setExamType] = useState("");
  const [examId, setExamId] = useState("");
  const [year, setYear] = useState("");
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("progress");

  function buildUrl() {
    const p = new URLSearchParams();
    if (classId) p.set("classId", classId);
    if (examType) p.set("examType", examType);
    if (examId) p.set("examId", examId);
    if (year.trim()) p.set("year", year.trim());
    return p.toString() ? `/api/grades/tracking?${p.toString()}` : "/api/grades/tracking";
  }

  function loadReport() {
    setLoadedUrl(buildUrl());
  }

  const report = useFetch<TrackResponse>(loadedUrl);
  const rows = useMemo(() => report.data?.rows ?? [], [report.data]);
  const stats = report.data?.stats ?? { totalAssignments: 0, submitted: 0, pending: 0, completionRate: 0 };
  const exams = report.data?.exams ?? [];

  // ---------- Print report helpers ----------
  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const classNameLabel = classId
    ? (classesFetch.data?.find((c) => String(c.id) === classId)?.name ?? "Class " + classId)
    : "All Classes";
  const examTypeLabel = examType
    ? (EXAM_TYPES.find((t) => t.value === examType)?.label ?? examType)
    : "All Types";
  const examNameLabel = examId
    ? (examsFetch.data?.find((e) => String(e.id) === examId)?.name ?? "Exam " + examId)
    : "All Exams";
  const filterSummary = `${classNameLabel} · ${examTypeLabel} · ${examNameLabel} · ${
    year.trim() ? "Academic Year " + year.trim() : "All Years"
  }`;
  const examListLabel = exams.length
    ? exams.map((e) => `${e.name} (${e.examType})`).join(", ")
    : "—";

  // ---- Group by class (Submission Progress) ----
  const classGroups = useMemo(() => {
    const m = new Map<string, TrackRow[]>();
    for (const r of rows) {
      if (!m.has(r.className)) m.set(r.className, []);
      m.get(r.className)!.push(r);
    }
    return [...m.entries()].map(([name, list]) => ({
      name,
      list,
      submittedCount: list.filter((r) => r.status === "submitted").length,
      total: list.length,
      pct: list.length ? Math.round((list.filter((r) => r.status === "submitted").length / list.length) * 100) : 0,
    }));
  }, [rows]);

  // ---- By teacher ----
  const teacherAgg = useMemo(() => {
    const m = new Map<string, { submitted: number; pending: number; combos: string[] }>();
    for (const r of rows) {
      const key = r.teacherName;
      const e = m.get(key) ?? { submitted: 0, pending: 0, combos: [] };
      if (r.status === "submitted") e.submitted += 1;
      else e.pending += 1;
      if (!e.combos.includes(`${r.className}/${r.subjectName}`)) e.combos.push(`${r.className}/${r.subjectName}`);
      m.set(key, e);
    }
    return [...m.entries()]
      .map(([name, e]) => ({
        name,
        assignments: e.submitted + e.pending,
        submitted: e.submitted,
        pending: e.pending,
        pct: e.submitted + e.pending ? Math.round((e.submitted / (e.submitted + e.pending)) * 100) : 0,
        combos: e.combos,
      }))
      .sort((a, b) => b.submitted - a.submitted || a.name.localeCompare(b.name));
  }, [rows]);

  const statusBadge = (status: "submitted" | "pending") =>
    status === "submitted" ? (
      <Badge tone="emerald">submitted</Badge>
    ) : (
      <Badge tone="amber">pending</Badge>
    );

  const roleBadge = user?.role === "member" ? staffRoleLabel(user.staffRole) : "🛡️ Admin";

  return (
    <AppShell permission="grades.track">
      <div className="space-y-5 print:hidden">
        <PageHeader icon="📊" title="Score Tracking" subtitle="Track and analyze student score trends">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
            {roleBadge}
          </span>
        </PageHeader>

        {/* ---- Stat cards ---- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="🧾" label="Total Assignments" value={stats.totalAssignments} tone="indigo" />
          <StatCard icon="✅" label="Scores Submitted" value={stats.submitted} tone="emerald" />
          <StatCard icon="⏳" label="Pending" value={stats.pending} tone="amber" />
          <StatCard icon="📈" label="Completion Rate" value={`${stats.completionRate}%`} tone="blue" />
        </div>

        {/* ---- Filters ---- */}
        <div className="no-print flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
              <option value="">All Classes</option>
              {(classesFetch.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ""}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Exam Type</label>
            <select value={examType} onChange={(e) => setExamType(e.target.value)} className={inputCls}>
              <option value="">All Types</option>
              {EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Exam Category</label>
            <select value={examId} onChange={(e) => setExamId(e.target.value)} className={inputCls}>
              <option value="">All Exams</option>
              {(examsFetch.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name}{e.academicYear ? ` (${e.academicYear})` : ""}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Academic Year</label>
            <input type="text" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2025" className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button onClick={loadReport} className={btnPrimary}>🔍 Load Report</button>
            <button onClick={() => window.print()} className={btnGhost} disabled={!report.data}>🖨️ Print</button>
          </div>
        </div>

        {/* ---- Tabs ---- */}
        <div className="no-print flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cls(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                tab === t.key ? "bg-violet-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ---- Body ---- */}
        {!loadedUrl ? (
          <EmptyState icon="🔍" title="Press Load Report" message="Choose class, exam type, exam category and academic year, then press Load Report." />
        ) : report.loading ? (
          <Loader label="Generating report..." />
        ) : report.error ? (
          <EmptyState icon="⚠️" title="Failed to load" message={report.error} />
        ) : rows.length === 0 ? (
          <EmptyState icon="📭" title="No score submissions found" message="Adjust the filters (or the school has no exams/grades for this selection yet) and press Load Report again." />
        ) : tab === "progress" ? (
          <div className="space-y-5">
            {classGroups.map((g) => (
              <div key={g.name} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3">
                  <p className="text-sm font-bold text-white">📋 Score Submission Progress</p>
                  <p className="text-xs font-semibold text-slate-300">
                    {g.name} · {g.submittedCount}/{g.total} submitted
                  </p>
                </div>
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-2.5">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cls("h-full rounded-full", g.pct === 100 ? "bg-emerald-500" : "bg-violet-500")}
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                  <span className={cls("text-sm font-extrabold", g.pct === 100 ? "text-emerald-600" : "text-violet-600")}>
                    {g.pct}%
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {g.list.map((r, i) => (
                      <tr key={`${r.classId}-${r.subjectId}-${r.examId}-${i}`} className="hover:bg-slate-50">
                        <td className="px-5 py-2.5 font-semibold text-slate-800">{r.subjectName}</td>
                        <td className="px-5 py-2.5 text-right">
                          <span className="mr-4 text-xs text-slate-400">{r.teacherName}</span>
                          {statusBadge(r.status)}
                          <span className="ml-3 text-xs text-slate-400">{fmtDT(r.submittedAt)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : tab === "detailed" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">📊 Detailed Score View</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">CLASS</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">SUBJECT</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">EXAM</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">TEACHER</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">STUDENTS</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">SUBMITTED</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">STATUS</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">SUBMITTED AT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={`${r.classId}-${r.subjectId}-${r.examId}-${i}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{r.className}</td>
                      <td className="px-3 py-2.5 text-slate-700">{r.subjectName}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={examTypeTone(r.examType)}>{examTypeShort(r.examType)}</Badge>
                        <span className="ml-1.5 text-xs text-slate-400">{r.examName}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{r.teacherName}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{r.students}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-800">
                        {r.submitted}/{r.expected}
                      </td>
                      <td className="px-3 py-2.5">{statusBadge(r.status)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{fmtDT(r.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">👤 Score Submission by Teacher</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">TEACHER</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">ASSIGNMENTS</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">SUBMITTED</th>
                    <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-600">PENDING</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">COMPLETION</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">CLASSES/SUBJECTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teacherAgg.map((t, i) => (
                    <tr key={t.name} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{t.name}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700">{t.assignments}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-700">{t.submitted}</td>
                      <td className="px-3 py-2.5 text-right text-amber-700">{t.pending}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                            <div className={cls("h-full rounded-full", t.pct === 100 ? "bg-emerald-500" : "bg-violet-500")} style={{ width: `${t.pct}%` }} />
                          </div>
                          <span className={cls("text-xs font-extrabold", t.pct === 100 ? "text-emerald-600" : "text-violet-600")}>{t.pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{t.combos.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== PRINT-ONLY REPORT (modern, letterhead style) ==================== */}
        {report.data && (
          <div className="hidden print:block">
            {/* Letterhead */}
            <div className="flex items-center justify-between gap-4 border-b-4 border-indigo-600 pb-4">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-3xl shadow-md">
                  🎓
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900">SHULEHUB SCHOOL</h1>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-600">
                    Score Submission Tracking Report
                  </p>
                </div>
              </div>
              <div className="text-right text-[10px] leading-relaxed text-slate-500">
                <p className="font-bold uppercase tracking-wide text-slate-700">Generated: {generatedAt}</p>
                <p>Filters: <span className="font-semibold text-slate-700">{filterSummary}</span></p>
                <p>Exams: <span className="font-semibold text-slate-700">{examListLabel}</span></p>
              </div>
            </div>

            {/* KPI band */}
            <div className="mt-5 grid grid-cols-4 gap-3">
              {[
                { label: "Total Assignments", value: stats.totalAssignments, border: "border-l-indigo-600", text: "text-indigo-700" },
                { label: "Scores Submitted", value: stats.submitted, border: "border-l-emerald-600", text: "text-emerald-700" },
                { label: "Pending", value: stats.pending, border: "border-l-amber-500", text: "text-amber-600" },
                { label: "Completion Rate", value: `${stats.completionRate}%`, border: "border-l-sky-600", text: "text-sky-700" },
              ].map((k) => (
                <div key={k.label} className={`rounded-xl border border-slate-200 border-l-4 ${k.border} bg-white px-4 py-3 shadow-sm`}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
                  <p className={`mt-1 text-2xl font-black ${k.text}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Section 1 — Detailed Score View */}
            <h2 className="mt-7 mb-2 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-slate-800">
              <span className="inline-block h-4 w-1.5 rounded-full bg-indigo-600" />
              1 · Detailed Score View ({rows.length} assignments)
            </h2>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-slate-800 text-left text-white">
                  <th className="px-2 py-1.5 font-bold">#</th>
                  <th className="px-2 py-1.5 font-bold">Class</th>
                  <th className="px-2 py-1.5 font-bold">Subject</th>
                  <th className="px-2 py-1.5 font-bold">Exam</th>
                  <th className="px-2 py-1.5 font-bold">Teacher</th>
                  <th className="px-2 py-1.5 text-right font-bold">Students</th>
                  <th className="px-2 py-1.5 text-right font-bold">Submitted</th>
                  <th className="px-2 py-1.5 font-bold">Status</th>
                  <th className="px-2 py-1.5 font-bold">%</th>
                  <th className="px-2 py-1.5 font-bold">Submitted At</th>
                </tr>
              </thead>
              <tbody className="border border-slate-200">
                {rows.map((r, i) => (
                  <tr key={`${r.classId}-${r.subjectId}-${r.examId}-${i}`} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                    <td className="border-b border-slate-200 px-2 py-1 text-slate-500">{i + 1}</td>
                    <td className="border-b border-slate-200 px-2 py-1 font-bold text-slate-800">
                      {r.className}{r.section ? ` ${r.section}` : ""}
                    </td>
                    <td className="border-b border-slate-200 px-2 py-1 text-slate-700">{r.subjectName}</td>
                    <td className="border-b border-slate-200 px-2 py-1">
                      <span className="inline-block rounded-full bg-indigo-100 px-1.5 py-0.5 text-[8px] font-black text-indigo-700">
                        {r.examType}
                      </span>
                    </td>
                    <td className="border-b border-slate-200 px-2 py-1 text-slate-700">{r.teacherName}</td>
                    <td className="border-b border-slate-200 px-2 py-1 text-right text-slate-700">{r.students}</td>
                    <td className="border-b border-slate-200 px-2 py-1 text-right font-bold text-slate-800">
                      {r.submitted}/{r.expected}
                    </td>
                    <td className="border-b border-slate-200 px-2 py-1">
                      <span className={r.status === "submitted"
                        ? "inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-black text-emerald-700"
                        : "inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black text-amber-700"}>
                        {r.status}
                      </span>
                    </td>
                    <td className="border-b border-slate-200 px-2 py-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={r.status === "submitted" ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-amber-400"}
                            style={{ width: `${Math.round((r.submitted / Math.max(r.expected, 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-700">
                          {Math.round((r.submitted / Math.max(r.expected, 1)) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-slate-200 px-2 py-1 text-[9px] text-slate-500">{fmtDT(r.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Section 2 — By Teacher */}
            <h2 className="mt-7 mb-2 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-slate-800">
              <span className="inline-block h-4 w-1.5 rounded-full bg-violet-600" />
              2 · Submission by Teacher ({teacherAgg.length} teachers)
            </h2>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-slate-800 text-left text-white">
                  <th className="px-2 py-1.5 font-bold">#</th>
                  <th className="px-2 py-1.5 font-bold">Teacher</th>
                  <th className="px-2 py-1.5 text-right font-bold">Assignments</th>
                  <th className="px-2 py-1.5 text-right font-bold">Submitted</th>
                  <th className="px-2 py-1.5 text-right font-bold">Pending</th>
                  <th className="px-2 py-1.5 font-bold">Completion</th>
                  <th className="px-2 py-1.5 font-bold">Classes / Subjects</th>
                </tr>
              </thead>
              <tbody className="border border-slate-200">
                {teacherAgg.map((t, i) => (
                  <tr key={t.name} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                    <td className="border-b border-slate-200 px-2 py-1 text-slate-500">{i + 1}</td>
                    <td className="border-b border-slate-200 px-2 py-1 font-bold text-slate-800">{t.name}</td>
                    <td className="border-b border-slate-200 px-2 py-1 text-right text-slate-700">{t.assignments}</td>
                    <td className="border-b border-slate-200 px-2 py-1 text-right font-bold text-emerald-700">{t.submitted}</td>
                    <td className="border-b border-slate-200 px-2 py-1 text-right font-bold text-amber-600">{t.pending}</td>
                    <td className="border-b border-slate-200 px-2 py-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={t.pct === 100 ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-violet-500"}
                            style={{ width: `${t.pct}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-700">{t.pct}%</span>
                      </div>
                    </td>
                    <td className="border-b border-slate-200 px-2 py-1 text-[9px] text-slate-500">{t.combos.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signatures */}
            <div className="mt-10 grid grid-cols-2 gap-10">
              <div className="border-t-2 border-slate-400 pt-2 text-[10px] text-slate-600">
                <p className="font-bold uppercase tracking-wide text-slate-800">Prepared by (Academic Master)</p>
                <p className="mt-6">Name: ______________________ &nbsp;&nbsp; Signature: ______________ &nbsp;&nbsp; Date: ____________</p>
              </div>
              <div className="border-t-2 border-slate-400 pt-2 text-[10px] text-slate-600">
                <p className="font-bold uppercase tracking-wide text-slate-800">Approved by (Head of School)</p>
                <p className="mt-6">Name: ______________________ &nbsp;&nbsp; Signature: ______________ &nbsp;&nbsp; Date: ____________</p>
              </div>
            </div>

            <p className="mt-8 border-t border-slate-200 pt-3 text-center text-[9px] text-slate-400">
              Generated by ShuleHub School Management System · {generatedAt} · {filterSummary}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

