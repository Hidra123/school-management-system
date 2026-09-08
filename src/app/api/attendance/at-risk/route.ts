import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classes, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { daysInMonth, ymd } from "@/lib/attendanceHelpers";

export const dynamic = "force-dynamic";

function riskLevel(rate: number): "Critical" | "At Risk" | "Needs Attention" | "Good" {
  if (rate < 50) return "Critical";
  if (rate < 75) return "At Risk";
  if (rate < 85) return "Needs Attention";
  return "Good";
}

/**
 * Cross-class "at risk" student tracker — flags students whose attendance
 * rate for the chosen month is below 75%, across one class or the whole school.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "attendance.trackall");
  if (err) return err;

  try {
    const url = new URL(req.url);
    const classIdRaw = url.searchParams.get("classId");
    const month = Number(url.searchParams.get("month"));
    const year = Number(url.searchParams.get("year"));
    if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
      return Response.json({ error: "month and year are required." }, { status: 400 });
    }

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

    const totalStudents = studentRows.length;
    const studentIds = studentRows.map((s) => s.id);

    const numDays = daysInMonth(year, month);
    const startDate = ymd(year, month, 1);
    const endDate = ymd(year, month, numDays);

    const attRows =
      studentIds.length === 0
        ? []
        : await db
            .select({ studentId: attendance.studentId, status: attendance.status })
            .from(attendance)
            .where(and(inArray(attendance.studentId, studentIds), gte(attendance.date, startDate), lte(attendance.date, endDate)));

    const byStudent = new Map<number, { present: number; absent: number; late: number; sessions: number }>();
    for (const r of attRows) {
      const bucket = byStudent.get(r.studentId) ?? { present: 0, absent: 0, late: 0, sessions: 0 };
      bucket.sessions++;
      if (r.status === "present") bucket.present++;
      else if (r.status === "absent") bucket.absent++;
      else if (r.status === "late") bucket.late++;
      byStudent.set(r.studentId, bucket);
    }

    const flagged = [];
    for (const s of studentRows) {
      const b = byStudent.get(s.id);
      if (!b || b.sessions === 0) continue; // no data yet — cannot assess
      const rate = Math.round(((b.present + b.late) / b.sessions) * 100);
      if (rate >= 75) continue;
      flagged.push({
        id: s.id,
        name: s.name,
        gender: s.gender,
        className: s.className,
        present: b.present,
        absent: b.absent,
        late: b.late,
        rate,
        riskLevel: riskLevel(rate),
      });
    }
    flagged.sort((a, b) => a.rate - b.rate);

    return Response.json({ month, year, totalStudents, flaggedCount: flagged.length, students: flagged });
  } catch (e) {
    return dbErrorResponse(e, "scan for at-risk students");
  }
}
