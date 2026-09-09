import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { grades, students, subjects } from "@/db/schema";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { classAllowed, getTeacherScope, subjectAllowed } from "@/lib/teachers";
import { normalizeExamType } from "@/lib/examTypes";

export const dynamic = "force-dynamic";

/**
 * Exam types accepted for grades.
 * SE and CA are the only two choices offered in the UI (src/lib/examTypes.ts).
 * The legacy values stay here so rows saved before this rule (and any old
 * client still sending them) keep working instead of throwing.
 */
const EXAM_TYPES = ["SE", "CA", "assignment", "quiz", "midterm", "final", "project"];

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "grades.view");
  if (err) return err;

  // Submit Scores: Academic Master included — they only see the classes/subjects
  // the admin has assigned to them (strictForAcademicMaster).
  const scope = await getTeacherScope(user, { strictForAcademicMaster: true });

  const url = new URL(req.url);
  const classIdRaw = url.searchParams.get("classId");
  const subjectIdRaw = url.searchParams.get("subjectId");
  const examType = url.searchParams.get("examType");
  const studentIdRaw = url.searchParams.get("studentId");

  const classId = classIdRaw && Number.isFinite(Number(classIdRaw)) ? Number(classIdRaw) : null;
  const subjectId = subjectIdRaw && Number.isFinite(Number(subjectIdRaw)) ? Number(subjectIdRaw) : null;

  if (classId !== null && !classAllowed(scope, classId)) return Response.json([]);
  if (subjectId !== null && !subjectAllowed(scope, subjectId)) return Response.json([]);
  // Scoped teacher browsing without a subject filter → restrict to their own subjects.
  if (scope.scoped && subjectId === null && scope.subjectIds.length === 0) return Response.json([]);

  const conditions = [];
  if (classId !== null) {
    conditions.push(eq(students.classId, classId));
  } else if (scope.scoped) {
    // No explicit class chosen — keep results limited to the teacher's assigned classes.
    conditions.push(inArray(students.classId, scope.classIds.length > 0 ? scope.classIds : [-1]));
  }
  if (subjectId !== null) {
    conditions.push(eq(grades.subjectId, subjectId));
  } else if (scope.scoped) {
    conditions.push(inArray(grades.subjectId, scope.subjectIds.length > 0 ? scope.subjectIds : [-1]));
  }
  if (examType && EXAM_TYPES.includes(examType)) {
    conditions.push(eq(grades.examType, examType as (typeof grades.examType)["enumValues"][number]));
  }
  if (studentIdRaw && Number.isFinite(Number(studentIdRaw))) {
    conditions.push(eq(grades.studentId, Number(studentIdRaw)));
  }

  const rows = await db
    .select({
      id: grades.id,
      studentId: grades.studentId,
      subjectId: grades.subjectId,
      examType: grades.examType,
      term: grades.term,
      examId: grades.examId,
      score: grades.score,
      createdAt: grades.createdAt,
      studentName: students.name,
      admissionNo: students.admissionNo,
      subjectName: subjects.name,
    })
    .from(grades)
    .innerJoin(students, eq(grades.studentId, students.id))
    .innerJoin(subjects, eq(grades.subjectId, subjects.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(grades.createdAt));

  return Response.json(rows);
}

function scoreOf(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "grades.submit");
  if (err) return err;

  // Submit Scores: Academic Master included — they only see the classes/subjects
  // the admin has assigned to them (strictForAcademicMaster).
  const scope = await getTeacherScope(user, { strictForAcademicMaster: true });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  // Bulk mode: { subjectId, examType, term, examId?, entries: [{studentId, score}] }
  if (Array.isArray(body.entries)) {
    const subjectId = Number(body.subjectId);
    const examType = body.examType;
    const term = typeof body.term === "string" && body.term.trim() ? body.term.trim() : "Term 1";
    const examId =
      body.examId !== undefined && body.examId !== null && body.examId !== "" && Number.isFinite(Number(body.examId))
        ? Number(body.examId)
        : null;
    if (!Number.isFinite(subjectId) || !EXAM_TYPES.includes(examType)) {
      return Response.json({ error: "Subject or exam type is invalid." }, { status: 400 });
    }
    if (!subjectAllowed(scope, subjectId)) {
      return Response.json({ error: "You are not assigned to this subject." }, { status: 403 });
    }

    const entries: Array<{ studentId: number; score: number }> = [];
    for (const e of body.entries as Array<{ studentId?: unknown; score?: unknown }>) {
      const sid = Number(e?.studentId);
      const sc = scoreOf(e?.score);
      if (Number.isFinite(sid) && sc !== null) entries.push({ studentId: sid, score: sc });
    }
    if (entries.length === 0) {
      return Response.json({ error: "No valid scores were provided." }, { status: 400 });
    }

    if (scope.scoped) {
      // Make sure every student belongs to one of the teacher's assigned classes.
      const studentRows = await db
        .select({ id: students.id, classId: students.classId })
        .from(students)
        .where(inArray(students.id, entries.map((e) => e.studentId)));
      const badStudent = studentRows.find((s) => !classAllowed(scope, s.classId));
      if (badStudent || studentRows.length !== entries.length) {
        return Response.json({ error: "One or more students are outside your assigned classes." }, { status: 403 });
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(grades)
        .where(
          and(
            eq(grades.subjectId, subjectId),
            eq(grades.examType, examType as (typeof grades.examType)["enumValues"][number]),
            eq(grades.term, term),
            inArray(
              grades.studentId,
              entries.map((e) => e.studentId),
            ),
          ),
        );
      await tx.insert(grades).values(
        entries.map((e) => ({
          studentId: e.studentId,
          subjectId,
          examType: examType as (typeof grades.examType)["enumValues"][number],
          term,
          examId,
          score: e.score,
        })),
      );
    });
    return Response.json({ saved: entries.length }, { status: 201 });
  }

  // Single mode
  const studentId = Number(body.studentId);
  const subjectId = Number(body.subjectId);
  const examType = body.examType;
  const score = scoreOf(body.score);
  if (!Number.isFinite(studentId) || !Number.isFinite(subjectId) || !EXAM_TYPES.includes(examType)) {
    return Response.json({ error: "Grade data is invalid." }, { status: 400 });
  }
  if (score === null) return Response.json({ error: "Score is required (0-100)." }, { status: 400 });
  if (!subjectAllowed(scope, subjectId)) {
    return Response.json({ error: "You are not assigned to this subject." }, { status: 403 });
  }
  if (scope.scoped) {
    const [student] = await db.select({ classId: students.classId }).from(students).where(eq(students.id, studentId)).limit(1);
    if (!student || !classAllowed(scope, student.classId)) {
      return Response.json({ error: "This student is outside your assigned classes." }, { status: 403 });
    }
  }

  const [row] = await db
    .insert(grades)
    .values({
      studentId,
      subjectId,
      examType: examType as (typeof grades.examType)["enumValues"][number],
      term: typeof body.term === "string" && body.term.trim() ? body.term.trim() : "Term 1",
      score,
    })
    .returning();
  return Response.json(row, { status: 201 });
}
