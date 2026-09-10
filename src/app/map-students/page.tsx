"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Badge, EmptyState, Loader, PageHeader, inputCls } from "@/components/ui";
import { cls, putJSON, useFetch } from "@/lib/utils";

type SubjectOpt = { id: number; name: string; code: string; mappedCount: number };
type ClassRow = { id: number; name: string; section: string };
type MappingList = { subjects: SubjectOpt[]; classes: ClassRow[] };
type StudentRow = { id: number; name: string; gender: string; admissionNo: string; admissionStatus: string; mapped: boolean };

export default function MapStudentsPage() {
  const baseFetch = useFetch<MappingList>("/api/subject-mapping");
  const base = baseFetch.data ?? null;
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const detailFetch = useFetch<StudentRow[]>(
    subjectId && classId ? `/api/subject-mapping?subjectId=${subjectId}&classId=${classId}` : null,
  );
  const students = useMemo(() => detailFetch.data ?? [], [detailFetch.data]);

  const shown = useMemo(
    () => students.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.admissionNo.toLowerCase().includes(search.toLowerCase())),
    [students, search],
  );

  function toggle(id: number) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDirty(true);
  }

  function toggleAll(list: StudentRow[]) {
    setSel((prev) => {
      const next = new Set(prev);
      const allOn = list.length > 0 && list.every((s) => next.has(s.id));
      for (const s of list) if (allOn) next.delete(s.id); else next.add(s.id);
      return next;
    });
    setDirty(true);
  }

  async function save() {
    if (!subjectId || !classId) return;
    setSaving(true);
    setMsg(null);
    try {
      await putJSON("/api/subject-mapping", {
        subjectId: Number(subjectId),
        classId: Number(classId),
        studentIds: Array.from(sel),
      });
      setMsg(`✅ Mapping saved — ${sel.size} student(s) enrolled in this subject for this class.`);
      setDirty(false);
      baseFetch.refresh();
      detailFetch.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const className = base?.classes.find((c) => String(c.id) === classId)?.name ?? "";
  const subjectName = base?.subjects.find((s) => String(s.id) === subjectId)?.name ?? "";

  return (
    <AppShell permission="students.edit">
      <PageHeader icon="🧩" title="Map Students to Subjects" subtitle="Select an Optional subject, choose a class, then tick the students enrolled in that subject. Only mapped students will appear when submitting scores for that subject." />

      <div className="mb-4 rounded-xl border-l-4 border-violet-400 bg-violet-50 px-4 py-3 text-xs font-semibold text-violet-700">
        ℹ️ Student–Subject Mapping — Select an Optional subject on the left, choose a class, then tick the students enrolled in that subject. Only mapped students will appear when submitting scores for that subject.
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* LEFT — Optional subjects */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between bg-slate-900 px-5 py-3">
            <p className="text-sm font-bold text-white">📘 Optional Subjects</p>
          </div>
          {baseFetch.loading ? (
            <Loader label="Loading subjects..." />
          ) : (base?.subjects.length ?? 0) === 0 ? (
            <EmptyState icon="📘" title="No optional subjects yet" message="Mark a subject as optional in Manage Subjects to start mapping." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {base!.subjects.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => { setSubjectId(String(s.id)); setSel(new Set()); setDirty(false); setMsg(null); }}
                    className={cls(
                      "flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition",
                      String(s.id) === subjectId ? "bg-violet-50 ring-1 ring-inset ring-violet-200" : "hover:bg-slate-50",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-bold text-slate-800">{s.name}</span>
                      <span className="text-xs font-medium text-slate-500">Code: {s.code || "—"}</span>
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      {s.mappedCount} mapped
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* RIGHT — Class + students */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-3">
          <div className="bg-slate-900 px-5 py-3">
            <p className="text-sm font-bold text-white">🧑‍🎓 {subjectId ? `Map: ${subjectName}` : "Select a subject to map students"}</p>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-end">
            <div className="sm:w-56">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Class</label>
              <select
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSel(new Set()); setDirty(false); setMsg(null); }}
                disabled={!subjectId}
                className={inputCls}
              >
                <option value="">-- Select Class --</option>
                {(base?.classes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.section ? ` — ${c.section}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Search</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student…" className={inputCls} />
            </div>
            {students.length > 0 && sel.size === 0 && (
              <button
                onClick={() => setSel(new Set(students.filter((s) => s.mapped).map((s) => s.id)))}
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-600 hover:bg-violet-100"
              >
                ↩ Preselect current mapping
              </button>
            )}
          </div>

          {msg && <p className="mx-5 mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-700">{msg}</p>}

          {!subjectId ? (
            <div className="p-5"><EmptyState icon="📘" title="Select an optional subject first" message="Pick a subject on the left to start mapping students." /></div>
          ) : !classId ? (
            <div className="p-5"><EmptyState icon="🏫" title="Choose a class" message="Then tick the students enrolled in the subject for this class." /></div>
          ) : detailFetch.loading ? (
            <Loader label="Loading students..." />
          ) : students.length === 0 ? (
            <div className="p-5"><EmptyState icon="👨‍🎓" title="No students in this class" message="There are no admittee students in this class yet." /></div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-2.5">
                <p className="text-xs font-semibold text-slate-500">
                  {sel.size} of {students.length} students selected{className ? ` for ${className}` : ""}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => toggleAll(shown)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50">
                    {shown.length > 0 && shown.every((s) => sel.has(s.id)) ? "✖ Unselect shown" : "✓ Select shown"}
                  </button>
                  {sel.size > 0 && (
                    <button onClick={() => { setSel(new Set()); setDirty(true); }} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50">
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <ul className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
                {shown.map((s) => {
                  const on = sel.has(s.id);
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => toggle(s.id)}
                        className={cls(
                          "flex w-full items-center gap-3 px-5 py-2.5 text-left transition",
                          on ? "bg-blue-50/80" : "hover:bg-slate-50",
                        )}
                      >
                        <span className={cls("grid h-6 w-6 place-items-center rounded-lg border-2 text-[11px] font-bold", on ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300 text-transparent")}>
                          ✓
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-bold text-slate-800">{s.name}</span>
                          <span className="text-xs font-mono text-slate-500">{s.admissionNo}</span>
                        </span>
                        <Badge tone={s.gender === "Female" ? "rose" : "blue"}>{s.gender}</Badge>
                        {s.admissionStatus === "pending" && <Badge tone="amber">pending</Badge>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5">
                <p className="text-xs font-semibold text-slate-500">
                  🔔 Only mapped students appear when submitting scores for this subject.
                </p>
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-40"
                >
                  💾 {saving ? "Saving..." : "Save Mapping"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
