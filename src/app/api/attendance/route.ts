import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { attendance, students, classes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");

    let whereClause = undefined;
    if (date || classId || studentId) {
      const conditions = [];
      if (date) conditions.push(eq(attendance.date, date as string));
      if (classId) conditions.push(eq(attendance.classId, parseInt(classId)));
      if (studentId) conditions.push(eq(attendance.studentId, parseInt(studentId)));
      whereClause = and(...conditions);
    }

    const query = whereClause
      ? db.select().from(attendance).where(whereClause)
      : db.select().from(attendance);

    const allAttendance = await query;

    // Enrich with student and class names
    const enrichedAttendance = await Promise.all(
      allAttendance.map(async (record) => {
        const [student] = await db
          .select({ name: students.name, admissionNo: students.admissionNo })
          .from(students)
          .where(eq(students.id, record.studentId))
          .limit(1);

        const [cls] = await db
          .select({ name: classes.name, section: classes.section })
          .from(classes)
          .where(eq(classes.id, record.classId))
          .limit(1);

        return {
          ...record,
          studentName: student?.name,
          admissionNo: student?.admissionNo,
          className: cls ? `${cls.name} ${cls.section || ""}`.trim() : null,
        };
      })
    );

    return NextResponse.json({ attendance: enrichedAttendance });
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

    const { studentId, classId, date, status } = await request.json();

    if (!studentId || !classId || !date || !status) {
      return NextResponse.json(
        { error: "studentId, classId, date, and status are required" },
        { status: 400 }
      );
    }

    // Check if attendance already exists for this student, class, and date
    const [existing] = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.studentId, parseInt(studentId)),
          eq(attendance.classId, parseInt(classId)),
          eq(attendance.date, date as string)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Attendance already recorded for this student on this date" },
        { status: 400 }
      );
    }

    const [newAttendance] = await db
      .insert(attendance)
      .values({
        studentId: parseInt(studentId),
        classId: parseInt(classId),
        date: date as string,
        status,
      })
      .returning();

    return NextResponse.json({ success: true, attendance: newAttendance });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
