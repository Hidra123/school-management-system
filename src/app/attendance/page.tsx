"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  EmptyState,
  Loader,
  PageHeader,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import AppShell from "@/components/AppShell";
import { cls, postJSON, todayStr, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };
type StudentLight = {
  id: number;
  admissionNo: string;
  name: string;
  gender: "male" | "female";
};
type AttRow = { id: number; studentId: number; status: string };

const STATUSES = [
  { key: "present", label: "Present", icon: "✅", active: "bg-emerald-500 text-white ring-emerald-500", idle: "text-emerald-600 hover:bg-emerald-50" },
  { key: "absent", label: "Absent", icon: "❌", active: "bg-rose-500 text-white ring-rose-500", idle: "text-rose-600 hover:bg-rose-50" },
  { key: "late", label: "Late", icon: "🕒", active: "bg-amber-500 text-white ring-amber-500", idle: "text-amber-600 hover:bg-amber-50" },
  { key: "excused", label: "Excused", icon: "📝", active: "bg-sky-500 text-white ring-sky-500", idle: "text-sky-600 hover:bg-sky-50" },
];

export default function AttendancePage() {
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const classesFetch = useFetch<ClassRow[]>("/api/classes");
  const classList = classesFetch.data ?? [];

  const studentsUrl = useMemo(
    () => (classId ? `/api/students?classId=${classId}` : null),
    [classId],
  );
  const attUrl = useMemo(
    () => (classId && date ? `/api/attendance?classId=${classId}&date=${date}` : null),
    [classId, date],
  );

  const studentsFetch = useFetch<StudentLight[]>(studentsUrl);
  const attFetch = useFetch<AttRow[]>(attUrl);
  const studentList = studentsFetch.data ?? [];
  const attRows = attFetch.data ?? [];

  // Merge existing records into the editable map (default: present)
  useEffect(() => {
    if (!studentList.length) {
      setStatusMap({});
      return;
    }
    const m: Record<number, string> = {};
    for (const s of studentList) m[s.id] = "present";
    for (const a of attRows) m[a.studentId] = a.status;
    setStatusMap(m);
  }, [studentList, attRows]);

  function setAll(status: string) {
    const m: Record<number, string> = {};
    for (const s of studentList) m[s.id] = status;
    setStatusMap(m);
  }

  function counts() {
    const c: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const s of studentList) {
      const st = statusMap[s.id] ?? "present";
      if (st in c) c[st] += 1;
    }
    return c;
  }
  const c = counts();

  async function save() {
    if (!classId || !studentList.length) {
      setErrMsg("Select a class with students first.");
      return;
    }
    setSaving(true);
    setErrMsg(null);
    setMsg(null);
    try {
      const records = studentList.map((s) => ({
        studentId: s.id,
        status: statusMap[s.id] ?? "present",
      }));
      await postJSON("/api/attendance", { classId: Number(classId), date, records });
      setMsg(`✅ Attendance for ${date} saved for ${records.length} students.`);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const selClass = classList.find((c2) => String(c2.id) === classId);

  return (
    <AppShell permission="attendance.view">
    <div>
      <PageHeader icon="✅" title="Attendance" subtitle="Mark attendance for a class and date" />

      {/* Controls */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
              <option value="">— Select class —</option>
              {classList.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name}
                  {cl.section ? ` — ${cl.section}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cls(inputCls, "sm:w-44")}
            />
          </div>
          <button onClick={save} disabled={saving || !classId} className={btnPrimary}>
            {saving ? "Saving..." : "💾 Save Attendance"}
          </button>
        </div>

        {msg && (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-700">
            {msg}
          </p>
        )}
        {errMsg && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">
            {errMsg}
          </p>
        )}

        {/* Summary + quick actions */}
        {classId && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="mr-1 text-sm font-bold text-slate-700">Summary:</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              ✅ Present: {c.present}
            </span>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
              ❌ Absent: {c.absent}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              🕒 Late: {c.late}
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
              📝 Excused: {c.excused}
            </span>
            <span className="ml-auto flex gap-2">
              <button onClick={() => setAll("present")} className={btnGhost}>
                All Present
              </button>
              <button onClick={() => setAll("absent")} className={btnGhost}>
                All Absent
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Student list */}
      <div className="mt-6">
        {!classId ? (
          <EmptyState icon="🗂️" title="Select a class" message="Choose a class and date to start marking attendance." />
        ) : studentsFetch.loading ? (
          <Loader label="Loading students..." />
        ) : studentList.length === 0 ? (
          <EmptyState icon="👨‍🎓" title="No students in this class" message="Add students to this class first." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
              <p className="text-sm font-bold text-slate-700">
                {selClass?.name} — {studentList.length} student{studentList.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs font-semibold text-slate-500">Date: {date}</p>
            </div>
            <ul className="divide-y divide-slate-50">
              {studentList.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 transition hover:bg-slate-50/60">
                  <Avatar name={s.name} tone={s.gender === "female" ? "rose" : "indigo"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.admissionNo}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((st) => {
                      const active = (statusMap[s.id] ?? "present") === st.key;
                      return (
                        <button
                          key={st.key}
                          onClick={() => setStatusMap({ ...statusMap, [s.id]: st.key })}
                          className={cls(
                            "rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition",
                            active
                              ? cls(st.active, "ring-transparent text-white")
                              : cls("bg-white ring-slate-200", st.idle),
                          )}
                        >
                          {st.icon} {st.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    </AppShell>
  );
}
