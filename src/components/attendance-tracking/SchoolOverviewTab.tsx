"use client";

import { useState } from "react";
import { Badge, EmptyState, Loader, StatCard, inputCls } from "@/components/ui";
import { cls, shortDate, todayStr, useFetch } from "@/lib/utils";

type PerClass = {
  classId: number;
  className: string;
  section: string;
  registered: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
};
type ClassTeacherStatus = {
  classId: number;
  className: string;
  teacherId: number | null;
  teacherName: string | null;
  studentCount: number;
  submitted: boolean;
  lastSavedAt: string | null;
};
type OverviewData = {
  date: string;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  atRiskCount: number;
  perClass: PerClass[];
  schoolTotal: { registered: number; present: number; absent: number; late: number; rate: number };
  classTeachers: ClassTeacherStatus[];
};

export default function SchoolOverviewTab() {
  const [date, setDate] = useState(todayStr());
  const [loadedDate, setLoadedDate] = useState(todayStr());
  const { data, loading, error, refresh } = useFetch<OverviewData>(`/api/attendance/school-overview?date=${loadedDate}`);

  function load() {
    setLoadedDate(date);
  }

  function printReport() {
    window.print();
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="🟢" label="Present Today" value={data?.presentToday ?? "—"} tone="emerald" />
        <StatCard icon="🔴" label="Absent Today" value={data?.absentToday ?? "—"} tone="rose" />
        <StatCard icon="📈" label="Attendance Rate" value={data ? `${data.attendanceRate}%` : "—"} tone="indigo" />
        <StatCard icon="⚠️" label="At-Risk (<75%)" value={data?.atRiskCount ?? "—"} tone="amber" />
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cls(inputCls, "sm:w-48")} />
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          🔍 Load
        </button>
        <button onClick={printReport} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700">
          🖨️ Print
        </button>
        <button onClick={() => refresh()} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50">
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <Loader label="Loading school-wide overview..." />
      ) : error ? (
        <EmptyState icon="⚠️" title="Could not load overview" message={error} />
      ) : !data ? null : (
        <>
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-emerald-700 px-5 py-3 text-white">
              <p className="text-sm font-bold">🏫 School-Wide Attendance: {data.date}</p>
              <p className="text-xs font-semibold">
                Total Present: {data.schoolTotal.present} / {data.schoolTotal.registered} ({data.schoolTotal.rate}%)
              </p>
            </div>
            {data.perClass.length === 0 ? (
              <EmptyState icon="🏫" title="No classes yet" message="Add classes under Manage Classes first." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Class</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">Registered</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-emerald-700">Present</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-rose-700">Absent</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-amber-700">Late</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">Rate</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Status Bar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.perClass.map((c, i) => (
                      <tr key={c.classId} className="odd:bg-white even:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 font-bold text-indigo-700">{c.className}{c.section ? ` — ${c.section}` : ""}</td>
                        <td className="px-3 py-2 text-center text-slate-700">{c.registered}</td>
                        <td className="px-3 py-2 text-center font-bold text-emerald-600">{c.present}</td>
                        <td className="px-3 py-2 text-center font-bold text-rose-600">{c.absent}</td>
                        <td className="px-3 py-2 text-center font-bold text-amber-600">{c.late}</td>
                        <td className="px-3 py-2 text-center font-bold text-slate-700">{c.rate}%</td>
                        <td className="px-3 py-2">
                          <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cls("h-full rounded-full", c.rate >= 90 ? "bg-emerald-500" : c.rate >= 75 ? "bg-sky-500" : c.rate >= 60 ? "bg-amber-500" : "bg-rose-500")}
                              style={{ width: `${Math.min(100, c.rate)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 font-bold text-white">
                      <td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5">SCHOOL TOTAL</td>
                      <td className="px-3 py-2.5 text-center">{data.schoolTotal.registered}</td>
                      <td className="px-3 py-2.5 text-center text-emerald-300">{data.schoolTotal.present}</td>
                      <td className="px-3 py-2.5 text-center text-rose-300">{data.schoolTotal.absent}</td>
                      <td className="px-3 py-2.5 text-center text-amber-300">{data.schoolTotal.late}</td>
                      <td className="px-3 py-2.5 text-center">{data.schoolTotal.rate}%</td>
                      <td className="px-3 py-2.5">
                        <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-white/20">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, data.schoolTotal.rate)}%` }} />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">👩‍🏫 Class Teachers — Attendance Submission Status</p>
              <button onClick={() => refresh()} className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20">🔄 Refresh</button>
            </div>
            {data.classTeachers.length === 0 ? (
              <EmptyState icon="👨‍🏫" title="No classes yet" message="Add classes to see submission status." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Class Teacher</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Class</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">Students</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600">Today&apos;s Status</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-600">Last Saved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.classTeachers.map((ct, i) => (
                      <tr key={ct.classId} className="odd:bg-white even:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{ct.teacherName ?? <span className="italic text-slate-400">Not assigned</span>}</td>
                        <td className="px-3 py-2 font-bold text-indigo-700">{ct.className}</td>
                        <td className="px-3 py-2 text-center text-slate-700">{ct.studentCount}</td>
                        <td className="px-3 py-2 text-center">
                          {ct.submitted ? <Badge tone="emerald">✅ Submitted</Badge> : <Badge tone="rose">⛔ Not Submitted</Badge>}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{ct.lastSavedAt ? shortDate(ct.lastSavedAt.slice(0, 10)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
