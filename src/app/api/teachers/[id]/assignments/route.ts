import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { classes, subjects, teacherClasses, teacherSubjectClasses, teachers, timetableSlots } from "@/db/schema";
import { getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET: Full assignment picture for a teacher:
 * 1. Classes list + assignedToMe
 * 2. Subjects list + assignedToMe
 * 3. Specific matrix assignments: (subjectId, classId) pairings assigned to this teacher
 *    and which other teachers teach which subject in which class.
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

    // Classes assigned to me (from teacher_classes and teacher_subject_classes)
    const [assignedClassRows, myTscRows] = await Promise.all([
      db
        .select({ classId: teacherClasses.classId })
        .from(teacherClasses)
        .where(eq(teacherClasses.teacherId, teacherId)),
      db
        .select({ classId: teacherSubjectClasses.classId, subjectId: teacherSubjectClasses.subjectId })
        .from(teacherSubjectClasses)
        .where(eq(teacherSubjectClasses.teacherId, teacherId)),
    ]);

    const myClassIds = Array.from(
      new Set([...assignedClassRows.map((r) => r.classId), ...myTscRows.map((r) => r.classId)]),
    );

    const mySubjectIds = Array.from(
      new Set([
        ...allSubjects.filter((s) => s.teacherId === teacherId).map((s) => s.id),
        ...myTscRows.map((r) => r.subjectId),
      ]),
    );

    // All assignments across the whole school: (subjectId, classId) -> teacherName
    const allAssignments = await db
      .select({
        teacherId: teacherSubjectClasses.teacherId,
        subjectId: teacherSubjectClasses.subjectId,
        classId: teacherSubjectClasses.classId,
        teacherName: teachers.name,
      })
      .from(teacherSubjectClasses)
      .innerJoin(teachers, eq(teacherSubjectClasses.teacherId, teachers.id));

    // Form pairings list for me: [`${subjectId}-${classId}`]
    const myPairings = myTscRows.map((r) => `${r.subjectId}-${r.classId}`);

    // Map other teachers assignments by "subjectId-classId"
    const pairingOwners: Record<string, string> = {};
    for (const a of allAssignments) {
      if (a.teacherId !== teacherId) {
        pairingOwners[`${a.subjectId}-${a.classId}`] = a.teacherName;
      }
    }

    return Response.json({
      teacherId,
      teacherName: teacher.name,
      subjects: allSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        assignedToMe: mySubjectIds.includes(s.id),
      })),
      classes: allClasses.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        assignedToMe: myClassIds.includes(c.id),
      })),
      subjectIds: mySubjectIds,
      classIds: myClassIds,
      myPairings,
      pairingOwners,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown database error";
    return Response.json(
      { error: `Failed to load assignment data (${message})` },
      { status: 500 },
    );
  }
}

/**
 * PUT: update assignments for a teacher.
 * body accepts either:
 *   1) { pairings: string[], classIds?: number[], subjectIds?: number[] }
 *      where pairings are "subjectId-classId" (modern fine-grained matrix!)
 *   2) { subjectIds: number[], classIds: number[] } (backward-compatible)
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

  try {
    await db.transaction(async (tx) => {
      // Handle fine-grained pairings mode
      if (Array.isArray(body.pairings)) {
        const parsedPairs: { subjectId: number; classId: number }[] = [];
        for (const str of body.pairings) {
          if (typeof str === "string" && str.includes("-")) {
            const [sStr, cStr] = str.split("-");
            const sNum = Number(sStr);
            const cNum = Number(cStr);
            if (Number.isInteger(sNum) && Number.isInteger(cNum)) {
              parsedPairs.push({ subjectId: sNum, classId: cNum });
            }
          }
        }

        // 1. Delete all pairings currently belonging to this teacher
        await tx.delete(teacherSubjectClasses).where(eq(teacherSubjectClasses.teacherId, teacherId));

        // 2. For each pairing selected, insert or update owner to this teacher
        for (const pair of parsedPairs) {
          await tx
            .insert(teacherSubjectClasses)
            .values({
              teacherId,
              subjectId: pair.subjectId,
              classId: pair.classId,
            })
            .onConflictDoUpdate({
              target: [teacherSubjectClasses.subjectId, teacherSubjectClasses.classId],
              set: { teacherId },
            });

          // Automatically sync timetable slots so the timetable reflects the new teacher immediately
          await tx
            .update(timetableSlots)
            .set({ teacherId })
            .where(
              and(
                eq(timetableSlots.subjectId, pair.subjectId),
                eq(timetableSlots.classId, pair.classId),
              ),
            );
        }

        // 3. Keep teacherClasses table in sync with all classes this teacher has in teacher_subject_classes
        //    plus any explicit classIds passed.
        const combinedClassIds = Array.from(
          new Set([
            ...parsedPairs.map((p) => p.classId),
            ...(Array.isArray(body.classIds) ? body.classIds.map(Number).filter(Number.isInteger) : []),
          ]),
        );

        await tx.delete(teacherClasses).where(eq(teacherClasses.teacherId, teacherId));
        if (combinedClassIds.length > 0) {
          await tx.insert(teacherClasses).values(
            combinedClassIds.map((classId) => ({ teacherId, classId })),
          );
        }

        // 4. Do NOT wipe subjects.teacherId for other teachers!
        // Only set subjects.teacherId if the subject currently has none.
        const distinctSubjectIds = Array.from(new Set(parsedPairs.map((p) => p.subjectId)));
        for (const sid of distinctSubjectIds) {
          const [curr] = await tx.select({ teacherId: subjects.teacherId }).from(subjects).where(eq(subjects.id, sid)).limit(1);
          if (curr && curr.teacherId === null) {
            await tx.update(subjects).set({ teacherId }).where(eq(subjects.id, sid));
          }
        }

        return;
      }

      // Legacy fallback mode: { subjectIds, classIds }
      const subjectIds: number[] = Array.isArray(body.subjectIds)
        ? body.subjectIds.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n))
        : [];
      const classIds: number[] = Array.isArray(body.classIds)
        ? body.classIds.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n))
        : [];

      // Update teacherClasses
      await tx.delete(teacherClasses).where(eq(teacherClasses.teacherId, teacherId));
      if (classIds.length > 0) {
        await tx.insert(teacherClasses).values(classIds.map((classId) => ({ teacherId, classId })));
      }

      // Populate teacherSubjectClasses across the cross-product
      await tx.delete(teacherSubjectClasses).where(eq(teacherSubjectClasses.teacherId, teacherId));
      for (const sid of subjectIds) {
        for (const cid of classIds) {
          await tx
            .insert(teacherSubjectClasses)
            .values({ teacherId, subjectId: sid, classId: cid })
            .onConflictDoUpdate({
              target: [teacherSubjectClasses.subjectId, teacherSubjectClasses.classId],
              set: { teacherId },
            });
        }
      }
    });

    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown database error";
    return Response.json(
      { error: `Failed to save assignments (${message})` },
      { status: 500 },
    );
  }
}
