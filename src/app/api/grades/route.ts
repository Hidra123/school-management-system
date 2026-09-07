import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { grades, students, subjects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");
    const examType = searchParams.get("examType");
    const term = searchParams.get("term");

    let whereClause = undefined;
    if (studentId || subjectId || examType || term) {
      const conditions = [];
      if (studentId) conditions.push(eq(grades.studentId, parseInt(studentId)));
      if (subjectId) conditions.push(eq(grades.subjectId, parseInt(subjectId)));
      if (examType) conditions.push(eq(grades.examType, examType));
      if (term) conditions.push(eq(grades.term, term));
      whereClause = and(...conditions);
    }

    const query = whereClause
      ? db.select().from(grades).where(whereClause)
      : db.select().from(grades);

    const allGrades = await query;

    // Enrich with student and subject names
    const enrichedGrades = await Promise.all(
      allGrades.map(async (record) => {
        const [student] = await db
          .select({ name: students.name, admissionNo: students.admissionNo })
          .from(students)
          .where(eq(students.id, record.studentId))
          .limit(1);

        const [subject] = await db
          .select({ name: subjects.name, code: subjects.code })
          .from(subjects)
          .where(eq(subjects.id, record.subjectId))
          .limit(1);

        return {
          ...record,
          studentName: student?.name,
          admissionNo: student?.admissionNo,
          subjectName: subject?.name,
          subjectCode: subject?.code,
        };
      })
    );

    return NextResponse.json({ grades: enrichedGrades });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId, subjectId, examType, term, score } = await request.json();

    if (!studentId || !subjectId || !examType || !term || score === undefined) {
      return NextResponse.json(
        { error: "studentId, subjectId, examType, term, and score are required" },
        { status: 400 }
      );
    }

    // Check if grade already exists
    const [existing] = await db
      .select()
      .from(grades)
      .where(
        and(
          eq(grades.studentId, parseInt(studentId)),
          eq(grades.subjectId, parseInt(subjectId)),
          eq(grades.examType, examType),
          eq(grades.term, term)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Grade already recorded for this student and subject" },
        { status: 400 }
      );
    }

    const [newGrade] = await db
      .insert(grades)
      .values({
        studentId: parseInt(studentId),
        subjectId: parseInt(subjectId),
        examType,
        term,
        score: parseInt(score),
      })
      .returning();

    return NextResponse.json({ success: true, grade: newGrade });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
