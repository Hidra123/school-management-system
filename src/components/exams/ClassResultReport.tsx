"use client";

import { Fragment, type ReactNode } from "react";
import { Badge } from "@/components/ui";
import { cls } from "@/lib/utils";

type Grade = "A" | "B" | "C" | "D" | "F";
type SubjectScore = { subjectId: number; score: number | null; grade: Grade | null };
type SheetRow = { id: number; name: string; gender: "male" | "female"; subjectScores: SubjectScore[]; division: string; points: number | null };
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

const GRADE_TEXT: Record<Grade, string> = {
  A: "text-emerald-600", B: "text-sky-600", C: "text-violet-600", D: "text-amber-600", F: "text-rose-600",
};

/* Solid pills used for the competency column (as in the printed report) */
const GRADE_PILL: Record<Grade, string> = {
  A: "bg-emerald-600", B: "bg-blue-600", C: "bg-purple-700", D: "bg-orange-700", F: "bg-red-600",
};

const DIVISION_BADGE: Record<string, string> = {
  I: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  II: "bg-sky-50 text-sky-700 ring-sky-200",
  III: "bg-violet-50 text-violet-700 ring-violet-200",
  IV: "bg-amber-50 text-amber-700 ring-amber-200",
  "0": "bg-rose-50 text-rose-700 ring-rose-200",
};

/* Compact, fully-bordered table styling */
const TBL = "w-full border-collapse bg-white text-[9px] leading-tight";
const TH = "border border-slate-700 bg-slate-100 px-1 py-px text-center font-bold uppercase";
const TD = "border border-slate-700 px-1 py-px text-center";
const TDL = "border border-slate-700 px-1 py-px text-left font-semibold";

const DIVISIONS = ["I", "II", "III", "IV", "0"];

function GradePill({ grade, label, className }: { grade: Grade; label: string; className?: string }) {
  return (
    <span className={cls("inline-block whitespace-nowrap rounded-full px-2 py-px text-[8px] font-bold text-white", GRADE_PILL[grade], className)}>
      Grade {grade} ({label})
    </span>
  );
}

function DivisionPill({ division }: { division: string }) {
  return (
    <span className={cls("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset", DIVISION_BADGE[division] ?? "bg-slate-100 text-slate-600 ring-slate-200")}>
      {division}
    </span>
  );
}

function Panel({ title, children, center, className }: { title: string; children: ReactNode; center?: boolean; className?: string }) {
  return (
    <div className={cls("exam-report-panel rounded-lg border border-blue-200 bg-blue-50 p-1.5", className)}>
      <p className={cls("mb-1 px-1 text-[10px] font-extrabold uppercase text-slate-900", center && "text-center")}>{title}</p>
      {children}
    </div>
  );
}

