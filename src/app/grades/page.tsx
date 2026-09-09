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
import { cls, delJSON, postJSON, shortDate, useFetch } from "@/lib/utils";

type ClassRow = { id: number; name: string; section: string };
type SubjectRow = { id: number; name: string; code: string };
type StudentLight = { id: number; admissionNo: string; name: string; gender: "male" | "female" };
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
type ActiveExam = { id: number; name: string; examType: string; academicYear: string; classIds: number[]; appliesToAllClasses: boolean };

// Only two exam types are used in this school — see src/lib/examTypes.ts.
const EXAM_TYPES = [
  { key: "SE", label: "School Examination (SE)" },
  { key: "CA", label: "Continuously Assessment (CAs)" },
];
const TERMS = ["Term 1", "Term 2", "Term 3", "Full Year"];

function examLabel(key: string): string {
  if (key === "SE") return "School Examination (SE)";
  if (key === "CA") return "Continuously Assessment (CAs)";
  // Legacy values from before the two-type rule.
  const legacy: Record<string, string> = {
    midterm: "School Examination (SE)",
    final: "School Examination (SE)",
    assignment: "Continuously Assessment (CAs)",
    quiz: "Continuously Assessment (CAs)",
    project: "Continuously Assessment (CAs)",
  };
  return legacy[key] ?? key;
}

