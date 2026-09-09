import { eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, examClasses, exams } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseClassNames(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function PUT(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requirePermission(user, "exams.manage");
  if (err) return err;

  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  try {
    const values: Partial<typeof exams.$inferInsert> = {};
    if (typeof body.name === "string" && body.name.trim()) values.name = body.name.trim();
    if (typeof body.examType === "string") values.examType = body.examType.trim() || "SE";
    if (typeof body.academicYear === "string") values.academicYear = body.academicYear.trim();
    if (body.startDate !== undefined)
      values.startDate = typeof body.startDate === "string" && body.startDate ? body.startDate : null;
    if (body.endDate !== undefined)
      values.endDate = typeof body.endDate === "string" && body.endDate ? body.endDate : null;
    if (typeof body.remarks === "string") values.remarks = body.remarks.trim();
    if (body.status === "active" || body.status === "inactive") values.status = body.status;

    if (Object.keys(values).length > 0) {
      const [updated] = await db.update(exams).set(values).where(eq(exams.id, num)).returning();
      if (!updated) return Response.json({ error: "Examination not found." }, { status: 404 });
    }

    if (body.classes !== undefined) {
      const classNames = parseClassNames(body.classes);
      await db.delete(examClasses).where(eq(examClasses.examId, num));
      if (classNames.length > 0) {
        const allClasses = await db.select().from(classes);
        const byName = new Map(allClasses.map((c) => [c.name.trim().toLowerCase(), c.id]));
        const unmatched: string[] = [];
        const classIds: number[] = [];
        for (const name of classNames) {
          const cid = byName.get(name.toLowerCase());
          if (cid !== undefined) classIds.push(cid);
          else unmatched.push(name);
        }
        if (unmatched.length > 0) {
          return Response.json(
            { error: `These classes were not found: ${unmatched.join(", ")}.` },
            { status: 400 },
          );
        }
        if (classIds.length > 0) {
          await db.insert(examClasses).values(classIds.map((classId) => ({ examId: num, classId })));
        }
      }
    }

    const [row] = await db.select().from(exams).where(eq(exams.id, num)).limit(1);
    if (!row) return Response.json({ error: "Examination not found." }, { status: 404 });
    return Response.json(row);
  } catch (e) {
    return dbErrorResponse(e, "update the examination");
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requirePermission(user, "exams.manage");
  if (err) return err;

  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isInteger(num)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  try {
    await db.delete(exams).where(eq(exams.id, num));
    return Response.json({ ok: true });
  } catch (e) {
    return dbErrorResponse(e, "delete the examination");
  }
}
