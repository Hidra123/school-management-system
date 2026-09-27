"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  Field,
  Loader,
  PageHeader,
  btnGhost,
  btnPrimary,
  inputCls,
  scoreTone,
} from "@/components/ui";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { EXAM_TYPES } from "@/lib/examTypes";
import { cls, delJSON, postJSON, shortDate, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };
type SubjectRow = { id: number; name: string; code: string; isOptional?: boolean };
type StudentRow = { id: number; admissionNo: string; name: string; gender: "male" | "female" };
type GradeRow = {
  id: number;
  studentId: number;
  subjectId: number;
  examType: string;
  term: string;
  examId: number | null;
  score: number;
  createdAt: string;
  studentName: string;
  admissionNo: string;
  subjectName: string;
};
type ActiveExam = {
  id: number;
  name: string;
  examType: string;
  academicYear: string;
  classIds: number[];
  appliesToAllClasses: boolean;
};

const TERMS = ["Term 1", "Term 2", "Term 3", "Full Year"];

function examLabel(key: string): string {
  if (key === "SE") return "School Examination (SE)";
  if (key === "CA") return "Continuously Assessment (CAs)";
  const legacy: Record<string, string> = {
    midterm: "School Examination (SE)",
    final: "School Examination (SE)",
    assignment: "Continuously Assessment (CAs)",
    quiz: "Continuously Assessment (CAs)",
    project: "Continuously Assessment (CAs)",
  };
  return legacy[key] ?? key;
}