export default function GradesPage() {
  // ---- Bulk entry state ----
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examType, setExamType] = useState("SE");
  const [term, setTerm] = useState("Term 1");
  const [examId, setExamId] = useState("");
  const [scores, setScores] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [entryMsg, setEntryMsg] = useState<string | null>(null);
  const [entryErr, setEntryErr] = useState<string | null>(null);

  // ---- Records list filters ----
  const [fClass, setFClass] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fExam, setFExam] = useState("");

  // ?strict=1 → Academic Master pia anaona TU classes/subjects alizopewa na
  // admin, hii page ni ya Submit Scores. (Ukurasa wa Students hana strict —
  // Academic Master anaona classes ZOTE ili aweze kuadmit wanafunzi popote.)
  const classesFetch = useFetch<ClassRow[]>("/api/classes?strict=1");
  const subjectsFetch = useFetch<SubjectRow[]>("/api/subjects?strict=1");
  const activeExamsFetch = useFetch<ActiveExam[]>("/api/exams/active");
  const classList = classesFetch.data ?? [];
  const subjectList = subjectsFetch.data ?? [];
  const allActiveExams = activeExamsFetch.data ?? [];
  // Exams applicable to the currently selected class (or all exams if none selected yet).
  const examOptions = useMemo(
    () =>
      allActiveExams.filter(
        (e) => !classId || e.appliesToAllClasses || e.classIds.includes(Number(classId)),
      ),
    [allActiveExams, classId],
  );

  const entryStudentsUrl = useMemo(
    () => (classId ? `/api/students?classId=${classId}` : null),
    [classId],
  );
  const entryGradesUrl = useMemo(
    () =>
      classId && subjectId
        ? `/api/grades?classId=${classId}&subjectId=${subjectId}&examType=${examType}`
        : null,
    [classId, subjectId, examType],
  );

  const entryStudents = useFetch<StudentLight[]>(entryStudentsUrl);
  const entryGrades = useFetch<GradeRow[]>(entryGradesUrl);
  // IMPORTANT: memoize so this has a STABLE reference when data is null —
  // otherwise `?? []` creates a brand-new array every render, which (as a
  // dependency of the effect below) triggers an infinite render loop that
  // pegs the JS main thread and makes the whole app (incl. the sidebar)
  // appear "stuck" until a hard navigation happens.
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
    if (!classId || !subjectId) {
      setEntryErr("Select a class and subject first.");
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
        examId: examId || null,
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

  // ---- Records list ----
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

  const canEnter = classId && subjectId && studentList.length > 0;

  return (
    <AppShell permission="grades.view">
    <div className="space-y-6">
      <PageHeader icon="📝" title="Grades" subtitle="Enter and manage exam and assessment scores" />

      {/* Bulk entry */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-slate-900">✍️ Enter Grades (by Class)</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Class">
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
              <option value="">— Select —</option>
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.section ? ` — ${c.section}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject">
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
              <option value="">— Select —</option>
              {subjectList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.code ? ` (${s.code})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Examination">
            <select value={examId} onChange={(e) => setExamId(e.target.value)} className={inputCls}>
              <option value="">— None (ad-hoc) —</option>
              {examOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.academicYear ? ` (${e.academicYear})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Exam Type">
            <select value={examType} onChange={(e) => setExamType(e.target.value)} className={inputCls}>
              {EXAM_TYPES.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Term">
            <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls}>
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {examOptions.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            💡 Select an Examination above to link these scores to the "Examinations" module so the Academic Master can publish class results and report cards from them.
          </p>
        )}

        {entryMsg && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-700">
            {entryMsg}
          </p>
        )}
        {entryErr && (
          <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">
            {entryErr}
          </p>
        )}
        {(classesFetch.error || subjectsFetch.error) && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">
            <span>⚠️ {classesFetch.error || subjectsFetch.error}</span>
            <button
              onClick={() => { classesFetch.refresh(); subjectsFetch.refresh(); }}
              className="rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50"
            >
              🔄 Refresh
            </button>
          </div>
        )}

        {canEnter ? (
          <>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Admission No.</th>
                      <th className="px-4 py-3">Gender</th>
                      <th className="px-4 py-3">Score (0-100)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {studentList.map((s) => (
                      <tr key={s.id} className="hover:bg-indigo-50/30">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{s.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{s.admissionNo}</td>
                        <td className="px-4 py-2.5">{s.gender === "female" ? "👧" : "👦"}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={scores[s.id] ?? ""}
                            onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                            placeholder="—"
                            className={cls(inputCls, "w-28 py-1.5")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">
                {entryCount} of {studentList.length} students filled in
              </p>
              <button onClick={saveEntry} disabled={saving} className={btnPrimary}>
                {saving ? "Saving..." : `💾 Save Scores (${entryCount})`}
              </button>
            </div>
          </>
        ) : classId && subjectId && entryStudents.loading ? (
          <Loader label="Loading students..." />
        ) : classId && subjectId && entryStudents.error ? (
          <EmptyState icon="⚠️" title="Could not load students" message={entryStudents.error} />
        ) : classId && subjectId && studentList.length === 0 ? (
          <EmptyState icon="👨‍🎓" title="No students in this class" message="Add students to this class first." />
        ) : (
          <EmptyState
            icon="📝"
            title="Select class and subject"
            message="Choose a class, subject and exam type to see students and fill in scores."
          />
        )}
      </section>

      {/* Records */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-slate-900">🗂️ Grade Records</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Filter by Class">
            <select value={fClass} onChange={(e) => setFClass(e.target.value)} className={inputCls}>
              <option value="">All</option>
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Filter by Subject">
            <select value={fSubject} onChange={(e) => setFSubject(e.target.value)} className={inputCls}>
              <option value="">All</option>
              {subjectList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Filter by Exam Type">
            <select value={fExam} onChange={(e) => setFExam(e.target.value)} className={inputCls}>
              <option value="">All</option>
              {EXAM_TYPES.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {records.loading && !gradeList.length ? (
          <div className="mt-4"><Loader /></div>
        ) : gradeList.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon="🗂️" title="No records found" message="Enter scores first using the section above." />
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Term</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {gradeList.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{g.studentName}</p>
                        <p className="text-xs text-slate-500">{g.admissionNo}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{g.subjectName}</td>
                      <td className="px-4 py-3 text-slate-600">{examLabel(g.examType)}</td>
                      <td className="px-4 py-3 text-slate-600">{g.term}</td>
                      <td className="px-4 py-3">
                        <Badge tone={scoreTone(g.score)}>{g.score}%</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{shortDate(g.createdAt?.slice(0, 10))}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeGrade(g)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {records.data && gradeList.length > 0 && (
          <div className="mt-3 text-right">
            <button onClick={records.refresh} className={btnGhost}>
              🔄 Refresh
            </button>
          </div>
        )}
      </section>
    </div>
    </AppShell>
  );
}
