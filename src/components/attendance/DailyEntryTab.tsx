"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton, Avatar, EmptyState, Loader, StatCard, inputCls, useActionState } from "@/components/ui";
import {
  type AttendanceStatus,
  STATUS_LETTER,
  STATUS_STYLE,
  nextStatus,
} from "@/lib/attendanceHelpers";
import { cls, postJSON, todayStr, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };
type StudentLight = { id: number; admissionNo: string; name: string; gender: "male" | "female" };
type AttRow = { id: number; studentId: number; session: "morning" | "afternoon"; status: AttendanceStatus };

type Cell = { morning: AttendanceStatus; afternoon: AttendanceStatus };

function ToggleBtn({ value, onClick }: { value: AttendanceStatus; onClick: () => void }) {
  const style = STATUS_STYLE[value];
  return (
    <button
      type="button"
      onClick={onClick}
      title="Click to toggle status (Present → Absent → Late)"
      className={cls(
        "grid h-8 w-10 place-items-center rounded-lg text-xs font-extrabold shadow-sm transition active:scale-95",
        style.bg,
        style.text,
      )}
    >
      {STATUS_LETTER[value]}
    </button>
  );
}

export default function DailyEntryTab({ classes }: { classes: ClassRow[] }) {
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<number, Cell>>({});
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const { loading: saving, done, run } = useActionState();

  const studentsUrl = useMemo(() => (classId ? `/api/students?classId=${classId}` : null), [classId]);
  const attUrl = useMemo(
    () => (classId && date ? `/api/attendance?classId=${classId}&date=${date}` : null),
    [classId, date],
  );
  const studentsFetch = useFetch<StudentLight[]>(studentsUrl);
  const attFetch = useFetch<AttRow[]>(attUrl);
  const studentList = studentsFetch.data ?? [];

  const key = `${classId}|${date}`;

  function load() {
    if (!classId) {
      setErrMsg("Select a class first.");
      return;
    }
    setErrMsg(null);
    studentsFetch.refresh();
    attFetch.refresh();
    setLoadedKey(key);
  }

  useEffect(() => {
    if (loadedKey !== key) return;
    if (!studentList.length) {
      setStatusMap({});
      return;
    }
    const m: Record<number, Cell> = {};
    for (const s of studentList) m[s.id] = { morning: "present", afternoon: "present" };
    for (const a of attFetch.data ?? []) {
      if (!m[a.studentId]) m[a.studentId] = { morning: "present", afternoon: "present" };
      m[a.studentId][a.session] = a.status;
    }
    setStatusMap(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentList, attFetch.data, loadedKey]);

  function toggle(studentId: number, session: "morning" | "afternoon") {
    setStatusMap((prev) => {
      const cell = prev[studentId] ?? { morning: "present", afternoon: "present" };
      return { ...prev, [studentId]: { ...cell, [session]: nextStatus(cell[session]) } };
    });
  }

  function markAllPresent() {
    const m: Record<number, Cell> = {};
    for (const s of studentList) m[s.id] = { morning: "present", afternoon: "present" };
    setStatusMap(m);
  }

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    for (const s of studentList) {
      const st = statusMap[s.id]?.morning ?? "present";
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "late") late++;
    }
    const total = studentList.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, total, rate };
  }, [studentList, statusMap]);

  async function save() {
    if (!classId || loadedKey !== key || studentList.length === 0) {
      setErrMsg("Load a class + date first, then mark attendance.");
      return;
    }
    setErrMsg(null);
    try {
      await run(async () => {
        const records = studentList.map((s) => ({
          studentId: s.id,
          morning: statusMap[s.id]?.morning ?? "present",
          afternoon: statusMap[s.id]?.afternoon ?? "present",
        }));
        try {
          await postJSON("/api/attendance", { classId: Number(classId), date, records });
        } catch (e) {
          setErrMsg(e instanceof Error ? e.message : "Failed to save.");
          throw e;
        }
      });
    } catch {
      /* handled above */
    }
  }

  function printRegister() {
    window.print();
  }

  const selClass = classes.find((c) => String(c.id) === classId);

  return (
    <div>
      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="🟢" label="Present" value={stats.present} tone="emerald" />
        <StatCard icon="🔴" label="Absent" value={stats.absent} tone="rose" />
        <StatCard icon="🕒" label="Late" value={stats.late} tone="amber" />
        <StatCard icon="📈" label="Rate %" value={`${stats.rate}%`} tone="indigo" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="bg-slate-900 px-5 py-3">
          <p className="text-sm font-bold text-white">📅 Daily Attendance Entry</p>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
              <option value="">--</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.section ? ` — ${c.section}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cls(inputCls, "sm:w-44")} />
          </div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            🔍 Load
          </button>
          <button onClick={markAllPresent} disabled={!studentList.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
            ✔️ All Present
          </button>
        </div>

        <p className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-2.5 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> P = Present</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> A = Absent</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> L = Late</span>
          <span className="ml-auto italic">👆 Click a button to toggle status</span>
        </p>

        {errMsg && (
          <p className="mx-5 mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">{errMsg}</p>
        )}

        {loadedKey !== key ? (
          <EmptyState icon="🗂️" title="Select class & date" message="Choose a class and date, then click Load to start marking attendance." />
        ) : studentsFetch.loading ? (
          <Loader label="Loading students..." />
        ) : studentList.length === 0 ? (
          <EmptyState icon="👨‍🎓" title="No students in this class" message="Add students to this class first." />
        ) : (
          <>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">Student Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-bold">Sex</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold">Morning</th>
                    <th className="px-3 py-2.5 text-center text-xs font-bold">Afternoon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentList.map((s, i) => {
                    const cell = statusMap[s.id] ?? { morning: "present", afternoon: "present" };
                    return (
                      <tr key={s.id} className="transition hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.name} tone={s.gender === "female" ? "rose" : "indigo"} />
                            <span className="font-semibold text-slate-800">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{s.gender === "female" ? "Female" : "Male"}</td>
                        <td className="px-3 py-2 text-center">
                          <ToggleBtn value={cell.morning} onClick={() => toggle(s.id, "morning")} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <ToggleBtn value={cell.afternoon} onClick={() => toggle(s.id, "afternoon")} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-emerald-100 bg-emerald-50/60 px-5 py-3 text-xs font-bold text-emerald-800">
              <span>👥 Total: {stats.total}</span>
              <span>✔️ Present: {stats.present}</span>
              <span>✖️ Absent: {stats.absent}</span>
              <span>🕒 Late: {stats.late}</span>
              <span>📊 Rate: {stats.rate}%</span>
            </div>

            <div className="flex flex-wrap justify-end gap-2 px-5 py-4">
              <ActionButton onClick={save} loading={saving} done={done} doneText="Saved!">
                💾 Save Attendance
              </ActionButton>
              <button onClick={printRegister} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700">
                🖨️ Print
              </button>
            </div>
          </>
        )}
      </div>

      {selClass && loadedKey === key && studentList.length > 0 && (
        <p className="mt-2 text-right text-xs text-slate-400">
          {selClass.name}{selClass.section ? ` — ${selClass.section}` : ""} · {date}
        </p>
      )}
    </div>
  );
}
