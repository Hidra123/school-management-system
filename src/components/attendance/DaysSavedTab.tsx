"use client";

import { useState } from "react";
import { EmptyState, Loader, inputCls } from "@/components/ui";
import { currentYearMonth } from "@/lib/attendanceHelpers";
import { cls, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };
type MonthInfo = { month: number; name: string; daysRecorded: number; rate: number };
type DaysSavedData = { className: string; year: number; months: MonthInfo[]; totalDaysRecorded: number };

type ReportData = {
  avgAttendance: number;
  daysRecorded: number;
  atRiskCount: number;
  totalStudents: number;
  perStudent: { id: number; name: string; present: number; absent: number; late: number; rate: number }[];
};

export default function DaysSavedTab({ classes }: { classes: ClassRow[] }) {
  const now = currentYearMonth();
  const [classId, setClassId] = useState("");
  const [year, setYear] = useState(String(now.year));
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  const url = classId ? `/api/attendance/days-saved?classId=${classId}&year=${year}` : null;
  const { data, loading, error } = useFetch<DaysSavedData>(loadedUrl);

  const detailUrl = expandedMonth && classId ? `/api/attendance/report?classId=${classId}&month=${expandedMonth}&year=${year}` : null;
  const detailFetch = useFetch<ReportData>(detailUrl);

  function load() {
    if (!classId) return;
    setLoadedUrl(url);
    setExpandedMonth(null);
  }

  function toggleMonth(m: number) {
    setExpandedMonth((prev) => (prev === m ? null : m));
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">🗓️ Days Saved Tracker</p>
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
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={cls(inputCls, "sm:w-28")} />
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            🔍 Load
          </button>
        </div>

        {!loadedUrl ? (
          <EmptyState icon="🗂️" title="Select class & year" message="Choose a class and year, then click Load." />
        ) : loading ? (
          <Loader label="Loading tracker..." />
        ) : error ? (
          <EmptyState icon="⚠️" title="Failed to load" message={error} />
        ) : !data ? null : (
          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.months.map((m) => {
                const active = m.daysRecorded > 0;
                const isOpen = expandedMonth === m.month;
                return (
                  <button
                    key={m.month}
                    onClick={() => active && toggleMonth(m.month)}
                    disabled={!active}
                    className={cls(
                      "rounded-2xl border p-4 text-left transition",
                      isOpen ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200" : active ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50" : "border-slate-200 bg-white opacity-70",
                      active ? "cursor-pointer" : "cursor-default",
                    )}
                  >
                    <p className={cls("text-sm font-bold", active ? "text-emerald-800" : "text-slate-500")}>{m.name}</p>
                    <p className={cls("mt-1 text-2xl font-extrabold", active ? "text-emerald-700" : "text-slate-300")}>{m.daysRecorded}</p>
                    <p className="text-xs text-slate-500">Days Recorded</p>
                    {active && (
                      <>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, m.rate)}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] font-semibold text-emerald-600">{m.rate}% rate</p>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {expandedMonth && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
                <h3 className="mb-3 text-sm font-bold text-emerald-900">
                  📖 Breakdown — {data.months.find((m) => m.month === expandedMonth)?.name} {data.year}
                </h3>
                {detailFetch.loading ? (
                  <Loader label="Loading breakdown..." />
                ) : detailFetch.data ? (
                  <div>
                    <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-white px-3 py-2.5 text-center shadow-sm">
                        <p className="text-lg font-extrabold text-emerald-700">{detailFetch.data.avgAttendance}%</p>
                        <p className="text-[11px] text-slate-500">Avg Attendance</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2.5 text-center shadow-sm">
                        <p className="text-lg font-extrabold text-indigo-700">{detailFetch.data.daysRecorded}</p>
                        <p className="text-[11px] text-slate-500">Days Recorded</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2.5 text-center shadow-sm">
                        <p className="text-lg font-extrabold text-rose-700">{detailFetch.data.atRiskCount}</p>
                        <p className="text-[11px] text-slate-500">At Risk</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2.5 text-center shadow-sm">
                        <p className="text-lg font-extrabold text-slate-700">{detailFetch.data.totalStudents}</p>
                        <p className="text-[11px] text-slate-500">Students</p>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-2.5 py-2 text-left font-bold text-slate-600">Name</th>
                            <th className="px-2.5 py-2 text-center font-bold text-emerald-700">P</th>
                            <th className="px-2.5 py-2 text-center font-bold text-rose-700">A</th>
                            <th className="px-2.5 py-2 text-center font-bold text-amber-700">L</th>
                            <th className="px-2.5 py-2 text-center font-bold text-slate-600">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailFetch.data.perStudent.map((s) => (
                            <tr key={s.id}>
                              <td className="px-2.5 py-1.5 font-semibold text-slate-700">{s.name}</td>
                              <td className="px-2.5 py-1.5 text-center text-emerald-600">{s.present}</td>
                              <td className="px-2.5 py-1.5 text-center text-rose-600">{s.absent}</td>
                              <td className="px-2.5 py-1.5 text-center text-amber-600">{s.late}</td>
                              <td className="px-2.5 py-1.5 text-center font-bold text-slate-700">{s.rate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-center">
              <p className="text-3xl font-extrabold text-slate-900">{data.totalDaysRecorded}</p>
              <p className="text-sm font-semibold text-slate-500">Total Days Recorded in {data.year}</p>
              <p className="mt-1 text-xs text-slate-400">Click a month card above to view detailed breakdown</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
