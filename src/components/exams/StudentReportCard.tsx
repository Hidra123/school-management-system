"use client";

import { useEffect, useState } from "react";
import { ActionButton, inputCls, useActionState } from "@/components/ui";
import { DEFAULT_BEHAVIOR_CRITERIA, behaviorScaleLabel } from "@/lib/examGrading";
import { cls, putJSON, useFetch } from "@/lib/utils";

type SubjectRowT = { subjectId: number; subjectName: string; subjectCode: string; score: number; grade: string; remark: string; points: number };
export type StudentReportData = {
  student: { id: number; name: string; gender: "male" | "female"; admissionNo: string };
  className: string;
  section: string;
  examName: string;
  examType: string;
  academicYear: string;
  subjectRows: SubjectRowT[];
  total: number;
  average: number;
  overallGrade: string;
  division: string;
  position: number;
  outOf: number;
};

type Remarks = {
  behaviorRatings: string;
  academicComment: string;
  principalComment: string;
  academicMasterName: string;
  headmasterName: string;
};

const GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-600", B: "text-sky-600", C: "text-violet-600", D: "text-amber-600", F: "text-rose-600",
};

export default function StudentReportCard({ data, examId, editable = true }: { data: StudentReportData; examId: number; editable?: boolean }) {
  const remarksFetch = useFetch<Remarks>(`/api/exams/remarks?studentId=${data.student.id}&examId=${examId}`);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [academicComment, setAcademicComment] = useState("");
  const [principalComment, setPrincipalComment] = useState("");
  const [academicMasterName, setAcademicMasterName] = useState("");
  const [headmasterName, setHeadmasterName] = useState("");
  const { loading: saving, done, run } = useActionState();

  useEffect(() => {
    if (!remarksFetch.data) return;
    try {
      setRatings(JSON.parse(remarksFetch.data.behaviorRatings || "{}"));
    } catch {
      setRatings({});
    }
    setAcademicComment(remarksFetch.data.academicComment || "");
    setPrincipalComment(remarksFetch.data.principalComment || "");
    setAcademicMasterName(remarksFetch.data.academicMasterName || "");
    setHeadmasterName(remarksFetch.data.headmasterName || "");
  }, [remarksFetch.data]);

  async function saveRemarks() {
    await run(async () => {
      await putJSON("/api/exams/remarks", {
        studentId: data.student.id,
        examId,
        behaviorRatings: JSON.stringify(ratings),
        academicComment,
        principalComment,
        academicMasterName,
        headmasterName,
      });
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm print:border-0 print:p-0">
      <div className="mb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ShuleHub School Management System</p>
        <h1 className="mt-1 text-lg font-extrabold text-slate-900">INDIVIDUAL STUDENT&apos;S EXAMINATION REPORT</h1>
        <p className="text-xs text-slate-500">{data.academicYear}</p>
        <div className="mt-2 inline-block rounded-lg bg-slate-900 px-4 py-1.5 font-bold text-white">
          STUDENT&apos;S EXAMINATION REPORT — {data.examName.toUpperCase()}
        </div>
        <p className="mt-3 text-xl font-extrabold text-indigo-700">{data.student.name}</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-xs sm:grid-cols-4">
        <div className="bg-white p-2"><p className="text-slate-400">Class/Section</p><p className="font-bold text-slate-800">{data.className}{data.section ? ` ${data.section}` : ""}</p></div>
        <div className="bg-white p-2"><p className="text-slate-400">Admission No.</p><p className="font-bold text-slate-800">{data.student.admissionNo}</p></div>
        <div className="bg-white p-2"><p className="text-slate-400">Result Type</p><p className="font-bold text-slate-800">{data.examName}</p></div>
        <div className="bg-white p-2"><p className="text-slate-400">Date</p><p className="font-bold text-slate-800">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 lg:col-span-2">
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr><th className="px-3 py-2 text-left">SUBJECT</th><th className="px-3 py-2">SCORE</th><th className="px-3 py-2">GRADE</th><th className="px-3 py-2 text-left">REMARKS</th></tr>
            </thead>
            <tbody>
              {data.subjectRows.map((r) => (
                <tr key={r.subjectId} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/50">
                  <td className="px-3 py-1.5 font-semibold text-slate-800">{r.subjectName}</td>
                  <td className="px-3 py-1.5 text-center">{r.score}</td>
                  <td className={cls("px-3 py-1.5 text-center font-bold", GRADE_COLOR[r.grade])}>{r.grade}</td>
                  <td className="px-3 py-1.5">{r.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <p className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">GRADING SYSTEM 100%</p>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-t border-slate-100"><td className="px-3 py-1 font-bold text-emerald-600">A</td><td className="px-3 py-1">75 – 100</td></tr>
              <tr className="border-t border-slate-100"><td className="px-3 py-1 font-bold text-sky-600">B</td><td className="px-3 py-1">65 – 74</td></tr>
              <tr className="border-t border-slate-100"><td className="px-3 py-1 font-bold text-violet-600">C</td><td className="px-3 py-1">45 – 64</td></tr>
              <tr className="border-t border-slate-100"><td className="px-3 py-1 font-bold text-amber-600">D</td><td className="px-3 py-1">30 – 44</td></tr>
              <tr className="border-t border-slate-100"><td className="px-3 py-1 font-bold text-rose-600">F</td><td className="px-3 py-1">00 – 29</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-center sm:grid-cols-5">
        <div className="bg-white p-2.5"><p className="text-[10px] uppercase text-slate-400">Total</p><p className="text-lg font-extrabold text-slate-800">{data.total}</p></div>
        <div className="bg-white p-2.5"><p className="text-[10px] uppercase text-slate-400">Average</p><p className="text-lg font-extrabold text-slate-800">{data.average}</p></div>
        <div className="bg-white p-2.5"><p className="text-[10px] uppercase text-slate-400">Grade</p><p className={cls("text-lg font-extrabold", GRADE_COLOR[data.overallGrade])}>{data.overallGrade}</p></div>
        <div className="bg-white p-2.5"><p className="text-[10px] uppercase text-slate-400">Division</p><p className="text-lg font-extrabold text-indigo-700">{data.division}</p></div>
        <div className="bg-white p-2.5"><p className="text-[10px] uppercase text-slate-400">Position</p><p className="text-lg font-extrabold text-slate-800">{data.position} / {data.outOf}</p></div>
      </div>

      {/* Behaviour & Personality Assessment */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <p className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">BEHAVIOUR &amp; PERSONALITY ASSESSMENT</p>
        <div className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {DEFAULT_BEHAVIOR_CRITERIA.map((crit) => (
            <div key={crit} className="flex items-center justify-between gap-2 bg-white px-3 py-2">
              <span className="text-xs font-semibold text-slate-700">{crit}</span>
              {editable ? (
                <select
                  className="rounded-md border border-slate-200 px-1.5 py-1 text-xs font-bold text-slate-700 print:hidden"
                  value={ratings[crit] ?? ""}
                  onChange={(e) => setRatings({ ...ratings, [crit]: e.target.value })}
                >
                  <option value="">—</option>
                  {["A", "B", "C", "D", "F"].map((g) => (
                    <option key={g} value={g}>
                      {g} — {behaviorScaleLabel(g)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={cls("text-xs font-bold", GRADE_COLOR[ratings[crit]] ?? "text-slate-400")}>
                  {ratings[crit] ? `${ratings[crit]} — ${behaviorScaleLabel(ratings[crit])}` : "—"}
                </span>
              )}
              {editable && ratings[crit] && (
                <span className={cls("hidden text-xs font-bold print:inline", GRADE_COLOR[ratings[crit]] ?? "text-slate-400")}>
                  {ratings[crit]} — {behaviorScaleLabel(ratings[crit])}
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="bg-slate-50 px-3 py-1.5 text-[10px] text-slate-400">
          Scale: A = Excellent · B = Very Good · C = Good · D = Needs Improvement · F = Fail
        </p>
      </div>

      {/* Comments & signatures */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Academic Master&apos;s Comment</label>
          {editable ? (
            <textarea
              className={inputCls}
              rows={2}
              value={academicComment}
              onChange={(e) => setAcademicComment(e.target.value)}
              placeholder="Comment on academic performance..."
            />
          ) : (
            <p className="min-h-[3rem] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">{academicComment || "—"}</p>
          )}
          <div className="mt-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Academic Master (Name &amp; Signature)</label>
            {editable ? (
              <input
                className={inputCls}
                value={academicMasterName}
                onChange={(e) => setAcademicMasterName(e.target.value)}
                placeholder="Full name"
              />
            ) : (
              <p className="border-b border-slate-300 pb-0.5 text-sm font-semibold text-slate-700">{academicMasterName || "\u00A0"}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Headmaster&apos;s Comment</label>
          {editable ? (
            <textarea
              className={inputCls}
              rows={2}
              value={principalComment}
              onChange={(e) => setPrincipalComment(e.target.value)}
              placeholder="Headmaster's remarks..."
            />
          ) : (
            <p className="min-h-[3rem] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">{principalComment || "—"}</p>
          )}
          <div className="mt-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Headmaster (Name &amp; Signature)</label>
            {editable ? (
              <input
                className={inputCls}
                value={headmasterName}
                onChange={(e) => setHeadmasterName(e.target.value)}
                placeholder="Full name"
              />
            ) : (
              <p className="border-b border-slate-300 pb-0.5 text-sm font-semibold text-slate-700">{headmasterName || "\u00A0"}</p>
            )}
          </div>
        </div>
      </div>

      {editable && (
        <div className="mt-5 flex items-center justify-end gap-3 print:hidden">
          {remarksFetch.error && <span className="text-xs font-semibold text-rose-600">{remarksFetch.error}</span>}
          <ActionButton onClick={saveRemarks} loading={saving} done={done} doneText="Saved!">
            💾 Save Remarks &amp; Comments
          </ActionButton>
        </div>
      )}
    </div>
  );
}
