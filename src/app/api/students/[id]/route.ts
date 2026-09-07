import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.id, parseInt(id)))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const {
      admissionNo,
      name,
      gender,
      classId,
      guardianName,
      guardianPhone,
    } = await request.json();

    const [existing] = await db
      .select()
      .from(students)
      .where(eq(students.id, parseInt(id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if admission number is being changed and if it already exists
    if (admissionNo && admissionNo !== existing.admissionNo) {
      const [admissionExists] = await db
        .select()
        .from(students)
        .where(eq(students.admissionNo, admissionNo))
        .limit(1);
      if (admissionExists) {
        return NextResponse.json(
          { error: "Admission number already exists" },
          { status: 400 }
        );
      }
    }

    const [updated] = await db
      .update(students)
      .set({
        admissionNo: admissionNo || existing.admissionNo,
        name: name || existing.name,
        gender: gender !== undefined ? gender : existing.gender,
        classId: classId !== undefined ? classId : existing.classId,
        guardianName:
          guardianName !== undefined ? guardianName : existing.guardianName,
        guardianPhone:
          guardianPhone !== undefined ? guardianPhone : existing.guardianPhone,
      })
      .where(eq(students.id, parseInt(id)))
      .returning();

    return NextResponse.json({ success: true, student: updated });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.delete(students).where(eq(students.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
