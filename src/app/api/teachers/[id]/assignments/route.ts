import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, subjects, teacherClasses, teacherSubjectClasses, teachers } from "@/db/schema";
import { getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type CellOwner = { subjectId: number; classId: number; teacherId: number; teacherName: string };

/**
 * GET: the full subject×class matrix used to render the assignment modal —
 * every subject and class, every (subject,class) cell this teacher teaches,
 * plus who owns every other cell (so the UI can show warnings instead of
 * silently overwriting another teacher the way the old single-owner model did).
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

    const [allSubjects, allClasses, ownersRows, myCells, myLegacySubjects, myClasses] = await Promise.all([
      db.select({ id: subjects.id, name: subjects.name, code: subjects.code, teacherId: subjects.teacherId }).from(subjects).orderBy(asc(subjects.name)),
      db.select().from(classes).orderBy(asc(classes.name)),
      db
        .select({
          subjectId: teacherSubjectClasses.subjectId,
          classId: teacherSubjectClasses.classId,
          teacherId: teacherSubjectClasses.teacherId,
          teacherName: teachers.name,
        })
        .from(teacherSubjectClasses)
        .innerJoin(teachers, eq(teacherSubjectClasses.teacherId, teachers.id)),
      db
        .select({ subjectId: teacherSubjectClasses.subjectId, classId: teacherSubjectClasses.classId })
        .from(teacherSubjectClasses)
        .where(eq(teacherSubjectClasses.teacherId, teacherId)),
      db.select({ id: subjects.id }).from(subjects).where(eq(subjects.teacherId, teacherId)),
      db.select({ classId: teacherClasses.classId }).from(teacherClasses).where(eq(teacherClasses.teacherId, teacherId)),
    ]);

    const legacyNameByTeacher = new Map<number, string>();
    for (const o of ownersRows as CellOwner[]) legacyNameByTeacher.set(o.teacherId, o.teacherName);
    // Legacy single-owner fallback: a subject with subjects.teacherId set and
    // no matrix rows at all still "belongs" to that teacher for display.
    const teacherNames = new Map<number, string>();
    for (const o of ownersRows as CellOwner[]) teacherNames.set(o.teacherId, o.teacherName);
    const legacyOwners = await db
      .select({ id: subjects.id, teacherId: subjects.teacherId, teacherName: teachers.name })
      .from(subjects)
      .leftJoin(teachers, eq(subjects.teacherId, teachers.id));
    const legacyTeacherBySubject = new Map<number, { teacherId: number; name: string }>();
    for (const l of legacyOwners) {
      if (l.teacherId !== null) legacyTeacherBySubject.set(l.id, { teacherId: l.teacherId, name: l.teacherName ?? "?" });
    }

    const owners: Record<string, { teacherName: string; legacy: boolean }> = {};
    const covered = new Set<string>();
    for (const o of ownersRows as CellOwner[]) {
      if (o.teacherId === teacherId) continue;
      owners[`${o.subjectId}|${o.classId}`] = { teacherName: o.teacherName, legacy: false };
      covered.add(`${o.subjectId}|${o.classId}`);
    }
    // Legacy fallback owners (only when the whole subject has no matrix rows).
    const matrixSubjectIds = new Set((ownersRows as CellOwner[]).map((o) => o.subjectId));
    for (const l of legacyTeacherBySubject.entries()) {
      const [subjectId, owner] = l;
      if (matrixSubjectIds.has(subjectId) || owner.teacherId === teacherId) continue;
      for (const c of allClasses) {
        const key = `${subjectId}|${c.id}`;
        if (!covered.has(key)) owners[key] = { teacherName: owner.name, legacy: true };
      }
    }

    // This teacher's cells: real matrix rows; plus a legacy-derived starting
    // point (their legacy subjects × their legacy classes) so the matrix shows
    // their current assignments on first open before any save.
    const cellSet = new Set(myCells.map((c) => `${c.subjectId}|${c.classId}`));
    if (myCells.length === 0) {
      for (const s of myLegacySubjects) {
        for (const cl of myClasses) cellSet.add(`${s.id}|${cl.classId}`);
      }
    }

    return Response.json({
      teacherId,
      subjects: allSubjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
      classes: allClasses.map((c) => ({ id: c.id, name: c.name, section: c.section })),
      cells: Array.from(cellSet).map((k) => {
        const [subjectId, classId] = k.split("|").map(Number);
        return { subjectId, classId };
      }),
      owners,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown database error";
    return Response.json({ error: `Failed to load assignment data. (${message})` }, { status: 500 });
  }
}

/**
 * PUT: replace this teacher's subject×class cells.
 * body: { cells: [{ subjectId, classId }] }
 * Any selected cell owned by ANOTHER teacher is rejected with 409 (naming the
 * owner) instead of silently stealing it — fix for "assigning Y to Kiswahili
 * Form 1/2 kicked X off Form 3/4".
 * teacher_classes is rebuilt automatically from the distinct classes in cells.
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

  const rawCells = Array.isArray(body.cells) ? (body.cells as Array<{ subjectId?: unknown; classId?: unknown }>) : [];
  const seen = new Set<string>();
  const cells: Array<{ subjectId: number; classId: number }> = [];
  for (const c of rawCells) {
    const subjectId = Number(c?.subjectId);
    const classId = Number(c?.classId);
    if (!Number.isInteger(subjectId) || !Number.isInteger(classId)) continue;
    const key = `${subjectId}|${classId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cells.push({ subjectId, classId });
  }

  try {
    // Refuse to silently overwrite cells owned by OTHER teachers.
    const allOwners = await db
      .select({
        subjectId: teacherSubjectClasses.subjectId,
        classId: teacherSubjectClasses.classId,
        teacherId: teacherSubjectClasses.teacherId,
        teacherName: teachers.name,
        subjectName: subjects.name,
        className: classes.name,
      })
      .from(teacherSubjectClasses)
      .innerJoin(teachers, eq(teacherSubjectClasses.teacherId, teachers.id))
      .innerJoin(subjects, eq(teacherSubjectClasses.subjectId, subjects.id))
      .innerJoin(classes, eq(teacherSubjectClasses.classId, classes.id));

    const foreignConflicts = allOwners.filter(
      (o) => o.teacherId !== teacherId && cells.some((c) => c.subjectId === o.subjectId && c.classId === o.classId),
    );
    if (foreignConflicts.length > 0) {
      const list = foreignConflicts.slice(0, 4).map((o) => `${o.subjectName} (${o.className}) → ${o.teacherName}`).join("; ");
      return Response.json(
        { error: `These cells already belong to other teachers — unassign them there first: ${list}${foreignConflicts.length > 4 ? "…" : ""}` },
        { status: 409 },
      );
    }

    const distinctClasses = Array.from(new Set(cells.map((c) => c.classId)));

    await db.transaction(async (tx) => {
      await tx.delete(teacherSubjectClasses).where(eq(teacherSubjectClasses.teacherId, teacherId));
      if (cells.length > 0) {
        await tx.insert(teacherSubjectClasses).values(cells.map((c) => ({ teacherId, ...c })));
      }
      // Classes are derived from the matrix so scoping (students, attendance,
      // submit scores) always matches what the teacher actually teaches.
      await tx.delete(teacherClasses).where(eq(teacherClasses.teacherId, teacherId));
      if (distinctClasses.length > 0) {
        await tx.insert(teacherClasses).values(distinctClasses.map((classId) => ({ teacherId, classId })));
      }
    });

    return Response.json({ ok: true, cells: cells.length, classes: distinctClasses });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown database error";
    return Response.json({ error: `Failed to save assignments. (${message})` }, { status: 500 });
  }
}
