"use client";

import { useEffect, useMemo, useState } from "react";
import {
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
type SubjectRow = { id: number; name: string; code: string };
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
        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold transition",
        done
          ? "bg-emerald-500 text-white"
          : active
            ? "bg-violet-600 text-white"
            : "bg-slate-200 text-slate-500",
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
  const examOptions = useMemo(
    () =>
      allActiveExams.filter(
        (e) =>
          e.examType === examType &&
          (!classId || e.appliesToAllClasses || e.classIds.includes(Number(classId))),
      ),
    [allActiveExams, examType, classId],
  );
  const selectedExam = useMemo(
    () => examOptions.find((e) => String(e.id) === examId) ?? null,
    [examOptions, examId],
  );

  // ---------- Steps status ----------
  const step1Done = !!classId;
  const step2Done = !!subjectId;
  const step3Done = !!examType;
  const step4Done = !!examId;
  const allStepsDone = step1Done && step2Done && step3Done && step4Done;

  const entryStudentsUrl = useMemo(
    () => (classId ? `/api/students?classId=${classId}&strict=1` : null),
    [classId],
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

  async function saveEntry() {
    if (!classId || !subjectId || !examType || !examId) {
      setEntryErr("Complete all 4 steps (Class, Subject, Exam Category and Exam Name) before saving.");
      return;
    }
    if (entryCount === 0) {
      setEntryErr("Fill in at least one score before saving.");
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

  async function removeGrade(g: GradeRow) {
    if (!window.confirm(`Delete ${g.studentName}'s score (${examLabel(g.examType)})?`)) return;
    try {
      await delJSON(`/api/grades/${g.id}`);
      records.refresh();
      entryGrades.refresh();
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
        "rounded-xl border p-3.5 transition",
        active ? "border-violet-200 bg-violet-50/40" : "border-slate-100 bg-white",
        !active && done && "border-emerald-100",
      )}
    >
      <p className={cls("mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider", active || done ? "text-slate-700" : "text-slate-400")}>
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

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* ==================== LEFT: STEP BY STEP ==================== */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-5">
            <div className="bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">📝 Score Submission</p>
            </div>
            <div className="space-y-3 p-4">
              {stepBox(1, "Select Class", step1Done, true, (
                <select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(""); setExamId(""); setScores({}); }} className={inputCls}>
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
                <p className="text-xs font-semibold text-amber-700">
                  ⚠️ No classes assigned to you yet — ask the admin to assign classes via Manage Teachers.
                </p>
              )}

              {stepBox(2, "Select Subject", step2Done, step1Done, (
                <select
                  value={subjectId}
                  disabled={!step1Done}
                  onChange={(e) => { setSubjectId(e.target.value); setExamId(""); setScores({}); }}
                  className={cls(inputCls, !step1Done && "opacity-50")}
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
                    disabled={!step2Done}
                    onChange={(e) => { setExamType(e.target.value); setExamId(""); setScores({}); }}
                    className={cls(inputCls, !step2Done && "opacity-50")}
                  >
                    <option value="">— Select Category —</option>
                    {EXAM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Exam Category = Exam Type: School Examination (SE) or Continuously Assessment (CAs).
                  </p>
                </>
              ))}

              {stepBox(4, "Exam Name", step4Done, step3Done, (
                <>
                  <select
                    value={examId}
                    disabled={!step3Done}
                    onChange={(e) => { setExamId(e.target.value); setScores({}); }}
                    className={cls(inputCls, !step3Done && "opacity-50")}
                  >
                    <option value="">— Select Exam —</option>
                    {examOptions.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {e.academicYear ? ` (${e.academicYear})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Only <b>ACTIVE</b> examinations of the selected category appear here.
                  </p>
                  {step3Done && examOptions.length === 0 && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-700">
                      ⚠️ There is no ACTIVE exam for this class yet — please contact the Academic Master for further assistance.
                    </p>
                  )}
                </>
              ))}

              {(classesFetch.error || subjectsFetch.error || activeExamsFetch.error) && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">
                  <span>⚠️ {classesFetch.error || subjectsFetch.error || activeExamsFetch.error}</span>
                  <button
                    onClick={() => { classesFetch.refresh(); subjectsFetch.refresh(); activeExamsFetch.refresh(); }}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    🔄 Refresh
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ==================== RIGHT: ENTER SCORES ==================== */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-5 py-3">
              <p className="text-sm font-bold text-white">≡ Enter Scores</p>
              {allStepsDone && (
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300">
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
              <Loader label="Loading students..." />
            ) : studentList.length === 0 ? (
              <EmptyState icon="👨‍🎓" title="No students" message="This class has no students yet." />
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Field label="Term">
                      <select value={term} onChange={(e) => setTerm(e.target.value)} className={cls(inputCls, "w-32")}>
                        {TERMS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                    <span className="text-xs text-slate-500">
                      Max: <b>100</b> · {entryCount}/{studentList.length} entered
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setScores(Object.fromEntries(studentList.map((s) => [s.id, ""])))} className={btnGhost}>
                      Clear
                    </button>
                    <button onClick={() => void saveEntry()} disabled={saving || entryCount === 0} className={btnPrimary}>
                      {saving ? "Saving..." : `💾 Save scores (${entryCount})`}
                    </button>
                  </div>
                </div>

                {entryMsg && (
                  <p className="mx-5 mt-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-700">
                    {entryMsg}
                  </p>
                )}
                {entryErr && (
                  <p className="mx-5 mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">
                    {entryErr}
                  </p>
                )}

                <div className="overflow-x-auto p-5">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">#</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Adm No</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Student</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Score / 100</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentList.map((s, i) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                          <td className="px-3 py-2">
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{s.admissionNo}</code>
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              value={scores[s.id] ?? ""}
                              onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                              className={cls(
                                inputCls,
                                "w-24",
                                scores[s.id]?.trim() !== "" && scoreTone(Number(scores[s.id])),
                              )}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ==================== RECORDS (angalia + futa) ==================== */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3">
            <p className="text-sm font-bold text-white">📋 Score Records</p>
            <button onClick={() => records.refresh()} className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20">
              🔄 Reload
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-3">
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
          {records.loading && !gradeList.length ? (
            <Loader label="Loading records..." />
          ) : gradeList.length === 0 ? (
            <EmptyState icon="📭" title="No score records" message="Scores you save above will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Student</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Subject</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Exam Type</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Term</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Score</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Date</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-slate-600">Act</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeList.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {g.studentName}
                        <p className="text-[11px] font-normal text-slate-400">{g.admissionNo}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{g.subjectName}</td>
                      <td className="px-3 py-2 text-slate-600">{examLabel(g.examType)}</td>
                      <td className="px-3 py-2 text-slate-600">{g.term}</td>
                      <td className="px-3 py-2">
                        <span className={cls("rounded-lg px-2 py-0.5 text-sm font-bold", scoreTone(g.score))}>
                          {g.score}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{shortDate(g.createdAt)}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => void removeGrade(g)}
                          className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-200"
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