export default function ClassResultReport({ data, identity }: { data: ClassResultsData; identity: { schoolName: string; councilName: string; motto: string; logoLeftData: string; logoRightData: string } | null }) {
  const totalReg = data.attendance.F.reg + data.attendance.M.reg;
  const totalPre = data.attendance.F.pre + data.attendance.M.pre;
  const absF = data.attendance.F.reg - data.attendance.F.pre;
  const absM = data.attendance.M.reg - data.attendance.M.pre;
  const divCount = (sex: "F" | "M", d: string) => data.divisionPerformance[sex][d] ?? 0;
  const divTotal = (d: string) => divCount("F", d) + divCount("M", d);
  const gradeSum = (sex: "F" | "M") => { const g = data.gradePerformance[sex]; return g.A + g.B + g.C + g.D + g.F; };
  const GRADES: Grade[] = ["A", "B", "C", "D", "F"];

  return (
    <div className="exam-print-area exam-report rounded-2xl border border-slate-400 bg-white p-4 text-sm print:p-2">
      {/* Header */}
      <div className="exam-report-heading mb-3 grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-3 rounded-xl border border-slate-400 bg-slate-50 px-3 py-2 text-center print:grid-cols-[52px_minmax(0,1fr)_52px] print:gap-2 print:px-2 print:py-1">
        <div className="flex h-16 items-center justify-center print:h-12">
          {identity?.logoLeftData && (
            <img src={identity.logoLeftData} alt={`${identity.schoolName} left logo`} className="max-h-14 max-w-full rounded-md border border-slate-300 bg-white object-contain p-0.5 shadow-sm print:max-h-11" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-blue-800 print:text-[9px]">THE PRIME MINISTER&apos;S OFFICE</p>
          <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-blue-800 print:text-[9px]">REGIONAL ADMINISTRATION AND LOCAL GOVERNMENT</p>
          {identity?.councilName && <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-blue-800 print:text-[9px]">{identity.councilName}</p>}
          <p className="mt-0.5 text-lg font-extrabold uppercase leading-tight text-blue-800 print:text-base">{identity?.schoolName || "Loading school identity…"}</p>
          <h1 className="text-xs font-normal uppercase leading-tight text-slate-800 print:text-[10px]">CLASS EXAMINATION RESULTS</h1>
          <div className="mt-1.5 inline-block rounded-lg border border-blue-500 bg-blue-50 px-4 py-1 text-xs font-bold text-blue-900 print:py-0.5">
            {data.className}{data.section ? ` ${data.section}` : ""} ({data.examName}) Examination Result
            {data.academicYear ? `: ${data.academicYear}` : ""}
          </div>
        </div>
        <div className="flex h-16 items-center justify-center print:h-12">
          {identity?.logoRightData && (
            <img src={identity.logoRightData} alt={`${identity.schoolName} right logo`} className="max-h-14 max-w-full rounded-md border border-slate-300 bg-white object-contain p-0.5 shadow-sm print:max-h-11" />
          )}
        </div>
      </div>

      {/* Attendance + Ranking */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 print:grid-cols-2">
        <Panel title="STUDENT'S ATTENDANCE">
          <table className={TBL}>
            <thead>
              <tr><th className={TH}>SEX</th><th className={TH}>F</th><th className={TH}>M</th><th className={TH}>TOTAL</th></tr>
            </thead>
            <tbody>
              <tr><td className={cls(TD, "font-bold")}>REG</td><td className={TD}>{data.attendance.F.reg}</td><td className={TD}>{data.attendance.M.reg}</td><td className={cls(TD, "font-bold")}>{totalReg}</td></tr>
              <tr><td className={cls(TD, "font-bold")}>PRE</td><td className={TD}>{data.attendance.F.pre}</td><td className={TD}>{data.attendance.M.pre}</td><td className={cls(TD, "font-bold")}>{totalPre}</td></tr>
              <tr><td className={cls(TD, "font-bold")}>ABS</td><td className={TD}>{absF}</td><td className={TD}>{absM}</td><td className={cls(TD, "font-bold")}>{totalReg - totalPre}</td></tr>
            </tbody>
          </table>
        </Panel>

        <Panel title="SCHOOL EXAMINATION RANKING">
          <table className={TBL}>
            <thead>
              <tr><th className={TH}>EXAMINATION GPA</th><th className={TH}>PASSED CANDIDATES</th><th className={TH}>FAILED CANDIDATES</th></tr>
            </thead>
            <tbody>
              <tr>
                <td className={TD}>
                  <span className={cls("inline-block whitespace-nowrap rounded-full px-2 py-px text-[8px] font-bold uppercase text-white", GRADE_PILL[data.ranking.competency.grade])}>
                    {data.ranking.gpa.toFixed(4)} Grade {data.ranking.competency.grade} ({data.ranking.competency.label})
                  </span>
                </td>
                <td className={TD}>{data.ranking.passedCandidates}</td>
                <td className={TD}>{data.ranking.failedCandidates}</td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Subject Performance + Division Performance */}
      <div className="mt-3 grid grid-cols-1 items-start gap-3 lg:grid-cols-2 print:grid-cols-2">
        <Panel title="SUBJECT PERFORMANCE">
          <div className="overflow-x-auto">
            <table className={TBL}>
              <thead>
                <tr>
                  <th className={TH}>S/N</th><th className={TH}>SUBJECT</th>
                  <th className={TH}>PASS</th><th className={TH}>FAIL</th>
                  <th className={TH}>A</th><th className={TH}>B</th><th className={TH}>C</th><th className={TH}>D</th><th className={TH}>F</th>
                  <th className={TH}>GPA</th><th className={TH}>COMPETENCY</th>
                </tr>
              </thead>
              <tbody>
                {data.subjectPerformance.map((s, i) => (
                  <tr key={s.subjectId}>
                    <td className={TD}>{i + 1}</td>
                    <td className={TDL}>{s.name}</td>
                    <td className={TD}>{s.pass}</td>
                    <td className={TD}>{s.fail}</td>
                    <td className={TD}>{s.A}</td><td className={TD}>{s.B}</td><td className={TD}>{s.C}</td><td className={TD}>{s.D}</td><td className={TD}>{s.F}</td>
                    <td className={TD}>{Number(s.gpa).toFixed(2)}</td>
                    <td className={TD}><GradePill grade={s.competencyGrade} label={s.competencyLabel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="DIVISION PERFORMANCE">
          <table className={TBL}>
            <thead>
              <tr>
                <th className={TH}>SEX</th>
                {DIVISIONS.map((d) => <th key={d} className={TH}>{d}</th>)}
                <th className={TH}>ABS</th>
                <th className={TH}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {(["F", "M"] as const).map((sex) => (
                <tr key={sex}>
                  <td className={cls(TD, "font-bold")}>{sex}</td>
                  {DIVISIONS.map((d) => <td key={d} className={TD}>{divCount(sex, d)}</td>)}
                  <td className={TD}>{sex === "F" ? absF : absM}</td>
                  <td className={cls(TD, "font-bold")}>{data.attendance[sex].reg}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td className={TD}>TOTAL</td>
                {DIVISIONS.map((d) => <td key={d} className={TD}>{divTotal(d)}</td>)}
                <td className={TD}>{totalReg - totalPre}</td>
                <td className={TD}>{data.totalStudents}</td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Student's Division + Grade Performance */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 print:grid-cols-2">
        <Panel title="STUDENT'S DIVISION">
          <table className={TBL}>
            <thead>
              <tr><th className={TH}>SEX</th>{DIVISIONS.map((d) => <th key={d} className={TH}>{d}</th>)}<th className={TH}>TOTAL</th></tr>
            </thead>
            <tbody>
              {(["F", "M"] as const).map((sex) => (
                <tr key={sex}>
                  <td className={cls(TD, "font-bold")}>{sex}</td>
                  {DIVISIONS.map((d) => <td key={d} className={TD}>{divCount(sex, d)}</td>)}
                  <td className={cls(TD, "font-bold")}>{data.attendance[sex].reg}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td className={TD}>TOTAL</td>
                {DIVISIONS.map((d) => <td key={d} className={TD}>{divTotal(d)}</td>)}
                <td className={TD}>{data.totalStudents}</td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel title="STUDENT'S GRADE PERFORMANCE">
          <table className={TBL}>
            <thead>
              <tr><th className={TH}>SEX</th>{GRADES.map((g) => <th key={g} className={TH}>{g}</th>)}<th className={TH}>TOTAL</th></tr>
            </thead>
            <tbody>
              {(["F", "M"] as const).map((sex) => (
                <tr key={sex}>
                  <td className={cls(TD, "font-bold")}>{sex}</td>
                  {GRADES.map((g) => <td key={g} className={TD}>{data.gradePerformance[sex][g]}</td>)}
                  <td className={cls(TD, "font-bold")}>{gradeSum(sex)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td className={TD}>TOTAL</td>
                {GRADES.map((g) => <td key={g} className={TD}>{data.gradePerformance.F[g] + data.gradePerformance.M[g]}</td>)}
                <td className={TD}>{gradeSum("F") + gradeSum("M")}</td>
              </tr>
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Full scoresheet */}
      <Panel title="STUDENT'S EXAMINATION GRADING SCORES SHEET" center className="mt-3">
        <div className="overflow-x-auto">
          <table className={cls(TBL, "text-[8px]")}>
            <thead>
              <tr>
                <th rowSpan={2} className={TH}>S/N</th>
                <th rowSpan={2} className={cls(TH, "text-left")}>NAME</th>
                <th rowSpan={2} className={TH}>SEX</th>
                {data.subjectList.map((s) => (
                  <th key={s.id} colSpan={2} className={TH}>{s.code}</th>
                ))}
                <th rowSpan={2} className={TH}>DIVISION</th>
                <th rowSpan={2} className={TH}>POINT</th>
              </tr>
              <tr>
                {data.subjectList.map((s) => (
                  <Fragment key={s.id}>
                    <th className={cls(TH, "px-0.5")}>S</th>
                    <th className={cls(TH, "px-0.5")}>G</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.sheet.map((row, i) => (
                <tr key={row.id}>
                  <td className={TD}>{i + 1}</td>
                  <td className={TDL}>{row.name}</td>
                  <td className={TD}>{row.gender === "female" ? "Female" : "Male"}</td>
                  {data.subjectList.map((subj) => {
                    const entry = row.subjectScores.find((ss) => ss.subjectId === subj.id);
                    return (
                      <Fragment key={subj.id}>
                        <td className={cls(TD, "px-0.5", entry?.grade === "F" && "font-bold text-rose-600")}>
                          {entry && entry.score !== null ? entry.score : "-"}
                        </td>
                        <td className={cls(TD, "px-0.5")}>{entry?.grade ?? "-"}</td>
                      </Fragment>
                    );
                  })}
                  <td className={cls(TD, "font-bold")}>{row.division}</td>
                  <td className={cls(TD, "font-bold")}>{row.points ?? "-"}</td>
                </tr>
              ))}
              {data.sheet.length === 0 && (
                <tr>
                  <td colSpan={5 + data.subjectList.length * 2} className="border border-slate-700 px-3 py-6 text-center text-slate-400">
                    No scores have been submitted for this examination yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Passed + Failed lists */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2">
        <div className="exam-report-panel overflow-hidden rounded-xl border border-emerald-200">
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

        <div className="exam-report-panel overflow-hidden rounded-xl border border-rose-200">
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-2">
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
