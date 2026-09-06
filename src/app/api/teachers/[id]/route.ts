import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teachers } from "@/db/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const values: Partial<typeof teachers.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) values.name = body.name.trim();
  if (typeof body.email === "string") values.email = body.email.trim();
  if (typeof body.phone === "string") values.phone = body.phone.trim();
  if (typeof body.subject === "string") values.subject = body.subject.trim();
  if (typeof body.qualification === "string") values.qualification = body.qualification.trim();
  if (body.hireDate !== undefined)
    values.hireDate = typeof body.hireDate === "string" && body.hireDate ? body.hireDate : null;

  if (Object.keys(values).length === 0)
    return Response.json({ error: "No changes were provided." }, { status: 400 });

  const [updated] = await db
    .update(teachers)
    .set(values)
    .where(eq(teachers.id, num))
    .returning();
  if (!updated) return Response.json({ error: "Teacher not found." }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });
  await db.delete(teachers).where(eq(teachers.id, num));
  return Response.json({ ok: true });
}
