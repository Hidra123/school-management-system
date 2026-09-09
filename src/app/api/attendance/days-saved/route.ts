import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classes } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requireAnyPermission } from "@/lib/auth";
import { MONTH_NAMES } from "@/lib/attendanceHelpers";
import { classAllowed, getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  // Attendance Tracking Centre (Academic Master / admin: attendance.trackall)
  // AND the member Attendance page (teachers: attendance.view) both use this route.
  const err = requireAnyPermission(user, ["attendance.view", "attendance.trackall"]);
  if (err) return err;

  try {
    const scope = await getTeacherScope(user);

    const url = new URL(req.url);
    const classId = Number(url.searchParams.get("classId"));
    const year = Number(url.searchParams.get("year"));

    if (!Number.isFinite(classId) || !Number.isFinite(year)) {
      return Response.json({ error: "classId and year are required." }, { status: 400 });
    }
    if (!classAllowed(scope, classId)) {
      return Response.json({ error: "You are not assigned to this class." }, { status: 403 });
    }

    const [cls] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
    if (!cls) return Response.json({ error: "Class not found." }, { status: 404 });

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const rows = await db
      .select({ date: attendance.date, status: attendance.status })
      .from(attendance)
      .where(and(eq(attendance.classId, classId), gte(attendance.date, startDate), lte(attendance.date, endDate)));

    const perMonth = new Map<number, { dates: Set<string>; present: number; late: number; total: number }>();
    for (let m = 1; m <= 12; m++) perMonth.set(m, { dates: new Set(), present: 0, late: 0, total: 0 });

    for (const r of rows) {
      const monthNum = Number(r.date.slice(5, 7));
      const bucket = perMonth.get(monthNum);
      if (!bucket) continue;
      bucket.dates.add(r.date);
      bucket.total++;
      if (r.status === "present") bucket.present++;
      else if (r.status === "late") bucket.late++;
    }

    const months = MONTH_NAMES.map((name, idx) => {
      const m = idx + 1;
      const bucket = perMonth.get(m)!;
      const rate = bucket.total > 0 ? Math.round(((bucket.present + bucket.late) / bucket.total) * 100) : 0;
      return {
        month: m,
        name,
        daysRecorded: bucket.dates.size,
        rate,
      };
    });

    const totalDaysRecorded = months.reduce((a, m) => a + m.daysRecorded, 0);

    return Response.json({ className: cls.name, year, months, totalDaysRecorded });
  } catch (e) {
    return dbErrorResponse(e, "load the days-saved tracker");
  }
}
