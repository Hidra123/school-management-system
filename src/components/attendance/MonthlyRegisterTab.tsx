"use client";

import { Fragment, useMemo, useState } from "react";
import { EmptyState, Loader, inputCls } from "@/components/ui";
import { MONTH_NAMES, STATUS_LETTER, type AttendanceStatus, currentYearMonth } from "@/lib/attendanceHelpers";
import { cls, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };
type DayCell = { morning: AttendanceStatus | null; afternoon: AttendanceStatus | null };
type StudentRow = {
  id: number;
  name: string;
  gender: "male" | "female";
  admissionNo: string;
  days: Record<string, DayCell>;
  totals: { present: number; absent: number; late: number };
};
type MonthlyData = {
  className: string;
  section: string;
  month: number;
  year: number;
  daysInMonth: number;
  students: StudentRow[];
};

function letterFor(status: AttendanceStatus | null): string {
  if (!status) return "-";
  return STATUS_LETTER[status];
}

function colorFor(status: AttendanceStatus | null): string {
  if (status === "present") return "text-emerald-600";
  if (status === "absent") return "text-rose-600 font-bold";
  if (status === "late") return "text-amber-600 font-bold";
  if (status === "excused") return "text-sky-600";
  return "text-slate-300";
}

export default function MonthlyRegisterTab({ classes }: { classes: ClassRow[] }) {
  const now = currentYearMonth();
  const [classId, setClassId] = useState("");
  const [month, setMonth] = useState(String(now.month));
  const [year, setYear] = useState(String(now.year));
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  const url = classId ? `/api/attendance/monthly?classId=${classId}&month=${month}&year=${year}` : null;
  const { data, loading, error } = useFetch<MonthlyData>(loadedUrl);

  const dayNumbers = useMemo(() => (data ? Array.from({ length: data.daysInMonth }, (_, i) => i + 1) : []), [data]);

  function load() {
    if (!classId) return;
    setLoadedUrl(url);
  }

  function printRegister() {
    window.print();
  }

  function exportCsv() {
    if (!data) return;
    const header = ["SID", "Name", "Sex", ...dayNumbers.flatMap((d) => [`${d}-M`, `${d}-A`]), "Total P", "Total A", "Total L"];
    const rows = data.students.map((s, i) => [
      String(i + 1),
      s.name,
      s.gender,
      ...dayNumbers.flatMap((d) => {
        const cell = s.days[String(d)] ?? { morning: null, afternoon: null };
        return [letterFor(cell.morning), letterFor(cell.afternoon)];
      }),
      String(s.totals.present),
      String(s.totals.absent),
      String(s.totals.late),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance-register-${data.className}-${MONTH_NAMES[data.month - 1]}-${data.year}.csv`;
    link.click();
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">📋 Monthly Attendance Register (PDF Format)</p>
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
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            🔍 Load Register
          </button>
        </div>

        {data && (
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
            <button onClick={printRegister} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">
              🖨️ Print Register
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600">
              📤 Export CSV
            </button>
          </div>
        )}

        {!loadedUrl ? (
          <EmptyState icon="🗂️" title="Select class, month & year" message="Choose a class then click Load Register." />
        ) : loading ? (
          <Loader label="Loading register..." />
        ) : error ? (
          <EmptyState icon="⚠️" title="Failed to load" message={error} />
        ) : !data || data.students.length === 0 ? (
          <EmptyState icon="👨‍🎓" title="No students" message="This class has no students yet." />
        ) : (
          <div className="p-5">
            <div className="mb-4 rounded-2xl bg-slate-900 px-6 py-4 text-center text-white">
              <p className="text-lg font-extrabold tracking-wide">SHULEHUB SCHOOL</p>
              <p className="text-xs text-slate-300">STUDENTS ATTENDANCE REGISTER</p>
              <p className="mt-1 text-sm font-semibold text-indigo-300">
                CLASS: {data.className}{data.section ? ` ${data.section}` : ""} &nbsp;·&nbsp; MONTH: {MONTH_NAMES[data.month - 1]} &nbsp;·&nbsp; YEAR: {data.year}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-max border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="sticky left-0 z-10 min-w-[28px] border border-slate-200 bg-slate-100 px-1.5 py-1.5 font-bold">SID</th>
                    <th className="sticky left-[28px] z-10 min-w-[160px] border border-slate-200 bg-slate-100 px-2 py-1.5 text-left font-bold">Name</th>
                    <th className="min-w-[60px] border border-slate-200 px-1.5 py-1.5 font-bold">Sex</th>
                    {dayNumbers.map((d) => (
                      <th key={d} colSpan={2} className="border border-slate-200 px-1 py-1.5 font-bold">{d}</th>
                    ))}
                    <th className="min-w-[36px] border border-slate-200 bg-emerald-50 px-1.5 py-1.5 font-bold text-emerald-700">P</th>
                    <th className="min-w-[36px] border border-slate-200 bg-rose-50 px-1.5 py-1.5 font-bold text-rose-700">A</th>
                    <th className="min-w-[36px] border border-slate-200 bg-amber-50 px-1.5 py-1.5 font-bold text-amber-700">L</th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-400">
                    <th className="sticky left-0 z-10 border border-slate-200 bg-slate-50" />
                    <th className="sticky left-[28px] z-10 border border-slate-200 bg-slate-50" />
                    <th className="border border-slate-200" />
                    {dayNumbers.map((d) => (
                      <Fragment key={`h-${d}`}>
                        <th className="border border-slate-200 px-1 py-1 font-semibold">M</th>
                        <th className="border border-slate-200 px-1 py-1 font-semibold">A</th>
                      </Fragment>
                    ))}
                    <th className="border border-slate-200" />
                    <th className="border border-slate-200" />
                    <th className="border border-slate-200" />
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s, i) => (
                    <tr key={s.id} className="odd:bg-white even:bg-slate-50/50">
                      <td className="sticky left-0 z-10 border border-slate-200 bg-inherit px-1.5 py-1 text-center">{i + 1}</td>
                      <td className="sticky left-[28px] z-10 border border-slate-200 bg-inherit px-2 py-1 font-semibold text-slate-800">{s.name}</td>
                      <td className="border border-slate-200 px-1 py-1 text-center">{s.gender === "female" ? "Female" : "Male"}</td>
                      {dayNumbers.map((d) => {
                        const cell = s.days[String(d)] ?? { morning: null, afternoon: null };
                        return (
                          <Fragment key={`c-${d}`}>
                            <td className={cls("border border-slate-200 px-1 py-1 text-center", colorFor(cell.morning))}>{letterFor(cell.morning)}</td>
                            <td className={cls("border border-slate-200 px-1 py-1 text-center", colorFor(cell.afternoon))}>{letterFor(cell.afternoon)}</td>
                          </Fragment>
                        );
                      })}
                      <td className="border border-slate-200 bg-emerald-50/60 px-1.5 py-1 text-center font-bold text-emerald-700">{s.totals.present}</td>
                      <td className="border border-slate-200 bg-rose-50/60 px-1.5 py-1 text-center font-bold text-rose-700">{s.totals.absent}</td>
                      <td className="border border-slate-200 bg-amber-50/60 px-1.5 py-1 text-center font-bold text-amber-700">{s.totals.late}</td>
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
