import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { getSessionUser, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requirePermission(user, "classes.manage");
  if (err) return err;

  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const values: Partial<typeof classes.$inferInsert> = {};
  if (typeof body.name === "string" && body.name.trim()) values.name = body.name.trim();
  if (typeof body.section === "string") values.section = body.section.trim();
  if (body.capacity !== undefined && body.capacity !== null && body.capacity !== "")
    values.capacity = Math.max(1, Number(body.capacity) || 40);

  if (Object.keys(values).length === 0)
    return Response.json({ error: "No changes were provided." }, { status: 400 });

  const [updated] = await db.update(classes).set(values).where(eq(classes.id, num)).returning();
  if (!updated) return Response.json({ error: "Class not found." }, { status: 404 });

  const countRow = await db
    .select({ n: count() })
    .from(students)
    .where(eq(students.classId, num));
  return Response.json({ ...updated, studentCount: countRow[0]?.n ?? 0 });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requirePermission(user, "classes.manage");
  if (err) return err;

  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });
  await db.delete(classes).where(eq(classes.id, num));
  return Response.json({ ok: true });
}
