"use client";

import { useState } from "react";
import { Badge, EmptyState, Loader, StatCard, inputCls } from "@/components/ui";
import { MONTH_NAMES, currentYearMonth } from "@/lib/attendanceHelpers";
import { cls, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };
type PerStudent = {
  id: number;
  name: string;
  gender: "male" | "female";
  present: number;
  absent: number;
  late: number;
  days: number;
  rate: number;
  status: string;
};
type ReportData = {
  className: string;
  month: number;
  year: number;
  avgAttendance: number;
  daysRecorded: number;
  atRiskCount: number;
  totalStudents: number;
  dailyOverview: { day: number; present: number; absent: number; late: number }[];
  perStudent: PerStudent[];
};

const STATUS_TONE: Record<string, "emerald" | "blue" | "amber" | "rose"> = {
  Excellent: "emerald",
  Good: "blue",
  Warning: "amber",
  "At Risk": "rose",
};

function MiniBarChart({ data }: { data: ReportData["dailyOverview"] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No data to chart</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.present + d.absent + d.late));
  return (
    <div className="flex h-40 items-end gap-1 overflow-x-auto pb-1">
      {data.map((d) => {
        const total = d.present + d.absent + d.late || 1;
        const heightPct = (v: number) => `${Math.max(2, (v / max) * 100)}%`;
        return (
          <div key={d.day} className="flex min-w-[18px] flex-1 flex-col items-center justify-end gap-0.5" title={`Day ${d.day}: P${d.present} A${d.absent} L${d.late}`}>
            <div className="flex w-full flex-col-reverse gap-0.5" style={{ height: "120px" }}>
              {d.present > 0 && <div className="w-full rounded-t bg-emerald-500" style={{ height: heightPct(d.present) }} />}
              {d.late > 0 && <div className="w-full bg-amber-500" style={{ height: heightPct(d.late) }} />}
              {d.absent > 0 && <div className="w-full rounded-b bg-rose-500" style={{ height: heightPct(d.absent) }} />}
              {total === 0 && <div className="w-full rounded bg-slate-100" style={{ height: "4%" }} />}
            </div>
            <span className="text-[9px] font-semibold text-slate-400">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AttendanceReportTab({ classes }: { classes: ClassRow[] }) {
  const now = currentYearMonth();
  const [classId, setClassId] = useState("");
  const [month, setMonth] = useState(String(now.month));
  const [year, setYear] = useState(String(now.year));
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  const url = classId ? `/api/attendance/report?classId=${classId}&month=${month}&year=${year}` : null;
  const { data, loading, error } = useFetch<ReportData>(loadedUrl);

  function generate() {
    if (!classId) return;
    setLoadedUrl(url);
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">📊 Attendance Report &amp; Analytics</p>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
              <option value="">--</option>
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
          <button onClick={generate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            📈 Generate
          </button>
        </div>

        {!loadedUrl ? (
          <EmptyState icon="🗂️" title="Select class, month & year" message="Choose a class then click Generate to see analytics." />
        ) : loading ? (
          <Loader label="Generating report..." />
        ) : error ? (
          <EmptyState icon="⚠️" title="Failed to load" message={error} />
        ) : !data ? null : (
          <div className="p-5">
            <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon="📈" label="Avg Attendance" value={`${data.avgAttendance}%`} tone="emerald" />
              <StatCard icon="📅" label="Days Recorded" value={data.daysRecorded} tone="indigo" />
              <StatCard icon="⚠️" label="At Risk (<75%)" value={data.atRiskCount} tone="rose" />
              <StatCard icon="👨‍🎓" label="Total Students" value={data.totalStudents} tone="blue" />
            </div>

            <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Daily Attendance Overview — Mornings</h3>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Absent</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Late</span>
                </div>
              </div>
              <MiniBarChart data={data.dailyOverview} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/80">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">Sex</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold">Present</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold">Absent</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold">Late</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold">Days</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">Rate</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.perStudent.map((s, i) => (
                    <tr key={s.id} className="odd:bg-white even:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{s.name}</td>
                      <td className="px-3 py-2 text-slate-500">{s.gender === "female" ? "Female" : "Male"}</td>
                      <td className="px-3 py-2 text-center font-bold text-emerald-600">{s.present}</td>
                      <td className="px-3 py-2 text-center font-bold text-rose-600">{s.absent}</td>
                      <td className="px-3 py-2 text-center font-bold text-amber-600">{s.late}</td>
                      <td className="px-3 py-2 text-center text-slate-500">{s.days}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cls(
                                "h-full rounded-full",
                                s.rate >= 90 ? "bg-emerald-500" : s.rate >= 75 ? "bg-sky-500" : s.rate >= 60 ? "bg-amber-500" : "bg-rose-500",
                              )}
                              style={{ width: `${Math.min(100, s.rate)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600">{s.rate}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={STATUS_TONE[s.status] ?? "slate"}>{s.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
