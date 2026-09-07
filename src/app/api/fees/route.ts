import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { fees, students } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");

    let whereClause = undefined;
    if (studentId || status) {
      const conditions = [];
      if (studentId) conditions.push(eq(fees.studentId, parseInt(studentId)));
      if (status) conditions.push(eq(fees.status, status));
      whereClause = and(...conditions);
    }

    const query = whereClause
      ? db.select().from(fees).where(whereClause)
      : db.select().from(fees);

    const allFees = await query;

    // Enrich with student names
    const enrichedFees = await Promise.all(
      allFees.map(async (record) => {
        const [student] = await db
          .select({ name: students.name, admissionNo: students.admissionNo })
          .from(students)
          .where(eq(students.id, record.studentId))
          .limit(1);

        return {
          ...record,
          studentName: student?.name,
          admissionNo: student?.admissionNo,
        };
      })
    );

    return NextResponse.json({ fees: enrichedFees });
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

    const { studentId, description, amount, dueDate } = await request.json();

    if (!studentId || !description || !amount) {
      return NextResponse.json(
        { error: "studentId, description, and amount are required" },
        { status: 400 }
      );
    }

    const [newFee] = await db
      .insert(fees)
      .values({
        studentId: parseInt(studentId),
        description,
        amount: parseInt(amount),
        paidAmount: 0,
        dueDate: dueDate || null,
        status: "pending",
      })
      .returning();

    return NextResponse.json({ success: true, fee: newFee });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
