import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fees } from "@/db/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const existing = await db.select().from(fees).where(eq(fees.id, num)).limit(1);
  const fee = existing[0];
  if (!fee) return Response.json({ error: "Fee record not found." }, { status: 404 });

  const values: Partial<typeof fees.$inferInsert> = {};

  if (body.payment !== undefined) {
    const p = Number(body.payment);
    if (!Number.isFinite(p) || p <= 0)
      return Response.json({ error: "Payment amount is invalid." }, { status: 400 });
    values.paidAmount = fee.paidAmount + p;
  } else if (body.paidAmount !== undefined) {
    const p = Number(body.paidAmount);
    if (!Number.isFinite(p) || p < 0)
      return Response.json({ error: "Payment amount is invalid." }, { status: 400 });
    values.paidAmount = p;
  }

  if (typeof body.description === "string" && body.description.trim())
    values.description = body.description.trim();
  if (body.amount !== undefined) {
    const a = Number(body.amount);
    if (Number.isFinite(a) && a > 0) values.amount = a;
  }
  if (body.dueDate !== undefined)
    values.dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;

  if (Object.keys(values).length === 0)
    return Response.json({ error: "No changes were provided." }, { status: 400 });

  const [updated] = await db.update(fees).set(values).where(eq(fees.id, num)).returning();
  return Response.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });
  await db.delete(fees).where(eq(fees.id, num));
  return Response.json({ ok: true });
}
