import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, timetableSlots } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, hasPermission, requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/timetable/class
 * Adds a new class or stream row (e.g. "Form 4" section "B", or "Form 1" section "B")
 * and initializes its empty timetable slots (5 days × 9 periods = 45 slots)
 * so it is ready for the Academic Master to populate.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const isManager =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "timetable.manage") ||
    hasPermission(user, "classes.manage");

  if (!isManager) {
    return Response.json(
      { error: "Only Academic Master or Admin can add class rows to timetable." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Class name is required (e.g. Form 1, Form 4)." }, { status: 400 });
  }

  const name = body.name.trim();
  const section = typeof body.section === "string" ? body.section.trim() : "";
  const capacity = Math.max(1, Number(body.capacity) || 40);
  const academicYear =
    typeof body.academicYear === "string" && body.academicYear.trim()
      ? body.academicYear.trim()
      : "2026";

  try {
    // Check if class with same name and section already exists
    const existing = await db
      .select()
      .from(classes)
      .where(and(eq(classes.name, name), eq(classes.section, section)))
      .limit(1);

    let classRow = existing[0];
    if (!classRow) {
      const [inserted] = await db
        .insert(classes)
        .values({
          name,
          section,
          capacity,
        })
        .returning();
      classRow = inserted;
    }

    // Pre-create 45 slots (5 days × 9 periods) if they don't exist yet
    const slotsToInsert = [];
    for (let day = 1; day <= 5; day++) {
      for (let period = 1; period <= 9; period++) {
        slotsToInsert.push({
          dayOfWeek: day,
          period,
          classId: classRow.id,
          academicYear,
        });
      }
    }

    // Insert on conflict do nothing
    for (const slot of slotsToInsert) {
      await db
        .insert(timetableSlots)
        .values(slot)
        .onConflictDoNothing({
          target: [
            timetableSlots.dayOfWeek,
            timetableSlots.period,
            timetableSlots.classId,
            timetableSlots.academicYear,
          ],
        });
    }

    return Response.json(classRow, { status: 201 });
  } catch (e) {
    return dbErrorResponse(e, "add class row to timetable");
  }
}

/**
 * PUT /api/timetable/class
 * Updates a class row's name or section (e.g. updating section to "A" or "B")
 */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const isManager =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "timetable.manage") ||
    hasPermission(user, "classes.manage");

  if (!isManager) {
    return Response.json({ error: "Permission denied." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!body || !Number.isInteger(id)) {
    return Response.json({ error: "Valid Class ID required." }, { status: 400 });
  }

  try {
    const patch: Partial<typeof classes.$inferInsert> = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (body.section !== undefined) patch.section = typeof body.section === "string" ? body.section.trim() : "";
    if (body.capacity !== undefined) patch.capacity = Math.max(1, Number(body.capacity) || 40);

    const [updated] = await db.update(classes).set(patch).where(eq(classes.id, id)).returning();
    if (!updated) return Response.json({ error: "Class not found." }, { status: 404 });

    return Response.json(updated);
  } catch (e) {
    return dbErrorResponse(e, "update class");
  }
}

/**
 * DELETE /api/timetable/class?id=...
 * Clears timetable slots for this class. If the class has zero enrolled students,
 * optionally deletes the class record entirely.
 */
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const isManager =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "timetable.manage") ||
    hasPermission(user, "classes.manage");

  if (!isManager) {
    return Response.json({ error: "Permission denied." }, { status: 403 });
  }

  const url = new URL(req.url);
  const classId = Number(url.searchParams.get("id"));
  if (!Number.isInteger(classId)) {
    return Response.json({ error: "Valid Class ID required." }, { status: 400 });
  }

  try {
    // Delete all timetable slots for this class
    await db.delete(timetableSlots).where(eq(timetableSlots.classId, classId));

    // Check if there are enrolled students
    const studentCount = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.classId, classId))
      .limit(1);

    if (studentCount.length === 0) {
      await db.delete(classes).where(eq(classes.id, classId));
    }

    return Response.json({ ok: true, deletedClassRecord: studentCount.length === 0 });
  } catch (e) {
    return dbErrorResponse(e, "delete timetable class row");
  }
}
