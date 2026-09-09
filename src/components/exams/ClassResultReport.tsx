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

function GradeBadge({ grade, label }: { grade: Grade; label: string }) {
  return <Badge tone={GRADE_TONE[grade]}>Grade {grade} ({label})</Badge>;
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
                  {data.subj
