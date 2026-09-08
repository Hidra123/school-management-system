"use client";

import { useState } from "react";
import { Badge, EmptyState, Loader, inputCls } from "@/components/ui";
import { MONTH_NAMES, currentYearMonth } from "@/lib/attendanceHelpers";
import { cls, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };
type AtRiskStudent = {
  id: number;
  name: string;
  gender: "male" | "female";
  className: string | null;
  present: number;
  absent: number;
  late: number;
  rate: number;
  riskLevel: "Critical" | "At Risk" | "Needs Attention" | "Good";
};
type AtRiskData = { month: number; year: number; totalStudents: number; flaggedCount: number; students: AtRiskStudent[] };

type AnnualClassRow = { classId: number; className: string; daysRecorded: number; rate: number };
type AnnualData = { year: number; classes: AnnualClassRow[] };

const RISK_TONE: Record<string, "rose" | "amber" | "blue" | "emerald"> = {
  Critical: "rose",
  "At Risk": "amber",
  "Needs Attention": "blue",
  Good: "emerald",
};

export default function AtRiskStudentsTab({ classes }: { classes: ClassRow[] }) {
  const now = currentYearMonth();
  const [classId, setClassId] = useState("");
  const [month, setMonth] = useState(String(now.month));
  const [year, setYear] = useState(String(now.year));
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  const { data, loading, error } = useFetch<AtRiskData>(loadedUrl);

  function scan() {
    setLoadedUrl(`/api/attendance/at-risk?${classId ? `classId=${classId}&` : ""}month=${month}&year=${year}`);
  }

  function exportCsv() {
    if (!data) return;
    const header = ["Name", "Sex", "Class", "Present", "Absent", "Late", "Rate", "Risk Level"];
    const rows = data.students.map((s) => [s.name, s.gender, s.className ?? "", String(s.present), String(s.absent), String(s.late), `${s.rate}%`, s.riskLevel]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `at-risk-students-${MONTH_NAMES[Number(month) - 1]}-${year}.csv`;
    link.click();
  }

  // ----- Annual per-class days-recorded section -----
  const [annualYear, setAnnualYear] = useState(String(now.year));
  const [annualLoadedUrl, setAnnualLoadedUrl] = useState<string | null>(null);
  const annualFetch = useFetch<AnnualData>(annualLoadedUrl);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="font-bold">Students at Academic Risk Due to Poor Attendance</p>
          <p className="mt-0.5 text-sm">Students with attendance below 75% are flagged. These students require immediate follow-up from their Class Teacher and parents.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">🚩 At-Risk Student Tracker</p>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={cls(inputCls, "sm:w-40")}>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={cls(inputCls, "sm:w-28")} />
          </div>
          <button onClick={scan} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            🔎 Scan
          </button>
          {data && (
            <button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50">
              📤 Export
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-2.5 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Critical (&lt;50%)</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> At Risk (50-74%)</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Needs Attention (75-84%)</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Good (&ge;85%)</span>
        </div>

        {!loadedUrl ? (
          <EmptyState icon="🗂️" title="Select filters & scan" message="Choose a class (or All Classes), month and year, then click Scan." />
        ) : loading ? (
          <Loader label="Scanning attendance records..." />
        ) : error ? (
          <EmptyState icon="⚠️" title="Could not scan" message={error} />
        ) : !data ? null : (
          <>
            <p className="border-b border-amber-100 bg-amber-50/60 px-5 py-2.5 text-sm font-semibold text-amber-800">
              ⚠️ {data.flaggedCount} student(s) flagged at risk out of {data.totalStudents} total students
            </p>
            {data.students.length === 0 ? (
              <EmptyState icon="🎉" title="No at-risk students" message="Everyone is attending well this month!" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Student Name</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Sex</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Class</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-emerald-700">Present</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-rose-700">Absent</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-amber-700">Late</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Rate</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.students.map((s, i) => (
                      <tr key={s.id} className="odd:bg-white even:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{s.name}</td>
                        <td className="px-3 py-2 text-slate-500">{s.gender === "female" ? "Female" : "Male"}</td>
                        <td className="px-3 py-2"><span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">{s.className ?? "—"}</span></td>
                        <td className="px-3 py-2 text-center font-bold text-emerald-600">{s.present}</td>
                        <td className="px-3 py-2 text-center font-bold text-rose-600">{s.absent}</td>
                        <td className="px-3 py-2 text-center font-bold text-amber-600">{s.late}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, s.rate)}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-600">{s.rate}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2"><Badge tone={RISK_TONE[s.riskLevel]}>{s.riskLevel}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">📅 Days Recorded Per Class — Annual View</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Year</label>
            <input type="number" value={annualYear} onChange={(e) => setAnnualYear(e.target.value)} className={cls(inputCls, "sm:w-28")} />
          </div>
          <button
            onClick={() => setAnnualLoadedUrl(`/api/attendance/annual-overview?year=${annualYear}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            🔍 Load
          </button>
        </div>
        {!annualLoadedUrl ? (
          <EmptyState icon="🗂️" title="Select a year" message="Choose a year and click Load to see days recorded per class." />
        ) : annualFetch.loading ? (
          <Loader label="Loading annual overview..." />
        ) : annualFetch.error ? (
          <EmptyState icon="⚠️" title="Could not load" message={annualFetch.error} />
        ) : !annualFetch.data || annualFetch.data.classes.length === 0 ? (
          <EmptyState icon="🏫" title="No classes yet" message="Add classes under Manage Classes first." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Class</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">Days Recorded</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {annualFetch.data.classes.map((c) => (
                  <tr key={c.classId} className="odd:bg-white even:bg-slate-50/50">
                    <td className="px-3 py-2 font-bold text-indigo-700">{c.className}</td>
                    <td className="px-3 py-2 text-center font-semibold text-slate-700">{c.daysRecorded}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, c.rate)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{c.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
