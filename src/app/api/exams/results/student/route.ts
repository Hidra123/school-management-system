import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, exams, grades, students, subjects } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { gradeRemark, pointsToDivision, scoreToGrade, scoreToPoint } from "@/lib/examGrading";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "exams.results");
  if (err) return err;

  try {
    const url = new URL(req.url);
    const studentId = Number(url.searchParams.get("studentId"));
    const examId = Number(url.searchParams.get("examId"));
    if (!Number.isFinite(studentId) || !Number.isFinite(examId)) {
      return Response.json({ error: "studentId and examId are required." }, { status: 400 });
    }

    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return Response.json({ error: "Student not found." }, { status: 404 });
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) return Response.json({ error: "Examination not found." }, { status: 404 });

    let className = "—";
    let section = "";
    if (student.classId) {
      const [cls] = await db.select().from(classes).where(eq(classes.id, student.classId)).limit(1);
      if (cls) {
        className = cls.name;
        section = cls.section;
      }
    }

    const rows = await db
      .select({ subjectId: grades.subjectId, score: grades.score, subjectName: subjects.name, subjectCode: subjects.code })
      .from(grades)
      .innerJoin(subjects, eq(grades.subjectId, subjects.id))
      .where(and(eq(grades.examId, examId), eq(grades.studentId, studentId)))
      .orderBy(asc(subjects.name));

    const subjectRows = rows.map((r) => {
      const grade = scoreToGrade(r.score);
      return {
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        subjectCode: r.subjectCode,
        score: r.score,
        grade,
        remark: gradeRemark(grade),
        points: scoreToPoint(r.score),
      };
    });

    const total = subjectRows.reduce((s, r) => s + r.score, 0);
    const average = subjectRows.length > 0 ? total / subjectRows.length : 0;
    const totalPoints = subjectRows.reduce((s, r) => s + r.points, 0);
    const division = pointsToDivision(totalPoints, subjectRows.length);
    const overallGrade = scoreToGrade(average);

    // ----- Position within class for this exam (rank by total points, then total score) -----
    let position = 1;
    let outOf = 1;
    if (student.classId) {
      const classmates = await db.select({ id: students.id }).from(students).where(eq(students.classId, student.classId));
      const classmateIds = classmates.map((c) => c.id);
      const classGrades =
        classmateIds.length === 0
          ? []
          : await db
              .select({ studentId: grades.studentId, score: grades.score })
              .from(grades)
              .where(eq(grades.examId, examId));
      const byStudent = new Map<number, { totalScore: number; totalPoints: number; count: number }>();
      for (const cid of classmateIds) byStudent.set(cid, { totalScore: 0, totalPoints: 0, count: 0 });
      for (const g of classGrades) {
        const bucket = byStudent.get(g.studentId);
        if (!bucket) continue;
        bucket.totalScore += g.score;
        bucket.totalPoints += scoreToPoint(g.score);
        bucket.count += 1;
      }
      const ranked = Array.from(byStudent.entries())
        .filter(([, v]) => v.count > 0)
        .sort((a, b) => a[1].totalPoints - b[1].totalPoints || b[1].totalScore - a[1].totalScore);
      outOf = ranked.length;
      const idx = ranked.findIndex(([id]) => id === studentId);
      position = idx >= 0 ? idx + 1 : ranked.length + 1;
    }

    return Response.json({
      student: { id: student.id, name: student.name, gender: student.gender, admissionNo: student.admissionNo },
      className,
      section,
      examName: exam.name,
      examType: exam.examType,
      academicYear: exam.academicYear,
      subjectRows,
      total,
      average: Math.round(average * 100) / 100,
      overallGrade,
      division,
      position,
      outOf,
    });
  } catch (e) {
    return dbErrorResponse(e, "generate the student's report card");
  }
}
