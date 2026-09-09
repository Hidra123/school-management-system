"use client";

import { Fragment } from "react";
import { Badge } from "@/components/ui";
import { cls } from "@/lib/utils";

type Grade = "A" | "B" | "C" | "D" | "F";
type SubjectScore = { subjectId: number; score: number | null; grade: Grade | null };
type SheetRow = { id: number; name: string; gender: "male" | "female"; subjectScores: SubjectScore[]; division: string; points: number };
type SubjectPerf = {
  subjectId: number; name: string; code: string; pass: number; fail: number;
  A: number; B: number; C: number; D: number; F: number; gpa: number; competencyGrade: Grade; competencyLabel: string;
};

export type ClassResultsData = {
  className: string;
  section: string;
  examName: string;
  examType: string;
  academicYear: string;
  attendance: { F: { reg: number; pre: number }; M: { reg: number; pre: number } };
  ranking: { gpa: number; competency: { grade: Grade; label: string }; passedCandidates: number; failedCandidates: number };
  subjectPerformance: SubjectPerf[];
  divisionPerformance: { F: Record<string, number>; M: Record<string, number> };
  gradePerformance: { F: Record<Grade, number>; M: Record<Grade, number> };
  sheet: SheetRow[];
  subjectList: { id: number; name: string; code: string }[];
  passedList: { position: number; id: number; name: string; gender: "male" | "female"; grade: Grade; division: string; points: number }[];
  failedList: { id: number; name: string; gender: "male" | "female"; grade: Grade; points: number }[];
  coreRisk: { subjectId: number; subjectName: string; rows: { id: number; name: string; gender: "male" | "female"; score: number; grade: Grade; status: string }[] }[];
  totalStudents: number;
};

const GRADE_TONE: Record<Grade, "emerald" | "blue" | "violet" | "amber" | "rose"> = {
  A: "emerald", B: "blue", C: "violet", D: "amber", F: "rose",
};

const GRADE_TEXT: Record<Grade, string> = {
  A: "text-emerald-600", B: "text-sky-600", C: "text-violet-600", D: "text-amber-600", F: "text-rose-600",
};

const DIVISION_BADGE: Record<string, string> = {
  I: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  II: "bg-sky-50 text-sky-700 ring-sky-200",
  III: "bg-violet-50 text-violet-700 ring-violet-200",
  IV: "bg-amber-50 text-amber-700 ring-amber-200",
  "0": "bg-rose-50 text-rose-700 ring-rose-200",
};

function GradeBadge({ grade, label }: { grade: Grade; label: string }) {
  return <Badge tone={GRADE_TONE[grade]}>Grade {grade} ({label})</Badge>;
}

function DivisionPill({ division }: { division: string }) {
  return (
    <span className={cls("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset", DIVISION_BADGE[division] ?? "bg-slate-100 text-slate-600 ring-slate-200")}>
      {division}
    </span>
  );
}

const DIVISIONS = ["I", "II", "III", "IV", "0"];

