import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { classes, subjects, teacherClasses, teachers, timetableEntries } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requireAnyPermission, requirePermission } from "@/lib/auth";
import { classAllowed, getAssignedSubjectIds, getTeacherByUserId, getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

async function joinedRows(where?: ReturnType<typeof and> | undefined) {
  const q = db
    .select({
      id: timetableEntries.id,
      classId: timetableEntries.classId,
      className: classes.name,
      section: classes.section,
      dayOfWeek: timetableEntries.dayOfWeek,
      period: timetableEntries.period,
      subjectId: timetableEntries.subjectId,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      teacherId: timetableEntries.teacherId,
      teacherName: teachers.name,
    })
    .from(timetableEntries)
    .innerJoin(classes, eq(timetableEntries.classId, classes.id))
    .innerJoin(subjects, eq(timetableEntries.subjectId, subjects.id))
    .leftJoin(teachers, eq(timetableEntries.teacherId, teachers.id))
    .orderBy(asc(classes.name), asc(timetableEntries.dayOfWeek), asc(timetableEntries.period));
  if (where) return q.where(where);
  return q;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requireAnyPermission(user, ["timetable.view", "timetable.manage"]);
  if (err) return err;

  try {
    const mode = new URL(req.url).searchParams.get("mode") ?? "class";

    // ---------- GENERAL: the whole school (Academic Master / admin) ----------
    if (mode === "general") {
      const mErr = requirePermission(user, "timetable.manage");
      if (mErr) return mErr;
      return Response.json(await joinedRows());
    }

    // ---------- MY: the logged-in teacher's own schedule ----------
    if (mode === "my") {
      const teacher = await getTeacherByUserId(user!.id);
      if (!teacher) return Response.json([]);
      const mySubjects = await getAssignedSubjectIds(teacher.id);
      const where =
        mySubjects.length > 0
          ? and(eq(timetableEntries.teacherId, teacher.id))
          : and(eq(timetableEntries.teacherId, teacher.id));
      // Entries are always stamped with the subject's teacher at save time, so
      // teacherId alone is the reliable key; subject ownership is a safety net.
      const rows = await joinedRows(where);
      return Response.json(rows);
    }

    // ---------- CLASS: one class grid (scoped for normal teachers) ----------
    const classIdRaw = new URL(req.url).searchParams.get("classId");
    const classId = classIdRaw && Number.isFinite(Number(classIdRaw)) ? Number(classIdRaw) : null;
    if (classId === null) {
      return Response.json({ error: "classId is required." }, { status: 400 });
    }
    const scope = await getTeacherScope(user);
    if (!classAllowed(scope, classId)) {
      return Response.json({ error: "You are not assigned to this class." }, { status: 403 });
    }
    return Response.json(await joinedRows(and(eq(timetableEntries.classId, classId))));
  } catch (e) {
    return dbErrorResponse(e, "load the timetable");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "timetable.manage");
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  try {
    const classId = Number(body.classId);
    const dayOfWeek = Number(body.dayOfWeek);
    const period = Number(body.period);
    const subjectId = Number(body.subjectId);
    if (!Number.isInteger(classId) || !Number.isInteger(dayOfWeek) || !Number.isInteger(period) || !Number.isInteger(subjectId)) {
      return Response.json({ error: "Class, day, period and subject are required." }, { status: 400 });
    }
    if (dayOfWeek < 1 || dayOfWeek > 5 || period < 1 || period > 9) {
      return Response.json({ error: "Day must be 1-5 and period must be 1-9." }, { status: 400 });
    }

    const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    if (!subject) return Response.json({ error: "Subject not found." }, { status: 404 });
    const teacherId = subject.teacherId ?? null;

    // A teacher can never be in two classes at the same day+period.
    if (teacherId !== null) {
      const [conflict] = await db
        .select({ id: timetableEntries.id, className: classes.name })
        .from(timetableEntries)
        .innerJoin(classes, eq(timetableEntries.classId, classes.id))
        .where(
          and(
            eq(timetableEntries.dayOfWeek, dayOfWeek),
            eq(timetableEntries.period, period),
            eq(timetableEntries.teacherId, teacherId),
            ne(timetableEntries.classId, classId),
          ),
        )
        .limit(1);
      if (conflict) {
        const [t] = await db.select({ name: teachers.name }).from(teachers).where(eq(teachers.id, teacherId)).limit(1);
        return Response.json(
          { error: `Conflict: ${t?.name ?? "This teacher"} already teaches ${conflict.className} at this time (day ${dayOfWeek}, period ${period}).` },
          { status: 409 },
        );
      }
    }

    const values = {
      classId,
      dayOfWeek,
      period,
      subjectId,
      teacherId,
      academicYear: typeof body.academicYear === "string" ? body.academicYear.trim() : "",
    };
    await db
      .insert(timetableEntries)
      .values(values)
      .onConflictDoUpdate({
        target: [timetableEntries.classId, timetableEntries.dayOfWeek, timetableEntries.period],
        set: { subjectId, teacherId, academicYear: values.academicYear },
      });
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return dbErrorResponse(e, "save the timetable entry");
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "timetable.manage");
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  try {
    // Clear one cell…
    const id = Number(body.id);
    if (Number.isInteger(id)) {
      await db.delete(timetableEntries).where(eq(timetableEntries.id, id));
      return Response.json({ ok: true });
    }
    const classId = Number(body.classId);
    if (Number.isInteger(classId) && body.clearClass === true) {
      // …or wipe the whole class grid, or…
      await db.delete(timetableEntries).where(eq(timetableEntries.classId, classId));
      return Response.json({ ok: true });
    }
    const dayOfWeek = Number(body.dayOfWeek);
    const period = Number(body.period);
    if (Number.isInteger(classId) && Number.isInteger(dayOfWeek) && Number.isInteger(period)) {
      await db.delete(timetableEntries).where(
        and(eq(timetableEntries.classId, classId), eq(timetableEntries.dayOfWeek, dayOfWeek), eq(timetableEntries.period, period)),
      );
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Provide an entry id, a class+day+period, or classId with clearClass=true." }, { status: 400 });
  } catch (e) {
    return dbErrorResponse(e, "delete the timetable entry");
  }
}
