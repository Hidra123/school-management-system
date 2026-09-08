import { and, asc, eq, gte, inArray, lte, max } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classes, students, teacherClasses, teachers, users } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { daysInMonth, ymd } from "@/lib/attendanceHelpers";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * School-wide "today" (or any chosen date) attendance overview for
 * Admin / Academic Master — aggregates across ALL classes, plus shows
 * which class teachers have (or have not) submitted attendance for the day.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "attendance.trackall");
  if (err) return err;

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || todayStr();

    const allClasses = await db.select().from(classes).orderBy(asc(classes.name));

    const studentCounts = await db
      .select({ classId: students.classId })
      .from(students);
    const registeredMap = new Map<number, number>();
    for (const s of studentCounts) {
      if (s.classId === null) continue;
      registeredMap.set(s.classId, (registeredMap.get(s.classId) ?? 0) + 1);
    }

    // Morning-session attendance for the chosen date, across all classes.
    const attRows = await db
      .select({ classId: attendance.classId, status: attendance.status })
      .from(attendance)
      .where(and(eq(attendance.date, date), eq(attendance.session, "morning")));

    const perClassAtt = new Map<number, { present: number; absent: number; late: number }>();
    for (const r of attRows) {
      const bucket = perClassAtt.get(r.classId) ?? { present: 0, absent: 0, late: 0 };
      if (r.status === "present") bucket.present++;
      else if (r.status === "absent") bucket.absent++;
      else if (r.status === "late") bucket.late++;
      perClassAtt.set(r.classId, bucket);
    }

    const perClass = allClasses.map((c) => {
      const registered = registeredMap.get(c.id) ?? 0;
      const att = perClassAtt.get(c.id) ?? { present: 0, absent: 0, late: 0 };
      const rate = registered > 0 ? Math.round((att.present / registered) * 100) : 0;
      return { classId: c.id, className: c.name, section: c.section, registered, ...att, rate };
    });

    const schoolTotal = perClass.reduce(
      (acc, c) => ({
        registered: acc.registered + c.registered,
        present: acc.present + c.present,
        absent: acc.absent + c.absent,
        late: acc.late + c.late,
      }),
      { registered: 0, present: 0, absent: 0, late: 0 },
    );
    const schoolRate = schoolTotal.registered > 0 ? Math.round((schoolTotal.present / schoolTotal.registered) * 100) : 0;

    // ----- At-risk count for the current month (quick top-stat) -----
    const [y, m] = date.split("-").map(Number);
    const numDays = daysInMonth(y, m);
    const startDate = ymd(y, m, 1);
    const endDate = ymd(y, m, numDays);
    const monthRows = await db
      .select({ studentId: attendance.studentId, status: attendance.status })
      .from(attendance)
      .where(and(gte(attendance.date, startDate), lte(attendance.date, endDate)));
    const byStudent = new Map<number, { present: number; late: number; sessions: number }>();
    for (const r of monthRows) {
      const bucket = byStudent.get(r.studentId) ?? { present: 0, late: 0, sessions: 0 };
      bucket.sessions++;
      if (r.status === "present") bucket.present++;
      else if (r.status === "late") bucket.late++;
      byStudent.set(r.studentId, bucket);
    }
    let atRiskCount = 0;
    for (const b of byStudent.values()) {
      if (b.sessions === 0) continue;
      const rate = ((b.present + b.late) / b.sessions) * 100;
      if (rate < 75) atRiskCount++;
    }

    // ----- Class Teachers — attendance submission status for the chosen date -----
    const links = await db
      .select({
        classId: teacherClasses.classId,
        teacherId: teacherClasses.teacherId,
        teacherName: teachers.name,
        staffRole: users.staffRole,
      })
      .from(teacherClasses)
      .innerJoin(teachers, eq(teacherClasses.teacherId, teachers.id))
      .leftJoin(users, eq(teachers.userId, users.id));

    // Prefer the teacher explicitly assigned as "class_teacher" for a class;
    // fall back to the first assigned teacher if none has that specific role.
    const classTeacherMap = new Map<number, { teacherId: number; teacherName: string; isClassTeacherRole: boolean }>();
    for (const l of links) {
      const existing = classTeacherMap.get(l.classId);
      const isClassTeacherRole = l.staffRole === "class_teacher";
      // Keep the first assignment found, but always prefer one whose staffRole
      // is explicitly "class_teacher" over any other assigned teacher.
      if (!existing || (isClassTeacherRole && !existing.isClassTeacherRole)) {
        classTeacherMap.set(l.classId, { teacherId: l.teacherId, teacherName: l.teacherName, isClassTeacherRole });
      }
    }

    const submittedRows = await db
      .select({ classId: attendance.classId, savedAt: max(attendance.createdAt) })
      .from(attendance)
      .where(eq(attendance.date, date))
      .groupBy(attendance.classId);
    const submittedMap = new Map(submittedRows.map((r) => [r.classId, r.savedAt]));

    const classTeachersStatus = allClasses.map((c) => {
      const ct = classTeacherMap.get(c.id);
      const savedAt = submittedMap.get(c.id) ?? null;
      return {
        classId: c.id,
        className: c.name,
        teacherId: ct?.teacherId ?? null,
        teacherName: ct?.teacherName ?? null,
        studentCount: registeredMap.get(c.id) ?? 0,
        submitted: !!savedAt,
        lastSavedAt: savedAt,
      };
    });

    return Response.json({
      date,
      presentToday: schoolTotal.present,
      absentToday: schoolTotal.absent,
      attendanceRate: schoolRate,
      atRiskCount,
      perClass,
      schoolTotal: { ...schoolTotal, rate: schoolRate },
      classTeachers: classTeachersStatus,
    });
  } catch (e) {
    return dbErrorResponse(e, "load the school attendance overview");
  }
}