export default function ClassResultReport({ data }: { data: ClassResultsData }) {
  const totalReg = data.attendance.F.reg + data.attendance.M.reg;
  const totalPre = data.attendance.F.pre + data.attendance.M.pre;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm print:border-0 print:p-0">
      {/* Header */}
      <div className="mb-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ShuleHub School Management System</p>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">STUDENT&apos;S EXAMINATION RESULT</h1>
        <div className="mt-2 inline-block rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-1.5 font-bold text-indigo-800">
          {data.className}{data.section ? ` ${data.section}` : ""} ({data.examName}) Examination Result
          {data.academicYear ? ` — ${data.academicYear}` : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Attendance */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <p className="bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">STUDENT&apos;S ATTENDANCE</p>
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr><th className="px-2 py-1.5 text-left">SEX</th><th className="px-2 py-1.5">F</th><th className="px-2 py-1.5">M</th><th className="px-2 py-1.5">TOTAL</th></tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100"><td className="px-2 py-1.5 font-semibold">REG</td><td className="px-2 py-1.5 text-center">{data.attendance.F.reg}</td><td className="px-2 py-1.5 text-center">{data.attendance.M.reg}</td><td className="px-2 py-1.5 text-center font-bold">{totalReg}</td></tr>
              <tr className="border-t border-slate-100"><td className="px-2 py-1.5 font-semibold">PRE</td><td className="px-2 py-1.5 text-center">{data.attendance.F.pre}</td><td className="px-2 py-1.5 text-center">{data.attendance.M.pre}</td><td className="px-2 py-1.5 text-center font-bold">{totalPre}</td></tr>
              <tr className="border-t border-slate-100"><td className="px-2 py-1.5 font-semibold">ABS</td><td className="px-2 py-1.5 text-center">{data.attendance.F.reg - data.attendance.F.pre}</td><td className="px-2 py-1.5 text-center">{data.attendance.M.reg - data.attendance.M.pre}</td><td className="px-2 py-1.5 text-center font-bold">{totalReg - totalPre}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Ranking */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <p className="bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">SCHOOL EXAMINATION RANKING</p>
          <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase text-slate-500">Examination GPA</p>
              <div className="mt-1"><GradeBadge grade={data.ranking.competency.grade} label={data.ranking.competency.label} /></div>
              <p className="mt-1 text-xs text-slate-500">{data.ranking.gpa} GPA</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase text-slate-500">Passed Candidates</p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600">{data.ranking.passedCandidates}</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase text-slate-500">Failed Candidates</p>
              <p className="mt-1 text-2xl font-extrabold text-rose-600">{data.ranking.failedCandidates}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Performance + Division Performance */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <p className="bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">SUBJECT PERFORMANCE</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-1.5">S/N</th><th className="px-2 py-1.5 text-left">SUBJECT</th>
                  <th className="px-2 py-1.5">PASS</th><th className="px-2 py-1.5">FAIL</th>
                  <th className="px-2 py-1.5">A</th><th className="px-2 py-1.5">B</th><th className="px-2 py-1.5">C</th><th className="px-2 py-1.5">D</th><th className="px-2 py-1.5">F</th>
                  <th className="px-2 py-1.5">GPA</th><th className="px-2 py-1.5 text-left">COMPETENCY</th>
                </tr>
              </thead>
              <tbody>
                {data.subjectPerformance.map((s, i) => (
                  <tr key={s.subjectId} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 text-center">{i + 1}</td>
                    <td className="px-2 py-1.5 font-semibold">{s.name}</td>
                    <td className="px-2 py-1.5 text-center font-bold text-emerald-600">{s.pass}</td>
                    <td className="px-2 py-1.5 text-center font-bold text-rose-600">{s.fail}</td>
                    <td className="px-2 py-1.5 text-center">{s.A}</td><td className="px-2 py-1.5 text-center">{s.B}</td>
                    <td className="px-2 py-1.5 text-center">{s.C}</td><td className="px-2 py-1.5 text-center">{s.D}</td><td className="px-2 py-1.5 text-center">{s.F}</td>
                    <td className="px-2 py-1.5 text-center font-bold">{s.gpa}</td>
                    <td className="px-2 py-1.5"><GradeBadge grade={s.competencyGrade} label={s.competencyLabel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <p className="bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">DIVISION PERFORMANCE</p>
          <table className="w-full text-xs">
            <thead className="bg-slate-100">
              <tr><th className="px-2 py-1.5 text-left">SEX</th>{DIVISIONS.map((d) => <th key={d} className="px-2 py-1.5">{d}</th>)}<th className="px-2 py-1.5">TOTAL</th></tr>
            </thead>
            <tbody>
              {(["F", "M"] as const).map((sex) => {
                const rowTotal = DIVISIONS.reduce((s, d) => s + (data.divisionPerformance[sex][d] ?? 0), 0);
                return (
                  <tr key={sex} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-semibold">{sex}</td>
                    {DIVISIONS.map((d) => <td key={d} className="px-2 py-1.5 text-center">{data.divisionPerformance[sex][d] ?? 0}</td>)}
                    <td className="px-2 py-1.5 text-center font-bold">{rowTotal}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-slate-200 bg-slate-50 font-bold">
                <td className="px-2 py-1.5">TOTAL</td>
                {DIVISIONS.map((d) => <td key={d} className="px-2 py-1.5 text-center">{(data.divisionPerformance.F[d] ?? 0) + (data.divisionPerformance.M[d] ?? 0)}</td>)}
                <td className="px-2 py-1.5 text-center">{data.totalStudents}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Student's Division + Grade Performance */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <p className="bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">STUDENT&apos;S DIVISION</p>
          <table className="w-full text-xs">
            <thead className="bg-slate-100"><tr><th className="px-2 py-1.5 text-left">SEX</th>{DIVISIONS.map((d) => <th key={d} className="px-2 py-1.5">{d}</th>)}<th className="px-2 py-1.5">TOTAL</th></tr></thead>
            <tbody>
              {(["F", "M"] as const).map((sex) => {
                const rowTotal = DIVISIONS.reduce((s, d) => s + (data.divisionPerformance[sex][d] ?? 0), 0);
                return (
                  <tr key={sex} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-semibold">{sex}</td>
                    {DIVISIONS.map((d) => <td key={d} className="px-2 py-1.5 text-center">{data.divisionPerformance[sex][d] ?? 0}</td>)}
                    <td className="px-2 py-1.5 text-center font-bold">{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <p className="bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">STUDENT&apos;S GRADE PERFORMANCE</p>
          <table className="w-full text-xs">
            <thead className="bg-slate-100"><tr><th className="px-2 py-1.5 text-left">SEX</th><th className="px-2 py-1.5">A</th><th className="px-2 py-1.5">B</th><th className="px-2 py-1.5">C</th><th className="px-2 py-1.5">D</th><th className="px-2 py-1.5">F</th><th className="px-2 py-1.5">TOTAL</th></tr></thead>
            <tbody>
              {(["F", "M"] as const).map((sex) => {
                const g = data.gradePerformance[sex];
                const total = g.A + g.B + g.C + g.D + g.F;
                return (
                  <tr key={sex} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-semibold">{sex}</td>
                    <td className="px-2 py-1.5 text-center">{g.A}</td><td className="px-2 py-1.5 text-center">{g.B}</td>
                    <td className="px-2 py-1.5 text-center">{g.C}</td><td className="px-2 py-1.5 text-center">{g.D}</td><td className="px-2 py-1.5 text-center">{g.F}</td>
                    <td className="px-2 py-1.5 text-center font-bold">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full scoresheet */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <p className="bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">STUDENT&apos;S EXAMINATION GRADING SCORES SHEET</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-1.5">S/N</th><th className="px-2 py-1.5 text-left">NAME</th><th className="px-2 py-1.5">SEX</th>
                {data.subjectList.map((s) => (
                  <th key={s.id} colSpan={2} className="px-2 py-1.5">{s.code}</th>
                ))}
                <th className="px-2 py-1.5">DIVISION</th><th className="px-2 py-1.5">POINT</th>
              </tr>
              <tr className="bg-slate-50 text-slate-400">
                <th /><th /><th />
                {data.subjectList.map((s) => (
                  <Fragment key={s.id}>
                    <th className="px-1 py-1 font-semibold">S</th>
                    <th className="px-1 py-1 font-semibold">G</th>
                  </Fragment>
                ))}
                <th /><th />
              </tr>
            </thead>
            <tbody>
              {data.sheet.map((row, i) => (
                <tr key={row.id} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/50">
                  <td className="px-2 py-1 text-center">{i + 1}</td>
                  <td className="px-2 py-1 font-semibold">{row.name}</td>
                  <td className="px-2 py-1 text-center">{row.gender === "female" ? "Female" : "Male"}</td>
                  {data.subjectList.map((subj) => {
                    const entry = row.subjectScores.find((ss) => ss.subjectId === subj.id);
                    return (
                      <Fragment key={subj.id}>
                        <td className={cls("px-1 py-1 text-center", entry?.grade === "F" ? "font-bold text-rose-600" : "text-slate-700")}>
                          {entry && entry.score !== null ? entry.score : "—"}
                        </td>
                        <td className={cls("px-1 py-1 text-center font-bold", entry?.grade ? GRADE_TEXT[entry.grade] : "text-slate-300")}>
                          {entry?.grade ?? "—"}
                        </td>
                      </Fragment>
                    );
                  })}
                  <td className="px-2 py-1 text-center"><DivisionPill division={row.division} /></td>
                  <td className="px-2 py-1 text-center font-bold">{row.points}</td>
                </tr>
              ))}
              {data.sheet.length === 0 && (
                <tr>
                  <td colSpan={5 + data.subjectList.length * 2} className="px-3 py-6 text-center text-slate-400">
                    No scores have been submitted for this examination yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Passed + Failed lists */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-emerald-200">
          <p className="bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">STUDENT&apos;S WHO PASSED THE EXAMINATION</p>
          <table className="w-full text-xs">
            <thead className="bg-emerald-50">
              <tr>
                <th className="px-2 py-1.5">POS</th><th className="px-2 py-1.5 text-left">NAME</th><th className="px-2 py-1.5">SEX</th>
                <th className="px-2 py-1.5">GRADE</th><th className="px-2 py-1.5">DIVISION</th><th className="px-2 py-1.5">POINT</th>
              </tr>
            </thead>
            <tbody>
              {data.passedList.map((s) => (
                <tr key={s.id} className="border-t border-emerald-100 odd:bg-white even:bg-emerald-50/40">
                  <td className="px-2 py-1.5 text-center font-bold text-emerald-700">{s.position}</td>
                  <td className="px-2 py-1.5 font-semibold">{s.name}</td>
                  <td className="px-2 py-1.5 text-center">{s.gender === "female" ? "Female" : "Male"}</td>
                  <td className={cls("px-2 py-1.5 text-center font-bold", GRADE_TEXT[s.grade])}>{s.grade}</td>
                  <td className="px-2 py-1.5 text-center"><DivisionPill division={s.division} /></td>
                  <td className="px-2 py-1.5 text-center font-bold">{s.points}</td>
                </tr>
              ))}
              {data.passedList.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">No students passed this examination.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-xl border border-rose-200">
          <p className="bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">STUDENT&apos;S WHO FAILED THE EXAMINATION</p>
          <table className="w-full text-xs">
            <thead className="bg-rose-50">
              <tr>
                <th className="px-2 py-1.5">S/N</th><th className="px-2 py-1.5 text-left">NAME</th><th className="px-2 py-1.5">SEX</th>
                <th className="px-2 py-1.5">GRADE</th><th className="px-2 py-1.5">POINT</th>
              </tr>
            </thead>
            <tbody>
              {data.failedList.map((s, i) => (
                <tr key={s.id} className="border-t border-rose-100 odd:bg-white even:bg-rose-50/40">
                  <td className="px-2 py-1.5 text-center text-slate-500">{i + 1}</td>
                  <td className="px-2 py-1.5 font-semibold">{s.name}</td>
                  <td className="px-2 py-1.5 text-center">{s.gender === "female" ? "Female" : "Male"}</td>
                  <td className={cls("px-2 py-1.5 text-center font-bold", GRADE_TEXT[s.grade])}>{s.grade}</td>
                  <td className="px-2 py-1.5 text-center font-bold">{s.points}</td>
                </tr>
              ))}
              {data.failedList.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400">No failed students in this examination.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Core subject intervention lists */}
      {data.coreRisk.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Core Subject Intervention List — students with D/F in compulsory subjects
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.coreRisk.map((subj) => (
              <div key={subj.subjectId} className="overflow-hidden rounded-xl border border-amber-200">
                <p className="bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">{subj.subjectName.toUpperCase()} — AT RISK / FAILED</p>
                <table className="w-full text-xs">
                  <thead className="bg-amber-50">
                    <tr>
                      <th className="px-2 py-1.5">S/N</th><th className="px-2 py-1.5 text-left">NAME</th><th className="px-2 py-1.5">SEX</th>
                      <th className="px-2 py-1.5">SCORE</th><th className="px-2 py-1.5">GRADE</th><th className="px-2 py-1.5">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subj.rows.map((s, i) => (
                      <tr key={s.id} className="border-t border-amber-100 odd:bg-white even:bg-amber-50/40">
                        <td className="px-2 py-1.5 text-center text-slate-500">{i + 1}</td>
                        <td className="px-2 py-1.5 font-semibold">{s.name}</td>
                        <td className="px-2 py-1.5 text-center">{s.gender === "female" ? "Female" : "Male"}</td>
                        <td className="px-2 py-1.5 text-center">{s.score}</td>
                        <td className={cls("px-2 py-1.5 text-center font-bold", GRADE_TEXT[s.grade])}>{s.grade}</td>
                        <td className="px-2 py-1.5 text-center">
                          <Badge tone={s.status === "FAIL" ? "rose" : "amber"}>{s.status}</Badge>
                        </td>
                      </tr>
                    ))}
                    {subj.rows.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">No students at risk in this subject.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
