import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classes, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { daysInMonth, ymd } from "@/lib/attendanceHelpers";
import { classAllowed, getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "attendance.view");
  if (err) return err;

  try {
    const scope = await getTeacherScope(user);

    const url = new URL(req.url);
    const classId = Number(url.searchParams.get("classId"));
    const month = Number(url.searchParams.get("month"));
    const year = Number(url.searchParams.get("year"));

    if (!Number.isFinite(classId) || !Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
      return Response.json({ error: "classId, month and year are required." }, { status: 400 });
    }
    if (!classAllowed(scope, classId)) {
      return Response.json({ error: "You are not assigned to this class." }, { status: 403 });
    }

    const [cls] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
    if (!cls) return Response.json({ error: "Class not found." }, { status: 404 });

    const numDays = daysInMonth(year, month);
    const startDate = ymd(year, month, 1);
    const endDate = ymd(year, month, numDays);

    const classStudents = await db
      .select({ id: students.id, name: students.name, gender: students.gender, admissionNo: students.admissionNo })
      .from(students)
      .where(eq(students.classId, classId))
      .orderBy(asc(students.name));

    const attRows = await db
      .select({
        studentId: attendance.studentId,
        date: attendance.date,
        session: attendance.session,
        status: attendance.status,
      })
      .from(attendance)
      .where(and(eq(attendance.classId, classId), gte(attendance.date, startDate), lte(attendance.date, endDate)));

    type DayCell = { morning: string | null; afternoon: string | null };
    const byStudent = new Map<number, Map<number, DayCell>>();
    for (const s of classStudents) byStudent.set(s.id, new Map());

    for (const r of attRows) {
      const dayNum = Number(r.date.slice(8, 10));
      const map = byStudent.get(r.studentId);
      if (!map) continue;
      const cell = map.get(dayNum) ?? { morning: null, afternoon: null };
      cell[r.session] = r.status;
      map.set(dayNum, cell);
    }

    const rows = classStudents.map((s) => {
      const dayMap = byStudent.get(s.id) ?? new Map<number, DayCell>();
      const days: Record<number, DayCell> = {};
      let present = 0;
      let absent = 0;
      let late = 0;
      for (let d = 1; d <= numDays; d++) {
        const cell = dayMap.get(d) ?? { morning: null, afternoon: null };
        days[d] = cell;
        for (const status of [cell.morning, cell.afternoon]) {
          if (status === "present") present++;
          else if (status === "absent") absent++;
          else if (status === "late") late++;
        }
      }
      return {
        id: s.id,
        name: s.name,
        gender: s.gender,
        admissionNo: s.admissionNo,
        days,
        totals: { present, absent, late },
      };
    });

    return Response.json({
      className: cls.name,
      section: cls.section,
      month,
      year,
      daysInMonth: numDays,
      students: rows,
    });
  } catch (e) {
    return dbErrorResponse(e, "load the monthly register");
  }
}
