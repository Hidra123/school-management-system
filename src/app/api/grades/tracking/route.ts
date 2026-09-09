import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, examClasses, exams, grades, students, subjects, teacherClasses, teachers } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { isExamType } from "@/lib/examTypes";

export const dynamic = "force-dynamic";

/**
 * Score Tracking report — school-wide (Academic Master / admin).
 * An "assignment" = (exam, class, subject) that should have scores:
 *   - subjects come from teacher assignments (teacher_classes × subjects.teacherId)
 *     plus any subject that already has grades for that exam+class
 *   - status = "submitted" when at least one grade exists, otherwise "pending"
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "grades.track");
  if (err) return err;

  try {
    const url = new URL(req.url);
    const classIdRaw = url.searchParams.get("classId");
    const examType = url.searchParams.get("examType");
    const examIdRaw = url.searchParams.get("examId");
    const year = url.searchParams.get("year")?.trim();

    const classId = classIdRaw && Number.isFinite(Number(classIdRaw)) ? Number(classIdRaw) : null;
    const examId = examIdRaw && Number.isFinite(Number(examIdRaw)) ? Number(examIdRaw) : null;

    // ---- Exams (filtered) ----
    const examFilters = [];
    if (examId) examFilters.push(eq(exams.id, examId));
    if (examType && isExamType(examType)) examFilters.push(eq(exams.examType, examType));
    if (year) examFilters.push(eq(exams.academicYear, year));

    const examRows = await db
      .select({ id: exams.id, name: exams.name, examType: exams.examType, academicYear: exams.academicYear, startDate: exams.startDate })
      .from(exams)
      .where(examFilters.length ? and(...examFilters) : undefined)
      .orderBy(asc(exams.startDate));

    const emptyReport = {
      exams: [],
      rows: [],
      stats: { totalAssignments: 0, submitted: 0, pending: 0, completionRate: 0 },
    };
    if (examRows.length === 0) return Response.json(emptyReport);
    const examIds = examRows.map((e) => e.id);

    // ---- Classes ----
    const classRows = classId
      ? await db.select().from(classes).where(eq(classes.id, classId))
      : await db.select().from(classes).orderBy(asc(classes.name));
    const classById = new Map(classRows.map((c) => [c.id, c]));

    // ---- Which classes each exam applies to ----
    const links = await db.select().from(examClasses).where(inArray(examClasses.examId, examIds));
    const examClassMap = new Map<number, number[]>();
    for (const l of links) {
      if (!examClassMap.has(l.examId)) examClassMap.set(l.examId, []);
      examClassMap.get(l.examId)!.push(l.classId);
    }

    // ---- Subjects + teachers ----
    const subjectRows = await db
      .select({ id: subjects.id, name: subjects.name, code: subjects.code, teacherId: subjects.teacherId })
      .from(subjects);
    const teacherRows = await db.select({ id: teachers.id, name: teachers.name }).from(teachers);
    const teacherById = new Map(teacherRows.map((t) => [t.id, t.name]));
    const teacherSubjectIds = new Map<number, number[]>();
    for (const s of subjectRows) {
      if (s.teacherId) {
        if (!teacherSubjectIds.has(s.teacherId)) teacherSubjectIds.set(s.teacherId, []);
        teacherSubjectIds.get(s.teacherId)!.push(s.id);
      }
    }

    // ---- Subjects taught in each class (teacher assignments) ----
    const classSubjects = new Map<number, Set<number>>();
    const addSubject = (cid: number, sid: number) => {
      if (!classSubjects.has(cid)) classSubjects.set(cid, new Set());
      classSubjects.get(cid)!.add(sid);
    };
    const tcRows = await db.select().from(teacherClasses);
    for (const tc of tcRows) {
      for (const sid of teacherSubjectIds.get(tc.teacherId) ?? []) addSubject(tc.classId, sid);
    }

    // ---- Grades aggregation per (exam, class, subject) ----
    // grades has no classId column — derive it via the student's class.
    const gradeAgg = await db
      .select({
        examId: grades.examId,
        classId: students.classId,
        subjectId: grades.subjectId,
        n: sql<number>`count(${grades.id})::int`,
        lastAt: sql<string>`max(${grades.createdAt})`,
      })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .where(inArray(grades.examId, examIds))
      .groupBy(grades.examId, students.classId, grades.subjectId);

    // Subjects with grades count as assignments even if not in teacher assignment
    for (const g of gradeAgg) {
      if (g.classId !== null) addSubject(g.classId, g.subjectId);
    }

    // ---- Student count per class ----
    const stuCounts = await db
      .select({ classId: students.classId, n: sql<number>`count(*)::int` })
      .from(students)
      .groupBy(students.classId);
    const studentCountByClass = new Map<number, number>();
    for (const s of stuCounts) {
      if (s.classId !== null) studentCountByClass.set(s.classId, s.n);
    }

    const keyOf = (examId: number | null, classId: number | null, subjectId: number) => `${examId}|${classId}|${subjectId}`;
    const gradeMap = new Map<string, (typeof gradeAgg)[number]>();
    for (const g of gradeAgg) {
      if (g.examId !== null && g.classId !== null) {
        gradeMap.set(keyOf(g.examId, g.classId, g.subjectId), g);
      }
    }

    // ---- Build rows ----
    const rows: {
      examId: number; examName: string; examType: string; academicYear: string;
      classId: number; className: string; section: string;
      subjectId: number; subjectName: string; code: string;
      teacherName: string; students: number; submitted: number; expected: number;
      status: "submitted" | "pending"; submittedAt: string | null;
    }[] = [];

    const subjectById = new Map(subjectRows.map((s) => [s.id, s]));

    for (const exam of examRows) {
      const classIdsForExam = examClassMap.get(exam.id)?.length ? examClassMap.get(exam.id)! : classRows.map((c) => c.id);
      for (const cid of classIdsForExam) {
        const cls = classById.get(cid);
        if (!cls) continue;
        const sids = classSubjects.get(cid);
        if (!sids || sids.size === 0) continue;
        for (const sid of [...sids].sort((a, b) => a - b)) {
          const subject = subjectById.get(sid);
          if (!subject) continue;
          const g = gradeMap.get(keyOf(exam.id, cid, sid));
          const studentsCount = studentCountByClass.get(cid) ?? 0;
          const submitted = g?.n ?? 0;
          const expected = Math.max(studentsCount, submitted);
          rows.push({
            examId: exam.id,
            examName: exam.name,
            examType: exam.examType,
            academicYear: exam.academicYear,
            classId: cid,
            className: cls.name,
            section: cls.section ?? "",
            subjectId: sid,
            subjectName: subject.name,
            code: subject.code ?? "",
            teacherName: subject.teacherId ? (teacherById.get(subject.teacherId) ?? "Unassigned") : "Unassigned",
            students: studentsCount,
            submitted,
            expected,
            status: submitted > 0 ? "submitted" : "pending",
            submittedAt: g?.lastAt ?? null,
          });
        }
      }
    }

    rows.sort((a, b) => a.className.localeCompare(b.className) || a.subjectName.localeCompare(b.subjectName));

    const totalAssignments = rows.length;
    const submittedCount = rows.filter((r) => r.status === "submitted").length;

    return Response.json({
      exams: examRows.map((e) => ({ id: e.id, name: e.name, examType: e.examType, academicYear: e.academicYear })),
      rows,
      stats: {
        totalAssignments,
        submitted: submittedCount,
        pending: totalAssignments - submittedCount,
        completionRate: totalAssignments ? Math.round((submittedCount / totalAssignments) * 100) : 0,
      },
    });
  } catch (e) {
    return dbErrorResponse(e, "load the score tracking report");
  }
}
