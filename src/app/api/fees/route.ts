import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classes, fees, students } from "@/db/schema";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { classAllowed, getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const err = requirePermission(user, "fees.view");
  if (err) return err;

  const scope = await getTeacherScope(user);

  // Mwalimu asiye na darasa hana ada za kuona.
  if (scope.scoped && scope.classIds.length === 0) return Response.json([]);

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
    .where(scope.scoped ? inArray(students.classId, scope.classIds) : undefined)
    .orderBy(desc(fees.createdAt));

  return Response.json(rows);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "fees.manage");
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const studentId = Number(body.studentId);
  const amount = Number(body.amount);
  if (!Number.isFinite(studentId) || !Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Student and fee amount are required." }, { status: 400 });
  }

  // Mwalimu anaweza kuweka ada kwa wanafunzi wa madarasa yake tu.
  const scope = await getTeacherScope(user);
  if (scope.scoped) {
    const [target] = await db
      .select({ classId: students.classId })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);
    if (!target || !classAllowed(scope, target.classId)) {
      return Response.json(
        { error: "You can only manage fees for students in your assigned classes." },
        { status: 403 },
      );
    }
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
