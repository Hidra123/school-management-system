import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, teacherSubjectClasses, timetableSlots } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, hasPermission, requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const isManager =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "timetable.manage");

  if (!isManager) {
    return Response.json(
      { error: "Only Academic Master or Admin can update timetable slots." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid data." }, { status: 400 });

  const dayOfWeek = Number(body.dayOfWeek);
  const period = Number(body.period);
  const classId = Number(body.classId);
  const academicYear =
    typeof body.academicYear === "string" && body.academicYear.trim()
      ? body.academicYear.trim()
      : "2026";

  if (
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 1 ||
    dayOfWeek > 5 ||
    !Number.isInteger(period) ||
    period < 1 ||
    period > 9 ||
    !Number.isInteger(classId)
  ) {
    return Response.json(
      { error: "dayOfWeek (1-5), period (1-9) and classId are required." },
      { status: 400 },
    );
  }

  const subjectId =
    body.subjectId !== undefined && body.subjectId !== null && body.subjectId !== ""
      ? Number(body.subjectId)
      : null;
  const teacherId =
    body.teacherId !== undefined && body.teacherId !== null && body.teacherId !== ""
      ? Number(body.teacherId)
      : null;
  const customLabel =
    typeof body.customLabel === "string" ? body.customLabel.trim() : null;
  const room = typeof body.room === "string" ? body.room.trim() : null;

  // When the client did not pick a teacher but did pick a subject, resolve
  // the teacher from the subject×class assignment matrix (two teachers may
  // share one subject across different classes); legacy single-owner is the
  // fallback.
  let resolvedTeacherId = teacherId;
  if (resolvedTeacherId === null && subjectId !== null) {
    const [matrixOwner] = await db
      .select({ teacherId: teacherSubjectClasses.teacherId })
      .from(teacherSubjectClasses)
      .where(and(eq(teacherSubjectClasses.subjectId, subjectId), eq(teacherSubjectClasses.classId, classId)))
      .limit(1);
    if (matrixOwner?.teacherId != null) {
      resolvedTeacherId = matrixOwner.teacherId;
    } else {
      const [subj] = await db.select({ teacherId: subjects.teacherId }).from(subjects).where(eq(subjects.id, subjectId)).limit(1);
      resolvedTeacherId = subj?.teacherId ?? null;
    }
  }

  try {
    const [row] = await db
      .insert(timetableSlots)
      .values({
        dayOfWeek,
        period,
        classId,
        subjectId,
        teacherId: resolvedTeacherId,
        customLabel: customLabel || null,
        room: room || null,
        academicYear,
      })
      .onConflictDoUpdate({
        target: [
          timetableSlots.dayOfWeek,
          timetableSlots.period,
          timetableSlots.classId,
          timetableSlots.academicYear,
        ],
        set: {
          subjectId,
          teacherId: resolvedTeacherId,
          customLabel: customLabel || null,
          room: room || null,
        },
      })
      .returning();

    return Response.json(row);
  } catch (e) {
    return dbErrorResponse(e, "update timetable slot");
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const isManager =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "timetable.manage");

  if (!isManager) {
    return Response.json(
      { error: "Only Academic Master or Admin can clear timetable slots." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const slotIdRaw = url.searchParams.get("id");
  const dayOfWeek = Number(url.searchParams.get("dayOfWeek"));
  const period = Number(url.searchParams.get("period"));
  const classId = Number(url.searchParams.get("classId"));
  const academicYear = url.searchParams.get("academicYear")?.trim() || "2026";

  try {
    if (slotIdRaw && Number.isInteger(Number(slotIdRaw))) {
      await db.delete(timetableSlots).where(eq(timetableSlots.id, Number(slotIdRaw)));
      return Response.json({ ok: true });
    }

    if (dayOfWeek && period && classId) {
      await db
        .delete(timetableSlots)
        .where(
          and(
            eq(timetableSlots.dayOfWeek, dayOfWeek),
            eq(timetableSlots.period, period),
            eq(timetableSlots.classId, classId),
            eq(timetableSlots.academicYear, academicYear),
          ),
        );
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Slot identifier required." }, { status: 400 });
  } catch (e) {
    return dbErrorResponse(e, "clear timetable slot");
  }
}
