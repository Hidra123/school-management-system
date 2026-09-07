import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, teachers } from "@/db/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const values: Partial<typeof subjects.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) values.name = body.name.trim();
  if (typeof body.code === "string") values.code = body.code.trim().toUpperCase();
  if (body.teacherId !== undefined) {
    values.teacherId =
      body.teacherId === "" || body.teacherId === null ? null : Number(body.teacherId) || null;
  }

  if (Object.keys(values).length === 0)
    return Response.json({ error: "No changes were provided." }, { status: 400 });

  const [updated] = await db
    .update(subjects)
    .set(values)
    .where(eq(subjects.id, num))
    .returning();
  if (!updated) return Response.json({ error: "Subject not found." }, { status: 404 });

  const teacher = updated.teacherId
    ? await db.select().from(teachers).where(eq(teachers.id, updated.teacherId)).limit(1)
    : [];
  return Response.json({ ...updated, teacherName: teacher[0]?.name ?? null });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });
  await db.delete(subjects).where(eq(subjects.id, num));
  return Response.json({ ok: true });
}
