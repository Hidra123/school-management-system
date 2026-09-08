import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classes, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Read-only daily attendance summary across one class OR all classes —
 * used by the Admin/Academic Master "Attendance Tracking Centre".
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "attendance.trackall");
  if (err) return err;

  try {
    const url = new URL(req.url);
    const classIdRaw = url.searchParams.get("classId");
    const date = url.searchParams.get("date");
    if (!date) return Response.json({ error: "date is required." }, { status: 400 });

    const wantsAll = !classIdRaw || classIdRaw === "all";
    const classId = wantsAll ? null : Number(classIdRaw);
    if (!wantsAll && !Number.isFinite(classId)) {
      return Response.json({ error: "Invalid classId." }, { status: 400 });
    }

    const studentRows = await db
      .select({
        id: students.id,
        name: students.name,
        gender: students.gender,
        classId: students.classId,
        className: classes.name,
      })
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(wantsAll ? undefined : eq(students.classId, classId as number))
      .orderBy(asc(students.name));

    const studentIds = studentRows.map((s) => s.id);

    const attRows =
      studentIds.length === 0
        ? []
        : await db
            .select({ studentId: attendance.studentId, session: attendance.session, status: attendance.status })
            .from(attendance)
            .where(and(eq(attendance.date, date), inArray(attendance.studentId, studentIds)));

    const byStudent = new Map<number, { morning: string | null; afternoon: string | null }>();
    for (const r of attRows) {
      const cell = byStudent.get(r.studentId) ?? { morning: null, afternoon: null };
      cell[r.session] = r.status;
      byStudent.set(r.studentId, cell);
    }

    let present = 0;
    let absent = 0;
    let late = 0;
    const rows = studentRows.map((s) => {
      const cell = byStudent.get(s.id) ?? { morning: null, afternoon: null };
      if (cell.morning === "present") present++;
      else if (cell.morning === "absent") absent++;
      else if (cell.morning === "late") late++;
      return {
        id: s.id,
        name: s.name,
        gender: s.gender,
        className: s.className,
        morning: cell.morning,
        afternoon: cell.afternoon,
      };
    });

    const registered = studentRows.length;
    const rate = registered > 0 ? Math.round((present / registered) * 100) : 0;

    return Response.json({ date, registered, present, absent, late, rate, students: rows });
  } catch (e) {
    return dbErrorResponse(e, "load the daily attendance summary");
  }
}
