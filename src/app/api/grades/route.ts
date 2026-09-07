import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { grades, students, subjects } from "@/db/schema";

export const dynamic = "force-dynamic";

const EXAM_TYPES = ["assignment", "quiz", "midterm", "final", "project"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const classIdRaw = url.searchParams.get("classId");
  const subjectIdRaw = url.searchParams.get("subjectId");
  const examType = url.searchParams.get("examType");
  const studentIdRaw = url.searchParams.get("studentId");

  const conditions = [];
  if (classIdRaw && Number.isFinite(Number(classIdRaw))) {
    conditions.push(eq(students.classId, Number(classIdRaw)));
  }
  if (subjectIdRaw && Number.isFinite(Number(subjectIdRaw))) {
    conditions.push(eq(grades.subjectId, Number(subjectIdRaw)));
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
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  // Bulk mode: { subjectId, examType, term, entries: [{studentId, score}] }
  if (Array.isArray(body.entries)) {
    const subjectId = Number(body.subjectId);
    const examType = body.examType;
    const term = typeof body.term === "string" && body.term.trim() ? body.term.trim() : "Term 1";
    if (!Number.isFinite(subjectId) || !EXAM_TYPES.includes(examType)) {
      return Response.json({ error: "Subject or exam type is invalid." }, { status: 400 });
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
