import { eq } from "drizzle-orm";
import { db } from "@/db";
import { grades } from "@/db/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const values: Partial<typeof grades.$inferInsert> = {};
  if (body.score !== undefined) {
    const n = Number(body.score);
    if (!Number.isFinite(n)) return Response.json({ error: "Score is invalid." }, { status: 400 });
    values.score = Math.min(100, Math.max(0, n));
  }
  if (typeof body.term === "string" && body.term.trim()) values.term = body.term.trim();

  if (Object.keys(values).length === 0)
    return Response.json({ error: "No changes were provided." }, { status: 400 });

  const [updated] = await db.update(grades).set(values).where(eq(grades.id, num)).returning();
  if (!updated) return Response.json({ error: "Grade record not found." }, { status: 404 });
  return Response.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });
  await db.delete(grades).where(eq(grades.id, num));
  return Response.json({ ok: true });
}
