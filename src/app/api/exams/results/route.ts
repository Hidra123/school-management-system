import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classes, exams, grades, students, subjects } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import {
  gpaToCompetency,
  isCoreSubject,
  pointsToDivision,
  scoreToGrade,
  scoreToPoint,
  type Division,
  type Grade,
} from "@/lib/examGrading";

export const dynamic = "force-dynamic";

/** Class-wide, NECTA-style examination results report for one class + one exam. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "exams.results");
  if (err) return err;

  try {
    const url = new URL(req.url);
    const classId = Number(url.searchParams.get("classId"));
    const examId = Number(url.searchParams.get("examId"));
    if (!Number.isFinite(classId) || !Number.isFinite(examId)) {
      return Response.json({ error: "classId and examId are required." }, { status: 400 });
    }

    const [cls] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
    if (!cls) return Response.json({ error: "Class not found." }, { status: 404 });
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) return Response.json({ error: "Examination not found." }, { status: 404 });

    const classStudents = await db
      .select({ id: students.id, name: students.name, gender: students.gender })
      .from(students)
      .where(eq(students.classId, classId))
      .orderBy(asc(students.name));
    const studentIds = classStudents.map((s) => s.id);

    const gradeRows =
      studentIds.length === 0
        ? []
        : await db
            .select({
              studentId: grades.studentId,
              subjectId: grades.subjectId,
              score: grades.score,
              subjectName: subjects.name,
              subjectCode: subjects.code,
            })
            .from(grades)
            .innerJoin(subjects, eq(grades.subjectId, subjects.id))
            .where(and(eq(grades.examId, examId), inArray(grades.studentId, studentIds)));

    // ----- Distinct subjects present in this exam's results -----
    const subjectMap = new Map<number, { id: number; name: string; code: string }>();
    for (const g of gradeRows) {
      if (!subjectMap.has(g.subjectId)) subjectMap.set(g.subjectId, { id: g.subjectId, name: g.subjectName, code: g.subjectCode });
    }
    const subjectList = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // ----- Per (student, subject) grade lookup -----
    const scoreByStudentSubject = new Map<string, number>();
    for (const g of gradeRows) scoreByStudentSubject.set(`${g.studentId}|${g.subjectId}`, g.score);

    // ----- Per-student totals, points, division -----
    type StudentComputed = {
      id: number;
      name: string;
      gender: "male" | "female";
      subjectScores: { subjectId: number; score: number | null; grade: Grade | null }[];
      totalPoints: number;
      subjectsTaken: number;
      totalScore: number;
      division: Division;
    };

    const computed: StudentComputed[] = classStudents.map((s) => {
      let totalPoints = 0;
      let subjectsTaken = 0;
      let totalScore = 0;
      const subjectScores = subjectList.map((subj) => {
        const score = scoreByStudentSubject.get(`${s.id}|${subj.id}`);
        if (score === undefined) return { subjectId: subj.id, score: null, grade: null };
        const grade = scoreToGrade(score);
        totalPoints += scoreToPoint(score);
        subjectsTaken += 1;
        totalScore += score;
        return { subjectId: subj.id, score, grade };
      });
      const division = pointsToDivision(totalPoints, subjectsTaken);
      return { id: s.id, name: s.name, gender: s.gender, subjectScores, totalPoints, subjectsTaken, totalScore, division };
    });

    // ----- Attendance summary (proxy: took the exam = present) -----
    const attendance = { F: { reg: 0, pre: 0 }, M: { reg: 0, pre: 0 } };
    for (const s of classStudents) {
      const sexKey = s.gender === "female" ? "F" : "M";
      attendance[sexKey].reg += 1;
      const c = computed.find((c) => c.id === s.id);
      if (c && c.subjectsTaken > 0) attendance[sexKey].pre += 1;
    }

    // ----- School Examination Ranking -----
    const withResults = computed.filter((c) => c.subjectsTaken > 0);
    const passedCandidates = withResults.filter((c) => c.division !== "0").length;
    const failedCandidates = withResults.filter((c) => c.division === "0").length;
    const examGpa =
      withResults.length > 0
        ? withResults.reduce((sum, c) => sum + c.totalPoints / Math.max(1, c.subjectsTaken), 0) / withResults.length
        : 0;
    const examGpaCompetency = gpaToCompetency(examGpa);

    // ----- Subject Performance -----
    const subjectPerformance = subjectList.map((subj) => {
      const entries = computed
        .map((c) => c.subjectScores.find((ss) => ss.subjectId === subj.id))
        .filter((e): e is { subjectId: number; score: number; grade: Grade } => !!e && e.score !== null);
      const gradeCounts: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
      for (const e of entries) gradeCounts[e.grade!]++;
      const pass = gradeCounts.A + gradeCounts.B + gradeCounts.C + gradeCounts.D;
      const fail = gradeCounts.F;
      const totalPoints = entries.reduce((sum, e) => sum + scoreToPoint(e.score), 0);
      const gpa = entries.length > 0 ? totalPoints / entries.length : 0;
      const competency = gpaToCompetency(gpa);
      return {
        subjectId: subj.id,
        name: subj.name,
        code: subj.code || subj.name.slice(0, 4).toUpperCase(),
        pass,
        fail,
        ...gradeCounts,
        gpa: Math.round(gpa * 100) / 100,
        competencyGrade: competency.grade,
        competencyLabel: competency.label,
      };
    });

    // ----- Division Performance (by sex) -----
    const divisionOrder: Division[] = ["I", "II", "III", "IV", "0"];
    const divisionPerformance = { F: {} as Record<Division, number>, M: {} as Record<Division, number> };
    for (const d of divisionOrder) {
      divisionPerformance.F[d] = 0;
      divisionPerformance.M[d] = 0;
    }
    for (const c of withResults) {
      const sexKey = c.gender === "female" ? "F" : "M";
      divisionPerformance[sexKey][c.division]++;
    }

    // ----- Grade Performance (by sex, across all subject entries) -----
    const gradePerformance = { F: { A: 0, B: 0, C: 0, D: 0, F: 0 }, M: { A: 0, B: 0, C: 0, D: 0, F: 0 } };
    for (const c of computed) {
      const sexKey = c.gender === "female" ? "F" : "M";
      for (const ss of c.subjectScores) {
        if (ss.grade) gradePerformance[sexKey][ss.grade]++;
      }
    }

    // ----- Full scoresheet + highlights, sorted by total points ascending (best first) -----
    const sheetRows = [...withResults].sort((a, b) => a.totalPoints - b.totalPoints || b.totalScore - a.totalScore);
    const passedList = sheetRows
      .filter((c) => c.division !== "0")
      .map((c, i) => ({ position: i + 1, id: c.id, name: c.name, gender: c.gender, grade: overallGradeOf(c), division: c.division, points: c.totalPoints }));
    const failedList = sheetRows
      .filter((c) => c.division === "0")
      .map((c) => ({ id: c.id, name: c.name, gender: c.gender, grade: overallGradeOf(c), points: c.totalPoints }));

    function overallGradeOf(c: StudentComputed): Grade {
      const avg = c.subjectsTaken > 0 ? c.totalScore / c.subjectsTaken : 0;
      return scoreToGrade(avg);
    }

    // ----- Core subject risk panels (Kiswahili, Historia) -----
    const coreSubjects = subjectList.filter((s) => isCoreSubject(s.name));
    const coreRisk = coreSubjects.map((subj) => {
      const rows = computed
        .map((c) => {
          const entry = c.subjectScores.find((ss) => ss.subjectId === subj.id);
          if (!entry || entry.score === null) return null;
          return { id: c.id, name: c.name, gender: c.gender, score: entry.score, grade: entry.grade! };
        })
        .filter((r): r is { id: number; name: string; gender: "male" | "female"; score: number; grade: Grade } => !!r && (r.grade === "F" || r.grade === "D"))
        .sort((a, b) => a.score - b.score)
        .map((r) => ({ ...r, status: r.grade === "F" ? "FAIL" : "RISK" }));
      return { subjectId: subj.id, subjectName: subj.name, rows };
    });

    return Response.json({
      className: cls.name,
      section: cls.section,
      examName: exam.name,
      examType: exam.examType,
      academicYear: exam.academicYear,
      attendance,
      ranking: { gpa: Math.round(examGpa * 100) / 100, competency: examGpaCompetency, passedCandidates, failedCandidates },
      subjectPerformance,
      divisionPerformance,
      gradePerformance,
      sheet: sheetRows.map((c) => ({
        id: c.id,
        name: c.name,
        gender: c.gender,
        subjectScores: c.subjectScores,
        division: c.division,
        points: c.totalPoints,
      })),
      subjectList: subjectList.map((s) => ({ id: s.id, name: s.name, code: s.code || s.name.slice(0, 4).toUpperCase() })),
      passedList,
      failedList,
      coreRisk,
      totalStudents: classStudents.length,
    });
  } catch (e) {
    return dbErrorResponse(e, "generate the examination results report");
  }
}
