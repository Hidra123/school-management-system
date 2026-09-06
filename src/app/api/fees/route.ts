import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, fees, students } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: fees.id,
      studentId: fees.studentId,
      description: fees.description,
      amount: fees.amount,
      paidAmount: fees.paidAmount,
      dueDate: fees.dueDate,
      createdAt: fees.createdAt,
      studentName: students.name,
      admissionNo: students.admissionNo,
      className: classes.name,
    })
    .from(fees)
    .innerJoin(students, eq(fees.studentId, students.id))
    .leftJoin(classes, eq(students.classId, classes.id))
    .orderBy(desc(fees.createdAt));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const studentId = Number(body.studentId);
  const amount = Number(body.amount);
  if (!Number.isFinite(studentId) || !Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Student and fee amount are required." }, { status: 400 });
  }
  const paidAmount = Number.isFinite(Number(body.paidAmount)) ? Math.max(0, Number(body.paidAmount)) : 0;

  const [row] = await db
    .insert(fees)
    .values({
      studentId,
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : "School fee",
      amount,
      paidAmount: Math.min(paidAmount, amount),
      dueDate: typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null,
    })
    .returning();
  return Response.json(row, { status: 201 });
}
