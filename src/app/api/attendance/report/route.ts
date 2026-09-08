import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classes, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { daysInMonth, rateStatus, ymd } from "@/lib/attendanceHelpers";
import { classAllowed, getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "attendance.view");
  if (err) return err;

  try {
    const scope = await getTeacherScope(user);

    const url = new URL(req.url);
    const classIdRaw = url.searchParams.get("classId");
    const month = Number(url.searchParams.get("month"));
    const year = Number(url.searchParams.get("year"));

    if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
      return Response.json({ error: "month and year are required." }, { status: 400 });
    }

    // classId omitted (or "all") → aggregate across every class the caller can see
    // (all classes for admin/unscoped staff, or just the teacher's assigned classes).
    const wantsAll = !classIdRaw || classIdRaw === "all";
    let classIds: number[];
    let className: string;

    if (wantsAll) {
      if (scope.scoped) {
        if (scope.classIds.length === 0) {
          return Response.json({
            className: "All Classes", month, year, avgAttendance: 0, daysRecorded: 0,
            atRiskCount: 0, totalStudents: 0, dailyOverview: [], perStudent: [],
          });
        }
        classIds = scope.classIds;
      } else {
        const all = await db.select({ id: classes.id }).from(classes);
        classIds = all.map((c) => c.id);
      }
      className = "All Classes";
    } else {
      const classId = Number(classIdRaw);
      if (!Number.isFinite(classId)) return Response.json({ error: "Invalid classId." }, { status: 400 });
      if (!classAllowed(scope, classId)) {
        return Response.json({ error: "You are not assigned to this class." }, { status: 403 });
      }
      const [cls] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
      if (!cls) return Response.json({ error: "Class not found." }, { status: 404 });
      classIds = [classId];
      className = cls.name;
    }

    const numDays = daysInMonth(year, month);
    const startDate = ymd(year, month, 1);
    const endDate = ymd(year, month, numDays);

    const classStudents = await db
      .select({ id: students.id, name: students.name, gender: students.gender, classId: students.classId })
      .from(students)
      .where(inArray(students.classId, classIds))
      .orderBy(asc(students.name));

    const attRows =
      classStudents.length === 0
        ? []
        : await db
            .select({
              studentId: attendance.studentId,
              date: attendance.date,
              session: attendance.session,
              status: attendance.status,
            })
            .from(attendance)
            .where(and(inArray(attendance.classId, classIds), gte(attendance.date, startDate), lte(attendance.date, endDate)));

    const distinctDates = new Set(attRows.map((r) => r.date));
    const daysRecorded = distinctDates.size;

    // Per-day (morning-session) overview for the bar chart.
    const dailyMap = new Map<number, { present: number; absent: number; late: number }>();
    for (let d = 1; d <= numDays; d++) dailyMap.set(d, { present: 0, absent: 0, late: 0 });
    for (const r of attRows) {
      if (r.session !== "morning") continue;
      const dayNum = Number(r.date.slice(8, 10));
      const bucket = dailyMap.get(dayNum);
      if (!bucket) continue;
      if (r.status === "present") bucket.present++;
      else if (r.status === "absent") bucket.absent++;
      else if (r.status === "late") bucket.late++;
    }
    const dailyOverview = Array.from(dailyMap.entries())
      .map(([day, v]) => ({ day, ...v }))
      .filter((d) => d.present + d.absent + d.late > 0);

    // Per-student summary across both sessions.
    const byStudent = new Map<number, { present: number; absent: number; late: number; sessions: number }>();
    for (const s of classStudents) byStudent.set(s.id, { present: 0, absent: 0, late: 0, sessions: 0 });
    for (const r of attRows) {
      const bucket = byStudent.get(r.studentId);
      if (!bucket) continue;
      bucket.sessions++;
      if (r.status === "present") bucket.present++;
      else if (r.status === "absent") bucket.absent++;
      else if (r.status === "late") bucket.late++;
    }

    let totalRate = 0;
    let atRiskCount = 0;
    const perStudent = classStudents.map((s) => {
      const b = byStudent.get(s.id)!;
      const effectiveDays = Math.ceil(b.sessions / 2);
      const rate = b.sessions > 0 ? Math.round(((b.present + b.late) / b.sessions) * 100) : 0;
      totalRate += rate;
      if (rate < 75 && b.sessions > 0) atRiskCount++;
      const { label } = rateStatus(rate);
      return {
        id: s.id,
        name: s.name,
        gender: s.gender,
        present: b.present,
        absent: b.absent,
        late: b.late,
        days: effectiveDays,
        rate,
        status: label,
      };
    });

    const avgAttendance = classStudents.length > 0 ? Math.round(totalRate / classStudents.length) : 0;

    return Response.json({
      className,
      month,
      year,
      avgAttendance,
      daysRecorded,
      atRiskCount,
      totalStudents: classStudents.length,
      dailyOverview,
      perStudent,
    });
  } catch (e) {
    return dbErrorResponse(e, "generate the attendance report");
  }
}
