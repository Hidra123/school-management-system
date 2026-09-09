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

/** Builds a standalone HTML document for the print preview (iframe method).
 *  No Tailwind / no app CSS — its own inline styles => 100% reliable print. */
function buildPrintDoc(d: {
  tab: TabKey;
  rows: TrackRow[];
  classGroups: { name: string; list: TrackRow[]; submittedCount: number; total: number; pct: number }[];
  teacherAgg: { name: string; assignments: number; submitted: number; pending: number; pct: number; combos: string[] }[];
  stats: TrackResponse["stats"];
  filterSummary: string;
  generatedAt: string;
  printSubtitle: string;
  examListLabel: string;
}): string {
  const rows = d.rows;
  const cls = (n: string) => n; // placeholder to keep template readable
  const badge = (status: "submitted" | "pending") =>
    status === "submitted"
      ? `<span style="display:inline-block;background:#d1fae5;color:#047857;padding:1px 8px;border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase">submitted</span>`
      : `<span style="display:inline-block;background:#fef3c7;color:#b45309;padding:1px 8px;border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase">pending</span>`;
  const pctOf = (sub: number, exp: number) => Math.round((sub / Math.max(exp, 1)) * 100);
  const fmt = (iso: string | null) => {
    if (!iso) return "—";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  // ---- Section per tab ----
  let section = "";
  if (d.tab === "progress") {
    section = d.classGroups.map((g) => `
      <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;break-inside:avoid;">
        <div style="background:#1e293b;color:#fff;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;">${g.name}</strong>
          <span style="font-size:10px;color:#cbd5e1;">${g.submittedCount}/${g.total} submitted</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:7px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <div style="flex:1;height:9px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
            <div style="height:100%;width:${g.pct}%;border-radius:999px;background:${g.pct === 100 ? "#10b981" : "#8b5cf6"};"></div>
          </div>
          <strong style="font-size:11px;color:${g.pct === 100 ? "#059669" : "#7c3aed"};">${g.pct}%</strong>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          ${g.list.map((r, i) => `
            <tr style="background:${i % 2 ? "#f8fafc" : "#fff"};">
              <td style="padding:5px 16px;font-weight:700;color:#1e293b;border-bottom:1px solid #e2e8f0;">${r.subjectName}</td>
              <td style="padding:5px 16px;text-align:right;border-bottom:1px solid #e2e8f0;">
                <span style="color:#64748b;font-size:9px;margin-right:12px;">${r.teacherName}</span>
                ${badge(r.status)}
                <span style="color:#94a3b8;font-size:9px;margin-left:10px;">${fmt(r.submittedAt)}</span>
              </td>
            </tr>`).join("")}
        </table>
      </div>`).join("");
  } else if (d.tab === "detailed") {
    section = `
    <table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #e2e8f0;">
      <thead>
        <tr style="background:#1e293b;color:#fff;text-align:left;">
          ${["#", "Class", "Subject", "Exam", "Teacher", "Students", "Submitted", "Status", "%", "Submitted At"].map((h, i) => `<th style="padding:6px 8px;font-weight:800;${i >= 5 && i <= 6 ? "text-align:right;" : ""}">${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr style="background:${i % 2 ? "#f8fafc" : "#fff"};">
            <td style="padding:5px 8px;color:#64748b;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
            <td style="padding:5px 8px;font-weight:800;color:#1e293b;border-bottom:1px solid #e2e8f0;">${r.className}${r.section ? " " + r.section : ""}</td>
            <td style="padding:5px 8px;color:#334155;border-bottom:1px solid #e2e8f0;">${r.subjectName}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;"><span style="display:inline-block;background:#e0e7ff;color:#4338ca;padding:1px 8px;border-radius:999px;font-size:9px;font-weight:800;">${r.examType}</span></td>
            <td style="padding:5px 8px;color:#334155;border-bottom:1px solid #e2e8f0;">${r.teacherName}</td>
            <td style="padding:5px 8px;text-align:right;color:#334155;border-bottom:1px solid #e2e8f0;">${r.students}</td>
            <td style="padding:5px 8px;text-align:right;font-weight:800;color:#1e293b;border-bottom:1px solid #e2e8f0;">${r.submitted}/${r.expected}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">${badge(r.status)}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">
              <div style="display:flex;align-items:center;gap:6px;">
                <div style="flex:1;height:7px;max-width:70px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
                  <div style="height:100%;width:${pctOf(r.submitted, r.expected)}%;background:${r.status === "submitted" ? "#10b981" : "#f59e0b"};"></div>
                </div>
                <span style="font-size:9px;font-weight:700;color:#334155;">${pctOf(r.submitted, r.expected)}%</span>
              </div>
            </td>
            <td style="padding:5px 8px;font-size:9px;color:#64748b;border-bottom:1px solid #e2e8f0;">${fmt(r.submittedAt)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
  } else {
    section = `
    <table style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #e2e8f0;">
      <thead>
        <tr style="background:#1e293b;color:#fff;text-align:left;">
          ${["#", "Teacher", "Assignments", "Submitted", "Pending", "Completion", "Classes / Subjects"].map((h, i) => `<th style="padding:6px 8px;font-weight:800;${i >= 2 && i <= 4 ? "text-align:right;" : ""}">${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${d.teacherAgg.map((t, i) => `
          <tr style="background:${i % 2 ? "#f8fafc" : "#fff"};">
            <td style="padding:5px 8px;color:#64748b;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
            <td style="padding:5px 8px;font-weight:800;color:#1e293b;border-bottom:1px solid #e2e8f0;">${t.name}</td>
            <td style="padding:5px 8px;text-align:right;color:#334155;border-bottom:1px solid #e2e8f0;">${t.assignments}</td>
            <td style="padding:5px 8px;text-align:right;font-weight:800;color:#047857;border-bottom:1px solid #e2e8f0;">${t.submitted}</td>
            <td style="padding:5px 8px;text-align:right;font-weight:800;color:#b45309;border-bottom:1px solid #e2e8f0;">${t.pending}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">
              <div style="display:flex;align-items:center;gap:6px;">
                <div style="flex:1;height:7px;max-width:110px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
                  <div style="height:100%;width:${t.pct}%;background:${t.pct === 100 ? "#10b981" : "#8b5cf6"};"></div>
                </div>
                <span style="font-size:9px;font-weight:700;color:#334155;">${t.pct}%</span>
              </div>
            </td>
            <td style="padding:5px 8px;font-size:9px;color:#64748b;border-bottom:1px solid #e2e8f0;">${t.combos.join(", ")}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
  }

  const kpi = [
    { label: "Total Assignments", value: d.stats.totalAssignments, color: "#4f46e5" },
    { label: "Scores Submitted", value: d.stats.submitted, color: "#059669" },
    { label: "Pending", value: d.stats.pending, color: "#d97706" },
    { label: "Completion Rate", value: d.stats.completionRate + "%", color: "#0284c7" },
  ];

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${d.printSubtitle}</title><style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; }
    .kpi { display:flex; gap:12px; margin:18px 0 22px; }
    .kpi div { flex:1; border:1px solid #e2e8f0; border-left:4px solid ${kpi[0].color}; border-radius:12px; padding:10px 14px; background:#fff; }
    .kpi div:nth-child(2){ border-left-color:${kpi[1].color}; }
    .kpi div:nth-child(3){ border-left-color:${kpi[2].color}; }
    .kpi div:nth-child(4){ border-left-color:${kpi[3].color}; }
    .kpi p { margin:0; font-size:8px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#64748b; }
    .kpi strong { display:block; margin-top:4px; font-size:24px; color:#0f172a; }
    h2 { font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:#1e293b; margin:0 0 8px; }
    .sect { display:flex; align-items:center; gap:8px; }
    .sect span { display:inline-block; width:5px; height:16px; border-radius:99px; background:#4f46e5; }
    .sig { display:flex; gap:40px; margin-top:34px; }
    .sig div { flex:1; border-top:2px solid #94a3b8; padding-top:6px; font-size:9px; color:#475569; }
    .sig strong { text-transform:uppercase; letter-spacing:.05em; color:#1e293b; }
    .foot { margin-top:28px; border-top:1px solid #e2e8f0; padding-top:8px; text-align:center; font-size:8px; color:#94a3b8; }
  </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:4px solid #4f46e5;padding-bottom:14px;">
      <div style="display:flex;gap:14px;align-items:center;">
        <div style="width:58px;height:58px;border-radius:16px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:26px;">🎓</div>
        <div>
          <h1 style="margin:0;font-size:26px;font-weight:900;letter-spacing:-.01em;">SHULEHUB SCHOOL</h1>
          <p style="margin:2px 0 0;font-size:10px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#4f46e5;">${d.printSubtitle}</p>
        </div>
      </div>
      <div style="text-align:right;font-size:9px;color:#64748b;line-height:1.6;">
        <p style="margin:0;font-weight:800;text-transform:uppercase;color:#334155;">Generated: ${d.generatedAt}</p>
        <p style="margin:0;">Filters: <strong>${d.filterSummary}</strong></p>
        <p style="margin:0;">Exams: <strong>${d.examListLabel}</strong></p>
      </div>
    </div>
    <div class="kpi">${kpi.map((k) => `<div><p>${k.label}</p><strong>${k.value}</strong></div>`).join("")}</div>
    <div class="sect"><span></span><h2>1 · ${d.printSubtitle.replace(" Report", "")} (${d.tab === "teacher" ? d.teacherAgg.length + " teachers" : d.tab === "progress" ? d.classGroups.length + " classes" : rows.length + " assignments"})</h2></div>
    ${section}
    <div class="sig">
      <div><strong>Prepared by (Academic Master)</strong><p>Name: ______________________ &nbsp;&nbsp; Signature: ______________ &nbsp;&nbsp; Date: ____________</p></div>
      <div><strong>Approved by (Head of School)</strong><p>Name: ______________________ &nbsp;&nbsp; Signature: ______________ &nbsp;&nbsp; Date: ____________</p></div>
    </div>
    <p class="foot">Generated by ShuleHub School Management System · ${d.generatedAt} · ${d.filterSummary}</p>
  </body></html>`;
}

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
  // Print report title — kila tab ina report yake binafsi
  const printSubtitle =
    tab === "progress"
      ? "Score Submission Progress Report"
      : tab === "detailed"
        ? "Detailed Score View Report"
        : "Submission by Teacher Report";
  // ---------- PRINT via dedicated iframe (100% reliable — no app CSS) ----------
  function printReport() {
    if (!report.data || rows.length === 0) {
      window.print();
      return;
    }
    const html = buildPrintDoc({
      tab,
      rows,
      classGroups,
      teacherAgg,
      stats,
      filterSummary,
      generatedAt,
      printSubtitle,
      examListLabel,
    });
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const win = iframe.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
    setTimeout(() => document.body.removeChild(iframe), 3000);
  }


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
      <div className="space-y-5 screen-only">
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
            <button onClick={printReport} className={btnGhost} disabled={!report.data}>🖨️ Print</button>
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

      </div>
    </AppShell>
  );
}

