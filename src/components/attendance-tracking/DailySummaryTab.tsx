"use client";

import { useState } from "react";
import { EmptyState, Loader, StatCard, inputCls } from "@/components/ui";
import { cls, todayStr, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };
type StudentRow = {
  id: number;
  name: string;
  gender: "male" | "female";
  className: string | null;
  morning: string | null;
  afternoon: string | null;
};
type SummaryData = {
  date: string;
  registered: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
  students: StudentRow[];
};

function statusLabel(s: string | null): string {
  if (!s) return "—";
  return { present: "Present", absent: "Absent", late: "Late", excused: "Excused" }[s] ?? s;
}
function statusColor(s: string | null): string {
  if (s === "present") return "text-emerald-600 font-bold";
  if (s === "absent") return "text-rose-600 font-bold";
  if (s === "late") return "text-amber-600 font-bold";
  if (s === "excused") return "text-sky-600 font-bold";
  return "text-slate-300";
}

export default function DailySummaryTab({ classes }: { classes: ClassRow[] }) {
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  function load() {
    setLoadedUrl(`/api/attendance/daily-summary?${classId ? `classId=${classId}&` : ""}date=${date}`);
  }

  const { data, loading, error } = useFetch<SummaryData>(loadedUrl);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="bg-slate-900 px-5 py-3">
        <p className="text-sm font-bold text-white">📅 Daily Attendance Summary — All Classes</p>
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Select Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Select Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cls(inputCls, "sm:w-48")} />
        </div>
        <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
          🔍 Load Report
        </button>
      </div>

      {!loadedUrl ? (
        <EmptyState icon="🗂️" title="Select class & date" message="Choose a class (or All Classes) and a date, then click Load Report." />
      ) : loading ? (
        <Loader label="Loading summary..." />
      ) : error ? (
        <EmptyState icon="⚠️" title="Could not load summary" message={error} />
      ) : !data ? null : (
        <div className="p-5">
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatCard icon="👥" label="Registered" value={data.registered} tone="slate" />
            <StatCard icon="🟢" label="Present" value={data.present} tone="emerald" />
            <StatCard icon="🔴" label="Absent" value={data.absent} tone="rose" />
            <StatCard icon="🕒" label="Late" value={data.late} tone="amber" />
            <StatCard icon="📈" label="Rate %" value={`${data.rate}%`} tone="indigo" />
          </div>

          {data.students.length === 0 ? (
            <EmptyState icon="👨‍🎓" title="No students" message="No students found for this selection." />
          ) : (
            <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 text-white">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">Student Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">Sex</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">Class</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold">Morning</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold">Afternoon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.students.map((s, i) => (
                    <tr key={s.id} className="odd:bg-white even:bg-slate-50/50">
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{s.name}</td>
                      <td className="px-3 py-2 text-slate-500">{s.gender === "female" ? "Female" : "Male"}</td>
                      <td className="px-3 py-2"><span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">{s.className ?? "—"}</span></td>
                      <td className={cls("px-3 py-2 text-center", statusColor(s.morning))}>{statusLabel(s.morning)}</td>
                      <td className={cls("px-3 py-2 text-center", statusColor(s.afternoon))}>{statusLabel(s.afternoon)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