/** Step badge (1–4) for the step-by-step flow. */
function StepBadge({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  return (
    <span
      className={cls(
        "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-extrabold transition-all duration-300",
        done
          ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200"
          : active
            ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-200"
            : "bg-slate-100 text-slate-400",
      )}
    >
      {done ? "✓" : n}
    </span>
  );
}

export default function GradesPage() {
  const { user } = useAuth();

  // ---------- STEP STATE (1 Class → 2 Subject → 3 Exam Category → 4 Exam Name) ----------
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examType, setExamType] = useState(""); // Exam Category = Exam Type: SE | CA
  const [examId, setExamId] = useState("");
  const [term, setTerm] = useState("Term 1");

  const [scores, setScores] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState(true); // false = view mode (scores saved), true = editable
  const [saving, setSaving] = useState(false);
  const [entryMsg, setEntryMsg] = useState<string | null>(null);
  const [entryErr, setEntryErr] = useState<string | null>(null);

  // ---------- Records list (chini) ----------
  const [fClass, setFClass] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fExam, setFExam] = useState("");

  // ?strict=1 → Academic Master akiwa hapa anaona TU classes/subjects
  // alizopewa na admin (vilevile ukurasa wa Students ana classes ZOTE).
  const classesFetch = useFetch<ClassRow[]>("/api/classes?strict=1");
  const subjectsFetch = useFetch<SubjectRow[]>("/api/subjects?strict=1");
  // Exams ACTIVE tu — server inafilter status='active' (see /api/exams/active).
  const activeExamsFetch = useFetch<ActiveExam[]>("/api/exams/active");

  const classList = classesFetch.data ?? [];
  const subjectList = subjectsFetch.data ?? [];
  const allActiveExams = activeExamsFetch.data ?? [];

  const selectedClass = useMemo(() => classList.find((c) => String(c.id) === classId) ?? null, [classList, classId]);
  const selectedSubject = useMemo(
    () => subjectList.find((s) => String(s.id) === subjectId) ?? null,
    [subjectList, subjectId],
  );

  // STEP 4 options: active exams tied to the selected class AND the selected
  // category (SE/CA). "appliesToAllClasses" = active for every class.
  // Active exams for the selected class (all categories — category filtering
  // happens in step 3 so the dropdown only shows categories that HAVE exams).
  const examOptions = useMemo(
    () =>
      allActiveExams.filter(
        (e) => !classId || e.appliesToAllClasses || e.classIds.includes(Number(classId)),
      ),
    [allActiveExams, classId],
  );
  // Exam types (SE / CA) that actually have ACTIVE exams for this class.
  const activeExamTypes = useMemo(
    () => [...new Set(examOptions.map((e) => e.examType))],
    [examOptions],
  );
  const examOptionsForType = useMemo(
    () => examOptions.filter((e) => e.examType === examType),
    [examOptions, examType],
  );
  const selectedExam = useMemo(
    () => examOptionsForType.find((e) => String(e.id) === examId) ?? null,
    [examOptionsForType, examId],
  );

  // ---------- Steps status ----------
  const step1Done = !!classId;
  const step2Done = !!subjectId;
  const step3Done = !!examType;
  const step4Done = !!examId;
  const allStepsDone = step1Done && step2Done && step3Done && step4Done;

  // Safety: if the chosen category is no longer available for the selected
  // class (e.g. class changed and SE has no active exam for it), reset it so
  // the user cannot proceed with a hidden/disabled combination.
  useEffect(() => {
    if (examType && examOptions.length > 0 && !activeExamTypes.includes(examType)) {
      setExamType("");
      setExamId("");
      setScores({});
    }
  }, [examType, examOptions, activeExamTypes]);

  const entryStudentsUrl = useMemo(
    () =>
      classId
        ? `/api/students?classId=${classId}&strict=1${subjectId ? `&subjectId=${subjectId}` : ""}`
        : null,
    [classId, subjectId],
  );
  const entryGradesUrl = useMemo(
    () =>
      classId && subjectId && examType
        ? `/api/grades?classId=${classId}&subjectId=${subjectId}&examType=${examType}`
        : null,
    [classId, subjectId, examType],
  );

  const entryStudents = useFetch<StudentRow[]>(entryStudentsUrl);
  const entryGrades = useFetch<GradeRow[]>(entryGradesUrl);

  // Memoize — otherwise `?? []` creates a new array each render and (as a
  // dependency) causes an infinite render loop.
  const studentList = useMemo(() => entryStudents.data ?? [], [entryStudents.data]);
  const existingGrades = useMemo(() => entryGrades.data ?? [], [entryGrades.data]);

  useEffect(() => {
    if (!studentList.length) {
      setScores({});
      return;
    }
    const m: Record<number, string> = {};
    for (const s of studentList) m[s.id] = "";
    for (const g of existingGrades) m[g.studentId] = String(g.score);
    setScores(m);
  }, [studentList, existingGrades]);

  const entryCount = Object.values(scores).filter((v) => v.trim() !== "").length;

  // A student's score only counts as "submitted" (tick + green box) once it
  // is confirmed saved in the database AND the box still shows that exact
  // value. Editing an already-saved score clears its tick immediately, and
  // the tick only comes back after that new value is saved successfully —
  // it is never shown just because something is typed in the box.
  const savedScores = useMemo(() => {
    const m: Record<number, number> = {};
    for (const g of existingGrades) m[g.studentId] = g.score;
    return m;
  }, [existingGrades]);
  function isSubmitted(studentId: number): boolean {
    const saved = savedScores[studentId];
    if (saved === undefined) return false;
    return (scores[studentId] ?? "").trim() === String(saved);
  }
  const submittedCount = studentList.filter((s) => savedScores[s.id] !== undefined).length;

  async function saveEntry() {
    if (!classId || !subjectId || !examType || !examId) {
      setEntryErr("Complete all 4 steps (Class, Subject, Exam Category and Exam Name) before saving.");
      return;
    }
    if (entryCount === 0) {
      // Nothing typed at all — there is genuinely nothing to send to the
      // server. Partial entries (some students filled, some left blank) are
      // fully supported below: only the filled ones are sent, the rest are
      // simply skipped (no error), so a teacher can save 3 out of 51 today
      // and come back for the rest later.
      setEntryErr("Enter at least one student's score before saving — blank rows are fine and are just skipped.");
      return;
    }
    setSaving(true);
    setEntryErr(null);
    setEntryMsg(null);
    try {
      const entries = studentList
        .map((s) => {
          const raw = scores[s.id]?.trim();
          if (!raw) return null;
          const n = Number(raw);
          if (!Number.isFinite(n)) return null;
          return { studentId: s.id, score: Math.min(100, Math.max(0, n)) };
        })
        .filter((x): x is { studentId: number; score: number } => x !== null);
      await postJSON("/api/grades", {
        subjectId: Number(subjectId),
        examType,
        term,
        examId: Number(examId) || null,
        entries,
      });
      setEntryMsg(`✅ Scores for ${entries.length} students saved (${examLabel(examType)} — ${term}).`);
      setEditing(false);
      entryGrades.refresh();
    } catch (err) {
      setEntryErr(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  // ---------- Records list ----------
  const listUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (fClass) p.set("classId", fClass);
    if (fSubject) p.set("subjectId", fSubject);
    if (fExam) p.set("examType", fExam);
    const qs = p.toString();
    return qs ? `/api/grades?${qs}` : "/api/grades";
  }, [fClass, fSubject, fExam]);
  const records = useFetch<GradeRow[]>(listUrl);
  const gradeList = records.data ?? [];

  // When Class + Subject + Exam Category are all picked, we know exactly
  // which roster this table is about, so we can show EVERY student in that
  // class — not just the ones who already have a saved score — with an
  // explicit "Not submitted" placeholder for the rest. With looser filters
  // (or none) there is no single well-defined roster to complete against,
  // so the table just lists the grade records that exist, as before.
  const recordsFiltersComplete = !!(fClass && fSubject && fExam);
  const recordsRosterUrl = useMemo(
    () => (recordsFiltersComplete ? `/api/students?classId=${fClass}&subjectId=${fSubject}&strict=1` : null),
    [recordsFiltersComplete, fClass, fSubject],
  );
  const recordsRoster = useFetch<StudentRow[]>(recordsRosterUrl);

  type DisplayRow = { student: StudentRow; grade: GradeRow | null };
  const displayRows: DisplayRow[] | null = useMemo(() => {
    if (!recordsFiltersComplete) return null;
    const roster = recordsRoster.data ?? [];
    return roster.map((s) => ({ student: s, grade: gradeList.find((g) => g.studentId === s.id) ?? null }));
  }, [recordsFiltersComplete, recordsRoster.data, gradeList]);
  const recordsFSubjectName = subjectList.find((s) => String(s.id) === fSubject)?.name ?? "";

  async function removeGrade(g: GradeRow) {
    if (!window.confirm(`Delete ${g.studentName}'s score (${examLabel(g.examType)})?`)) return;
    try {
      await delJSON(`/api/grades/${g.id}`);
      records.refresh();
      entryGrades.refresh();
      recordsRoster.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }


  const stepBox = (
    n: number,
    title: string,
    done: boolean,
    active: boolean,
    children: React.ReactNode,
  ) => (
    <div
      className={cls(
        "rounded-2xl border p-5 shadow-lg transition-all duration-300",
        active
          ? "border-violet-300 bg-gradient-to-br from-violet-50 to-indigo-50 ring-2 ring-violet-200 shadow-violet-100/50"
          : "border-slate-200 bg-white",
        !active && done && "border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 ring-2 ring-emerald-200 shadow-emerald-100/50",
      )}
    >
      <p className={cls("mb-3 flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-wider", active || done ? "text-slate-700" : "text-slate-400")}>
        <StepBadge n={n} done={done} active={active} /> {title}
      </p>
      {children}
    </div>
  );

  return (
    <AppShell permission="grades.view">
      <div className="space-y-6">
        {user?.staffRole === "academic_master" && (
          <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2.5 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-100">
            🎓 As Academic Master you admit students in ALL classes (Students page), but here in Submit Scores you only see the classes and subjects assigned to you by the admin.
          </div>
        )}
        <PageHeader icon="📝" title="Submit Scores" subtitle="Step by step — pick Class, Subject, Exam Category and Exam Name, then enter the scores." />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ==================== LEFT: STEP BY STEP ==================== */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 lg:col-span-5">
            <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 px-6 py-4">
              <p className="text-sm font-bold text-white">📝 Score Submission</p>
              <p className="text-[11px] text-violet-100">Step-by-step grade entry workflow</p>
            </div>
            <div className="space-y-4 p-5">
              {stepBox(1, "Select Class", step1Done, true, (
                <select 
                  value={classId} 
                  onChange={(e) => { setClassId(e.target.value); setSubjectId(""); setExamType(""); setExamId(""); setScores({}); }} 
                  className={cls(inputCls, "transition-all duration-200 focus:ring-2 focus:ring-violet-200 focus:border-violet-400")}
                >
                  <option value="">— Select Class —</option>
                  {classList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.section ? ` — ${c.section}` : ""}
                    </option>
                  ))}
                </select>
              ))}
              {classList.length === 0 && !classesFetch.loading && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 border border-amber-200">
                  <span className="text-lg">⚠️</span>
                  <p className="text-xs font-semibold text-amber-700 leading-relaxed">
                    No classes assigned to you yet — ask the admin to assign classes via Manage Teachers.
                  </p>
                </div>
              )}

              {stepBox(2, "Select Subject", step2Done, step1Done, (
                <select
                  value={subjectId}
                  disabled={!step1Done}
                  onChange={(e) => { setSubjectId(e.target.value); setExamId(""); setScores({}); }}
                  className={cls(inputCls, !step1Done && "opacity-50", "transition-all duration-200 focus:ring-2 focus:ring-violet-200 focus:border-violet-400")}
                >
                  <option value="">— Select Subject —</option>
                  {subjectList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.code ? ` (${s.code})` : ""}
                    </option>
                  ))}
                </select>
              ))}

              {stepBox(3, "Exam Category", step3Done, step2Done, (
                <>
                  <select
                    value={examType}
                    disabled={!step2Done || examOptions.length === 0}
                    onChange={(e) => { setExamType(e.target.value); setExamId(""); setScores({}); }}
                    className={cls(inputCls, (!step2Done || examOptions.length === 0) && "opacity-50", "transition-all duration-200 focus:ring-2 focus:ring-violet-200 focus:border-violet-400")}
                  >
                    <option value="">— Select Category —</option>
                    {/* Only exam types that HAVE an active exam for this class */}
                    {EXAM_TYPES.filter((t) => activeExamTypes.includes(t.value)).map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Exam Category = Exam Type. Only categories with ACTIVE exams appear here.
                  </p>
                  {step2Done && examOptions.length === 0 && (
                    <div className="flex items-start gap-2 mt-2 rounded-xl bg-amber-50 px-4 py-3 border border-amber-200">
                      <span className="text-lg">⚠️</span>
                      <p className="text-[11px] font-semibold text-amber-700 leading-relaxed">
                        There is no ACTIVE exam for this class yet. If the Academic Master already created and
                        activated one, it may still be waiting for the Admin's approval — ask them to check.
                      </p>
                    </div>
                  )}
                </>
              ))}

              {stepBox(4, "Exam Name", step4Done, step3Done, (
                <>
                  <select
                    value={examId}
                    disabled={!step3Done}
                    onChange={(e) => { setExamId(e.target.value); setScores({}); }}
                    className={cls(inputCls, !step3Done && "opacity-50", "transition-all duration-200 focus:ring-2 focus:ring-violet-200 focus:border-violet-400")}
                  >
                    <option value="">— Select Exam —</option>
                    {examOptionsForType.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {e.academicYear ? ` (${e.academicYear})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Only <b>ACTIVE</b> examinations of the selected category appear here.
                  </p>
                  {step3Done && examOptionsForType.length === 0 && (
                    <div className="flex items-start gap-2 mt-2 rounded-xl bg-amber-50 px-4 py-3 border border-amber-200">
                      <span className="text-lg">⚠️</span>
                      <p className="text-[11px] font-semibold text-amber-700 leading-relaxed">
                        There is no ACTIVE exam for this class yet — please contact the Academic Master for further assistance.
                      </p>
                    </div>
                  )}
                </>
              ))}

              {(classesFetch.error || subjectsFetch.error || activeExamsFetch.error) && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gradient-to-r from-rose-50 to-red-50 px-4 py-3 text-sm font-semibold text-rose-700 border border-rose-200">
                  <span>⚠️ {classesFetch.error || subjectsFetch.error || activeExamsFetch.error}</span>
                  <button
                    onClick={() => { classesFetch.refresh(); subjectsFetch.refresh(); activeExamsFetch.refresh(); }}
                    className="rounded-lg border border-rose-300 bg-white px-4 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-all duration-200 shadow-sm"
                  >
                    🔄 Refresh
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ==================== RIGHT: ENTER SCORES ==================== */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 px-6 py-4">
              <div>
                <p className="text-sm font-bold text-white">📋 Enter Scores</p>
                <p className="text-[11px] text-violet-100">Enter grades for each student</p>
              </div>
              {allStepsDone && (
                <span className="rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-[11px] font-bold text-white border border-white/20">
                  {selectedClass?.name} {selectedClass?.section ? `— ${selectedClass.section}` : ""} · {selectedSubject?.name} · {selectedExam?.name}
                </span>
              )}
            </div>

            {!allStepsDone ? (
              <EmptyState
                icon="🎓"
                title="Complete all 4 steps on the left to load students."
                message="1) Select Class → 2) Select Subject → 3) Exam Category → 4) Exam Name. Then the students of that class will appear here."
              />
            ) : entryStudents.loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600"></div>
                </div>
                <p className="text-sm font-semibold text-slate-600">Loading students...</p>
              </div>
            ) : studentList.length === 0 ? (
              <EmptyState
                icon="👨‍🎓"
                title="No students available"
                message={
                  selectedSubject?.isOptional
                    ? `No students are mapped to this optional subject (${selectedSubject.name}) in this class. Use "Map Students" in the sidebar to enrol students.`
                    : "This class has no students enrolled, OR you are not assigned to teach this subject in this class yet. Ask the Admin to check your subject/class assignment in Manage Teachers."
                }
              />
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/30 px-6 py-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Field label="Term">
                      <select value={term} onChange={(e) => setTerm(e.target.value)} className={cls(inputCls, "w-36")}>
                        {TERMS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                    <div className="flex items-center gap-3">
                      <div className="relative h-3 w-32 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="absolute h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500 ease-out"
                          style={{ width: `${studentList.length ? Math.round((submittedCount / studentList.length) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">
                        {submittedCount}/{studentList.length} submitted
                        {entryCount !== submittedCount && (
                          <span className="ml-1 font-normal text-amber-600">({entryCount} typed, not yet saved)</span>
                        )}
                      </span>
                    </div>
                    {!editing && (
                      <div className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        ✅ Saved — press Edit to modify
                      </div>
                    )}
                  </div>
                </div>

                <div className="max-h-[520px] overflow-x-auto overflow-y-auto p-6">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="sticky top-0 z-[1] bg-gradient-to-r from-slate-100 to-violet-50/50 backdrop-blur-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">#</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Adm No</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Student</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600">Score / 100</th>
                        <th className="w-10 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-600"> </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentList.map((s, i) => {
                        const submitted = isSubmitted(s.id);
                        return (
                          <tr
                            key={s.id}
                            className={cls(
                              "transition-all duration-200 hover:bg-violet-50/60 hover:shadow-sm",
                              submitted ? "bg-gradient-to-r from-emerald-50/40 to-green-50/40" : i % 2 === 1 && "bg-slate-50/60",
                            )}
                          >
                            <td className="px-4 py-3 text-slate-500 font-medium">{i + 1}</td>
                            <td className="px-4 py-3">
                              <code className="rounded-lg bg-gradient-to-r from-slate-100 to-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 border border-slate-200">{s.admissionNo}</code>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.5"
                                value={scores[s.id] ?? ""}
                                disabled={!editing}
                                onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                                className={cls(
                                  inputCls,
                                  "w-28 font-semibold",
                                  !editing && "bg-slate-50 text-slate-700",
                                  submitted && "border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 focus:border-emerald-500 focus:ring-emerald-200",
                                )}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              {submitted && <span className="text-lg text-emerald-600" title="Submitted and saved">✅</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER — sticky so the Save button + result message stay visible
                    even when scrolling through a long class list (51 students etc). */}
                <div className="sticky bottom-0 z-10 space-y-3 border-t border-slate-200 bg-gradient-to-r from-white to-violet-50/30 px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm">
                  {entryMsg && (
                    <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 border border-emerald-200">
                      {entryMsg}
                    </div>
                  )}
                  {entryErr && (
                    <div className="rounded-xl bg-gradient-to-r from-rose-50 to-red-50 px-4 py-2.5 text-sm font-semibold text-rose-700 border border-rose-200">
                      {entryErr}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                      onClick={() => { setScores(Object.fromEntries(studentList.map((st) => [st.id, ""]))); setEditing(true); }}
                      className={cls(btnGhost, "px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:shadow-md")}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => void saveEntry()}
                      disabled={saving || entryCount === 0}
                      className={cls(btnPrimary, "px-5 py-2 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100")}
                    >
                      {saving ? "Saving..." : `💾 Save Scores (${entryCount})`}
                    </button>
                    <button
                      onClick={() => setEditing(true)}
                      disabled={editing}
                      className={cls(btnGhost, "border-violet-200 text-violet-700 hover:bg-violet-50 px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:shadow-md", editing && "opacity-50")}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ==================== RECORDS (angalia + futa) ==================== */}
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 px-6 py-4">
            <div>
              <p className="text-sm font-bold text-white">📋 Score Records</p>
              <p className="text-[11px] text-violet-100">View and manage submitted scores</p>
            </div>
            <button onClick={() => records.refresh()} className="rounded-lg bg-white/10 backdrop-blur-sm px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all duration-200 border border-white/20">
              🔄 Reload
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/30 p-5 sm:grid-cols-3">
            <select value={fClass} onChange={(e) => setFClass(e.target.value)} className={inputCls}>
              <option value="">All classes</option>
              {classList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.section ? ` — ${c.section}` : ""}</option>
              ))}
            </select>
            <select value={fSubject} onChange={(e) => setFSubject(e.target.value)} className={inputCls}>
              <option value="">All subjects</option>
              {subjectList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
              ))}
            </select>
            <select value={fExam} onChange={(e) => setFExam(e.target.value)} className={inputCls}>
              <option value="">All exam types</option>
              {EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {recordsFiltersComplete ? (
            recordsRoster.loading && !displayRows?.length ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600"></div>
                </div>
                <p className="text-sm font-semibold text-slate-600">Loading records...</p>
              </div>
            ) : !displayRows || displayRows.length === 0 ? (
              <EmptyState icon="👨‍🎓" title="No students in this class" message="This class has no students enrolled for this subject." />
            ) : (
              <div className="overflow-x-auto">
                <div className="mb-4 flex items-center justify-between px-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                      <span className="text-xs font-semibold text-slate-600">Scored</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"></div>
                      <span className="text-xs font-semibold text-slate-600">Not Scored</span>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    {displayRows.filter(r => r.grade).length} / {displayRows.length} students scored
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-100 to-violet-50/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Exam Type</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Term</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">Act</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayRows.map(({ student: s, grade: g }) => (
                      <tr 
                        key={s.id} 
                        className={cls(
                          "transition-all duration-200 hover:bg-violet-50/60 hover:shadow-sm",
                          !g && "bg-gradient-to-r from-amber-50/40 to-orange-50/40 hover:from-amber-50/60 hover:to-orange-50/60"
                        )}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {s.name}
                          <p className="text-[11px] font-normal text-slate-400">{s.admissionNo}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{g?.subjectName ?? recordsFSubjectName}</td>
                        <td className="px-4 py-3 text-slate-600">{examLabel(fExam)}</td>
                        <td className="px-4 py-3 text-slate-600">{g?.term ?? "—"}</td>
                        <td className="px-4 py-3">
                          {g ? (
                            <span className={cls("rounded-lg px-3 py-1 text-sm font-bold shadow-sm", scoreTone(g.score))}>
                              {g.score}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200 shadow-sm">
                                ⚠️ Not submitted
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{g ? shortDate(g.createdAt) : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {g && (
                            <button
                              onClick={() => void removeGrade(g)}
                              className="rounded-lg bg-gradient-to-r from-rose-100 to-red-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:from-rose-200 hover:to-red-200 transition-all duration-200 border border-rose-200 shadow-sm"
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : gradeList.length === 0 ? (
            <EmptyState icon="📭" title="No score records" message="Scores you save above will appear here. Pick a Class + Subject + Exam Category above to also see students who haven't been scored yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-100 to-violet-50/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Exam Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Term</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600">Act</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeList.map((g) => (
                    <tr key={g.id} className="transition-all duration-200 hover:bg-violet-50/60 hover:shadow-sm">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {g.studentName}
                        <p className="text-[11px] font-normal text-slate-400">{g.admissionNo}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{g.subjectName}</td>
                      <td className="px-4 py-3 text-slate-600">{examLabel(g.examType)}</td>
                      <td className="px-4 py-3 text-slate-600">{g.term}</td>
                      <td className="px-4 py-3">
                        <span className={cls("rounded-lg px-3 py-1 text-sm font-bold shadow-sm", scoreTone(g.score))}>
                          {g.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{shortDate(g.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => void removeGrade(g)}
                          className="rounded-lg bg-gradient-to-r from-rose-100 to-red-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:from-rose-200 hover:to-red-200 transition-all duration-200 border border-rose-200 shadow-sm"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
