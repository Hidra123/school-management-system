import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { classes, subjects, teacherClasses, teachers } from "@/db/schema";
import { getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET: full picture used to render the assignment modal —
 * every subject/class plus which teacher (if any) currently owns it.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await ctx.params;
  const teacherId = Number(id);
  if (!Number.isInteger(teacherId)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  try {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
    if (!teacher) return Response.json({ error: "Teacher not found." }, { status: 404 });

    const allSubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        teacherId: subjects.teacherId,
        teacherName: teachers.name,
      })
      .from(subjects)
      .leftJoin(teachers, eq(subjects.teacherId, teachers.id))
      .orderBy(asc(subjects.name));

    const allClasses = await db.select().from(classes).orderBy(asc(classes.name));

    const assignedClassRows = await db
      .select({ classId: teacherClasses.classId })
      .from(teacherClasses)
      .where(eq(teacherClasses.teacherId, teacherId));

    // Which teacher (if any) owns each class — so the UI can flag conflicts.
    const otherAssignments = await db
      .select({ classId: teacherClasses.classId, teacherId: teacherClasses.teacherId, teacherName: teachers.name })
      .from(teacherClasses)
      .innerJoin(teachers, eq(teacherClasses.teacherId, teachers.id))
      .where(ne(teacherClasses.teacherId, teacherId));

    const classOwners = new Map<number, string>();
    for (const o of otherAssignments) classOwners.set(o.classId, o.teacherName);

    return Response.json({
      teacherId,
      subjects: allSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        assignedToMe: s.teacherId === teacherId,
        assignedToOther: s.teacherId !== null && s.teacherId !== teacherId ? s.teacherName : null,
      })),
      classes: allClasses.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        assignedToMe: assignedClassRows.some((r) => r.classId === c.id),
        assignedToOther: classOwners.get(c.id) ?? null,
      })),
      subjectIds: allSubjects.filter((s) => s.teacherId === teacherId).map((s) => s.id),
      classIds: assignedClassRows.map((r) => r.classId),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown database error";
    return Response.json(
      { error: `Failed to load assignment data. This usually means the database schema is out of date — ask the developer to run "npx drizzle-kit push". (${message})` },
      { status: 500 },
    );
  }
}

/**
 * PUT: replace this teacher's subject + class assignments.
 * body: { subjectIds: number[], classIds: number[] }
 */
export async function PUT(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const { id } = await ctx.params;
  const teacherId = Number(id);
  if (!Number.isInteger(teacherId)) return Response.json({ error: "Invalid ID." }, { status: 400 });

  const [teacher] = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
  if (!teacher) return Response.json({ error: "Teacher not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const subjectIds: number[] = Array.isArray(body.subjectIds)
    ? body.subjectIds.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n))
    : [];
  const classIds: number[] = Array.isArray(body.classIds)
    ? body.classIds.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n))
    : [];

  try {
    await db.transaction(async (tx) => {
      // ----- Subjects -----
      // Release subjects that were mine but are no longer selected
      const mySubjects = await tx.select({ id: subjects.id }).from(subjects).where(eq(subjects.teacherId, teacherId));
      for (const s of mySubjects) {
        if (!subjectIds.includes(s.id)) {
          await tx.update(subjects).set({ teacherId: null }).where(eq(subjects.id, s.id));
        }
      }
      // Assign the selected subjects to this teacher (takes over unassigned or previously-other subjects)
      for (const sid of subjectIds) {
        await tx.update(subjects).set({ teacherId }).where(eq(subjects.id, sid));
      }

      // ----- Classes: replace the full set -----
      await tx.delete(teacherClasses).where(eq(teacherClasses.teacherId, teacherId));
      if (classIds.length > 0) {
        await tx.insert(teacherClasses).values(classIds.map((classId) => ({ teacherId, classId })));
      }
    });

    return Response.json({ ok: true, subjectIds, classIds });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown database error";
    return Response.json(
      { error: `Failed to save assignments. This usually means the database schema is out of date — ask the developer to run "npx drizzle-kit push". (${message})` },
      { status: 500 },
    );
  }
}
