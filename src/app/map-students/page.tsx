"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Badge,
  EmptyState,
  Loader,
  Modal,
  PageHeader,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { staffRoleLabel } from "@/lib/permissions";
import { cls, postJSON, useFetch } from "@/lib/utils";

type SubjectItem = {
  id: number;
  name: string;
  code: string;
  isOptional: boolean;
  department: string;
  mappedCount: number;
};

type ClassItem = {
  id: number;
  name: string;
  section: string;
};

type StudentItem = {
  id: number;
  name: string;
  gender: "male" | "female";
  admissionNo: string;
  classId: number | null;
  isMapped: boolean;
};

type MappingResponse = {
  subjects: SubjectItem[];
  classes: ClassItem[];
  students: StudentItem[];
};

export default function MapStudentsPage() {
  const { user } = useAuth();

  // Selections
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchStudent, setSearchStudent] = useState<string>("");

  // Manage optional subjects modal
  const [manageOptionalOpen, setManageOptionalOpen] = useState<boolean>(false);
  const [togglingSubjectId, setTogglingSubjectId] = useState<number | null>(null);

  // Save states
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Fetch mapping data
  const queryUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedClassId) p.set("classId", selectedClassId);
    if (selectedSubjectId) p.set("subjectId", String(selectedSubjectId));
    const qs = p.toString();
    return qs ? `/api/students/mapping?${qs}` : "/api/students/mapping";
  }, [selectedClassId, selectedSubjectId]);

  const mappingFetch = useFetch<MappingResponse>(queryUrl);
  const data = mappingFetch.data;

  // Optional subjects list (subjects marked isOptional)
  const optionalSubjects = useMemo(() => {
    return (data?.subjects ?? []).filter((s) => s.isOptional);
  }, [data?.subjects]);

  // Selected subject object
  const selectedSubject = useMemo(() => {
    return (data?.subjects ?? []).find((s) => s.id === selectedSubjectId) ?? null;
  }, [data?.subjects, selectedSubjectId]);

  // Selected class object
  const selectedClass = useMemo(() => {
    return (data?.classes ?? []).find((c) => String(c.id) === selectedClassId) ?? null;
  }, [data?.classes, selectedClassId]);

  // Sync selectedStudentIds when students load
  useMemo(() => {
    if (data?.students) {
      const mapped = new Set<number>();
      for (const s of data.students) {
        if (s.isMapped) mapped.add(s.id);
      }
      setSelectedStudentIds(mapped);
      setHasUnsavedChanges(false);
    }
  }, [data?.students, selectedSubjectId, selectedClassId]);

  // Filter students by search input
  const filteredStudents = useMemo(() => {
    const list = data?.students ?? [];
    if (!searchStudent.trim()) return list;
    const q = searchStudent.toLowerCase();
    return list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q),
    );
  }, [data?.students, searchStudent]);

  // Toggle single student
  function toggleStudent(studentId: number) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
    setHasUnsavedChanges(true);
  }

  // Select all / Deselect all
  function toggleAllStudents() {
    const allIds = filteredStudents.map((s) => s.id);
    const allSelected = allIds.every((id) => selectedStudentIds.has(id));

    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }
      return next;
    });
    setHasUnsavedChanges(true);
  }

  // Save Mapping
  async function handleSaveMapping() {
    if (!selectedSubjectId || !selectedClassId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await postJSON<{ ok: boolean; mappedCount: number }>("/api/students/mapping", {
        classId: Number(selectedClassId),
        subjectId: selectedSubjectId,
        studentIds: Array.from(selectedStudentIds),
      });
      setHasUnsavedChanges(false);
      setSaveMsg(`✅ Successfully mapped ${res.mappedCount} student(s) to ${selectedSubject?.name}.`);
      mappingFetch.refresh();
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save mapping.");
    } finally {
      setSaving(false);
    }
  }

  // Toggle subject optionality in modal
  async function handleToggleSubjectOptional(subjectId: number, currentOptional: boolean) {
    setTogglingSubjectId(subjectId);
    try {
      await postJSON("/api/students/mapping", {
        action: "toggle_optional",
        subjectId,
        isOptional: !currentOptional,
      });
      mappingFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle optional subject.");
    } finally {
      setTogglingSubjectId(null);
    }
  }

  const roleBadge = user?.role === "member" ? staffRoleLabel(user.staffRole) : "🛡️ Admin";

  return (
    <AppShell permission="students.map">
      <div className="space-y-4">
        {/* Header */}
        <PageHeader
          icon="👥"
          title="Map Students to Subjects"
          subtitle="Enrol students in optional and elective subjects for their form level"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
              {roleBadge}
            </span>
          </div>
        </PageHeader>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-950">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-black text-white">
            i
          </span>
          <div className="leading-relaxed">
            <p className="font-extrabold text-indigo-950 text-sm mb-0.5">Student–Subject Mapping</p>
            <p className="text-slate-700">
              Select an <b>Optional</b> subject on the left, choose a class, then tick the students enrolled in that subject. Only mapped students will appear when submitting scores for that subject.
            </p>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* ==================== LEFT: OPTIONAL SUBJECTS ==================== */}
          <div className="space-y-3 lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-white">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>📖</span>
                  <span>Optional Subjects</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => mappingFetch.refresh()}
                    className="rounded-lg bg-white/10 p-1.5 text-xs text-white hover:bg-white/20 transition"
                    title="Refresh subjects list"
                  >
                    🔄
                  </button>
                  <button
                    onClick={() => setManageOptionalOpen(true)}
                    className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 text-xs font-bold text-white transition"
                    title="Choose which subjects are optional"
                  >
                    ⚙️ Manage
                  </button>
                </div>
              </div>

              <div className="p-3.5 space-y-2 max-h-[640px] overflow-y-auto">
                {mappingFetch.loading && !data ? (
                  <Loader label="Loading optional subjects..." />
                ) : optionalSubjects.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">No subjects marked as optional yet.</p>
                    <p className="mt-1">Click <b>⚙️ Manage</b> above to choose which subjects are elective/optional.</p>
                  </div>
                ) : (
                  optionalSubjects.map((s) => {
                    const isSelected = selectedSubjectId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedSubjectId(s.id);
                          setSaveMsg(null);
                        }}
                        className={cls(
                          "flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition",
                          isSelected
                            ? "border-violet-600 bg-violet-50/80 ring-2 ring-violet-500 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70",
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cls(
                              "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base shadow-sm font-bold",
                              isSelected
                                ? "bg-violet-600 text-white"
                                : "bg-slate-100 text-slate-700",
                            )}
                          >
                            📖
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-slate-900 truncate">{s.name}</p>
                            <p className="text-[11px] font-semibold text-slate-400">
                              Code: <span className="font-mono text-slate-600">{s.code || "—"}</span> |{" "}
                              <span className="text-slate-500">{s.department}</span>
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          {s.mappedCount} mapped
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ==================== RIGHT: STUDENT MAPPING LIST ==================== */}
          <div className="space-y-3 lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="bg-slate-900 px-5 py-3 text-white">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>👥</span>
                  <span>
                    {selectedSubject
                      ? `Map Students: ${selectedSubject.name} (${selectedSubject.code})`
                      : "Select a subject to map students"}
                  </span>
                </div>
              </div>

              {/* Filters Header */}
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSaveMsg(null);
                    }}
                    className={cls(inputCls, "text-xs font-bold")}
                  >
                    <option value="">-- Select Class --</option>
                    {(data?.classes ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.section ? `(${c.section})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="Search student..."
                    disabled={!selectedClassId}
                    className={cls(inputCls, "text-xs", !selectedClassId && "opacity-50")}
                  />
                </div>
              </div>

              {/* Success / Info message */}
              {saveMsg && (
                <div className="mx-4 mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  {saveMsg}
                </div>
              )}

              {/* Body */}
              {!selectedSubjectId || !selectedClassId ? (
                <div className="py-20 text-center text-slate-400">
                  <p className="text-3xl mb-2">←</p>
                  <p className="text-sm font-bold text-slate-600">Pick a subject and class first</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Select an optional subject on the left, then select a class above to see and enrol students.
                  </p>
                </div>
              ) : mappingFetch.loading ? (
                <div className="py-16">
                  <Loader label="Loading students..." />
                </div>
              ) : filteredStudents.length === 0 ? (
                <EmptyState
                  icon="👨‍🎓"
                  title="No students found"
                  message={
                    searchStudent
                      ? "No students match your search query."
                      : "This class currently has no enrolled students."
                  }
                />
              ) : (
                <div>
                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-4 py-2.5 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={toggleAllStudents}
                      className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 transition"
                    >
                      {filteredStudents.every((s) => selectedStudentIds.has(s.id))
                        ? "Deselect All"
                        : "Select All"}
                    </button>

                    <div className="text-xs text-slate-600">
                      Enrolled:{" "}
                      <span className="font-extrabold text-indigo-700">
                        {filteredStudents.filter((s) => selectedStudentIds.has(s.id)).length}
                      </span>{" "}
                      / {filteredStudents.length} students
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveMapping}
                      disabled={saving || !hasUnsavedChanges}
                      className={cls(
                        btnPrimary,
                        "text-xs font-bold py-1.5 px-4",
                        !hasUnsavedChanges && "opacity-50 cursor-default",
                      )}
                    >
                      {saving ? "Saving..." : hasUnsavedChanges ? "💾 Save Mapping" : "✓ Saved"}
                    </button>
                  </div>

                  {/* Student Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">
                            <input
                              type="checkbox"
                              checked={
                                filteredStudents.length > 0 &&
                                filteredStudents.every((s) => selectedStudentIds.has(s.id))
                              }
                              onChange={toggleAllStudents}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-3 py-2 text-left font-extrabold uppercase">Adm No</th>
                          <th className="px-3 py-2 text-left font-extrabold uppercase">Student Name</th>
                          <th className="px-3 py-2 text-left font-extrabold uppercase">Gender</th>
                          <th className="px-3 py-2 text-center font-extrabold uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((s) => {
                          const isChecked = selectedStudentIds.has(s.id);
                          return (
                            <tr
                              key={s.id}
                              onClick={() => toggleStudent(s.id)}
                              className={cls(
                                "cursor-pointer transition",
                                isChecked ? "bg-indigo-50/50 hover:bg-indigo-50" : "hover:bg-slate-50",
                              )}
                            >
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleStudent(s.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-slate-600">{s.admissionNo}</td>
                              <td className="px-3 py-2 font-bold text-slate-900">{s.name}</td>
                              <td className="px-3 py-2 capitalize text-slate-600">{s.gender}</td>
                              <td className="px-3 py-2 text-center">
                                {isChecked ? (
                                  <Badge tone="emerald">✅ Mapped</Badge>
                                ) : (
                                  <Badge tone="slate">Not Enrolled</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Footer */}
                  <div className="flex items-center justify-between border-t border-slate-100 p-4">
                    <span className="text-xs text-slate-500">
                      Changes only affect score entry for <b>{selectedSubject?.name}</b> in <b>{selectedClass?.name}</b>.
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveMapping}
                      disabled={saving || !hasUnsavedChanges}
                      className={cls(btnPrimary, "text-xs font-bold")}
                    >
                      {saving ? "Saving..." : hasUnsavedChanges ? "💾 Save Changes" : "✓ Up to date"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal: Manage Optional Subjects */}
        {manageOptionalOpen && (
          <Modal
            open={manageOptionalOpen}
            onClose={() => setManageOptionalOpen(false)}
            title="⚙️ Manage Optional & Elective Subjects"
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Tiki masomo yaliyo ya hiari (elective/optional). Masomo yaliyo ya lazima kwa kila mwanafunzi (compulsory core subjects kama Kiswahili, Math, English) yaache bila tiki ili wanafunzi wote waingizwe kiotomatiki.
              </p>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {(data?.subjects ?? []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{s.name}</p>
                      <p className="text-[10px] text-slate-400">
                        Code: {s.code || "—"} | {s.department}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={togglingSubjectId === s.id}
                      onClick={() => handleToggleSubjectOptional(s.id, s.isOptional)}
                      className={cls(
                        "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                        s.isOptional
                          ? "bg-violet-600 text-white hover:bg-violet-700"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      {s.isOptional ? "★ Optional" : "Core (Compulsory)"}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManageOptionalOpen(false)}
                  className={btnPrimary}
                >
                  Done
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
