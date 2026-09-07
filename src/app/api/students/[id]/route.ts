import { eq } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const values: Partial<typeof students.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) values.name = body.name.trim();
  if (typeof body.admissionNo === "string" && body.admissionNo.trim())
    values.admissionNo = body.admissionNo.trim();
  if (body.gender === "female" || body.gender === "male") values.gender = body.gender;
  if (body.classId !== undefined) {
    values.classId =
      body.classId === "" || body.classId === null ? null : Number(body.classId) || null;
  }
  if (typeof body.guardianName === "string") values.guardianName = body.guardianName.trim();
  if (typeof body.guardianPhone === "string") values.guardianPhone = body.guardianPhone.trim();
  if (body.enrollmentDate !== undefined)
    values.enrollmentDate =
      typeof body.enrollmentDate === "string" && body.enrollmentDate ? body.enrollmentDate : null;

  if (Object.keys(values).length === 0)
    return Response.json({ error: "No changes were provided." }, { status: 400 });

  try {
    const [updated] = await db
      .update(students)
      .set(values)
      .where(eq(students.id, num))
      .returning();
    if (!updated) return Response.json({ error: "Student not found." }, { status: 404 });
    return Response.json(updated);
  } catch {
    return Response.json(
      { error: "This admission number is already in use. Please choose another one." },
      { status: 409 },
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });
  await db.delete(students).where(eq(students.id, num));
  return Response.json({ ok: true });
}
