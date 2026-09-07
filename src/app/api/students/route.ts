import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { students, classes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allStudents = await db.select().from(students).orderBy(students.id);

    // Enrich with class names
    const enrichedStudents = await Promise.all(
      allStudents.map(async (student) => {
        if (student.classId) {
          const [cls] = await db
            .select({ name: classes.name, section: classes.section })
            .from(classes)
            .where(eq(classes.id, student.classId))
            .limit(1);
          return { ...student, className: cls ? `${cls.name} ${cls.section || ""}`.trim() : null };
        }
        return student;
      })
    );

    return NextResponse.json({ students: enrichedStudents });
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
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      admissionNo,
      name,
      gender,
      classId,
      guardianName,
      guardianPhone,
    } = await request.json();

    if (!admissionNo || !name) {
      return NextResponse.json(
        { error: "Admission number and name are required" },
        { status: 400 }
      );
    }

    // Check if admission number exists
    const [existing] = await db
      .select()
      .from(students)
      .where(eq(students.admissionNo, admissionNo))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Admission number already exists" },
        { status: 400 }
      );
    }

    const [newStudent] = await db
      .insert(students)
      .values({
        admissionNo,
        name,
        gender: gender || null,
        classId: classId || null,
        guardianName: guardianName || null,
        guardianPhone: guardianPhone || null,
      })
      .returning();

    return NextResponse.json({ success: true, student: newStudent });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
