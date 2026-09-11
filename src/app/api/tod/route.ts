import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, teachers, todReports } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { ensureAppSettings } from "@/lib/approvals";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { getTeacherByUserId } from "@/lib/teachers";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.view");
  if (err || !user) return err ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const dateQuery = url.searchParams.get("date")?.trim() || todayStr();

    // 1. Fetch current logged-in teacher profile if any
    const myTeacher = await getTeacherByUserId(user.id);

    // 2. Fetch all teachers for dropdown
    const allTeachers = await db
      .select({
        id: teachers.id,
        name: teachers.name,
        subject: teachers.subject,
        phone: teachers.phone,
      })
      .from(teachers)
      .orderBy(asc(teachers.name));

    // 3. Fetch classes and count male / female students
    const allClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        section: classes.section,
      })
      .from(classes)
      .orderBy(asc(classes.id));

    const studentCounts = await db
      .select({
        classId: students.classId,
        total: sql<number>`count(${students.id})::int`,
        boys: sql<number>`count(${students.id}) filter (where ${students.gender} = 'male')::int`,
        girls: sql<number>`count(${students.id}) filter (where ${students.gender} = 'female')::int`,
      })
      .from(students)
      .where(sql`${students.classId} IS NOT NULL`)
      .groupBy(students.classId);

    const countsMap = new Map(studentCounts.map((s) => [s.classId, s]));

    // 4. Default attendance rows for all classes
    const defaultAttendanceRows = allClasses.map((c) => {
      const counts = countsMap.get(c.id) ?? { total: 0, boys: 0, girls: 0 };
      const regB = counts.boys;
      const regG = counts.girls;
      const regT = counts.total;
      return {
        classId: c.id,
        className: c.name.replace(/^Form\s*1\b/i, "Form I").replace(/^Form\s*2\b/i, "Form II").replace(/^Form\s*3\b/i, "Form III").replace(/^Form\s*4\b/i, "Form IV"),
        classSection: c.section,
        rb: regB,
        rg: regG,
        ab: 0,
        ag: 0,
        sb: 0,
        sg: 0,
        pb: 0,
        pg: 0,
      };
    });

    // 5. Use the shared school identity settings for all printed reports.
    const schoolSettings = await ensureAppSettings();

    // 6. Fetch existing TOD report for requested date
    const [existingReport] = await db
      .select()
      .from(todReports)
      .where(eq(todReports.date, dateQuery))
      .limit(1);

    // 7. Fetch recent reports list (e.g. last 30 reports)
    const recentReports = await db
      .select({
        id: todReports.id,
        date: todReports.date,
        teacherId: todReports.teacherId,
        teacherName: todReports.teacherName,
        answers: todReports.answers,
        attendanceRows: todReports.attendanceRows,
        attendanceRate: todReports.attendanceRate,
        todComment: todReports.todComment,
        headComment: todReports.headComment,
        headAcknowledged: todReports.headAcknowledged,
        headmasterName: todReports.headmasterName,
        createdAt: todReports.createdAt,
      })
      .from(todReports)
      .orderBy(desc(todReports.date))
      .limit(30);

    if (url.searchParams.get("mode") === "list") {
      return Response.json(recentReports);
    }

    return Response.json({
      date: dateQuery,
      roster: defaultAttendanceRows,
      mine: existingReport ?? null,
      allTeachers,
      myTeacher,
      settings: {
        councilName: existingReport?.councilName || schoolSettings.councilName,
        schoolName: existingReport?.schoolName || schoolSettings.schoolName,
        headOfSchoolName: existingReport?.headmasterName || schoolSettings.headOfSchoolName,
        motto: existingReport?.motto || schoolSettings.motto,
        logoData: schoolSettings.logoData,
      },
      reports: recentReports,
      isAdmin: user.role === "admin" || user.staffRole === "academic_master",
    });
  } catch (e) {
    return dbErrorResponse(e, "load TOD report");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.manage");
  if (err || !user) return err ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid data." }, { status: 400 });

  const reportDate = typeof body.date === "string" ? body.date.trim() : todayStr();
  const teacherName = typeof body.teacherName === "string" ? body.teacherName.trim() : "";
  if (!teacherName) {
    return Response.json({ error: "Teacher On Duty name is required." }, { status: 400 });
  }

  const teacherId =
    body.teacherId && Number.isInteger(Number(body.teacherId)) ? Number(body.teacherId) : null;

  const answers = typeof body.answers === "string" ? body.answers : JSON.stringify(body.answers || {});
  const attendanceRows =
    typeof body.attendanceRows === "string"
      ? body.attendanceRows
      : JSON.stringify(body.attendanceRows || []);
  const attendanceRate = Number.isFinite(Number(body.attendanceRate))
    ? Number(body.attendanceRate)
    : 0;

  const todComment = typeof body.todComment === "string" ? body.todComment.trim() : "";
  const headComment = typeof body.headComment === "string" ? body.headComment.trim() : "";
  const todSignature = typeof body.todSignature === "string" ? body.todSignature.trim() : "";
  const headSignature = typeof body.headSignature === "string" ? body.headSignature.trim() : "";
  const headmasterName =
    typeof body.headmasterName === "string" ? body.headmasterName.trim() : "Saidi Rashid Mpambika";
  const councilName =
    typeof body.councilName === "string" ? body.councilName.trim() : "ROMBO DISTRICT COUNCIL";
  const schoolName =
    typeof body.schoolName === "string" ? body.schoolName.trim() : "MANGI WINGIA SECONDARY SCHOOL";
  const motto =
    typeof body.motto === "string"
      ? body.motto.trim()
      : "MANGI WINGIA SECONDARY SCHOOL: Honor All Build Together";

  try {
    const [existing] = await db
      .select({ id: todReports.id })
      .from(todReports)
      .where(eq(todReports.date, reportDate))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(todReports)
        .set({
          teacherId,
          teacherName,
          answers,
          attendanceRows,
          attendanceRate,
          todComment,
          headComment,
          todSignature,
          headSignature,
          headmasterName,
          councilName,
          schoolName,
          motto,
          headAcknowledged: true,
          updatedAt: new Date(),
        })
        .where(eq(todReports.id, existing.id))
        .returning();

      return Response.json({ ok: true, report: updated });
    }

    const [created] = await db
      .insert(todReports)
      .values({
        date: reportDate,
        teacherId,
        teacherName,
        answers,
        attendanceRows,
        attendanceRate,
        todComment,
        headComment,
        todSignature,
        headSignature,
        headmasterName,
        councilName,
        schoolName,
        motto,
        headAcknowledged: true,
      })
      .returning();

    return Response.json({ ok: true, report: created }, { status: 201 });
  } catch (e) {
    return dbErrorResponse(e, "save TOD report");
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.manage");
  if (err || !user) return err ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid data." }, { status: 400 });

  const id = Number(body.id);
  if (!Number.isInteger(id)) return Response.json({ error: "Invalid report ID." }, { status: 400 });

  const headComment = typeof body.headComment === "string" ? body.headComment.trim() : "";

  try {
    const [existing] = await db.select({ id: todReports.id }).from(todReports).where(eq(todReports.id, id)).limit(1);
    if (!existing) return Response.json({ error: "Report not found." }, { status: 404 });

    const [updated] = await db
      .update(todReports)
      .set({ headComment, headAcknowledged: true, updatedAt: new Date() })
      .where(eq(todReports.id, id))
      .returning();

    return Response.json({ ok: true, report: updated });
  } catch (e) {
    return dbErrorResponse(e, "save Head comment");
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.manage");
  if (err || !user) return err ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const idRaw = url.searchParams.get("id");
  const id = Number(idRaw);
  if (!Number.isInteger(id)) {
    return Response.json({ error: "Invalid report ID." }, { status: 400 });
  }

  try {
    await db.delete(todReports).where(eq(todReports.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return dbErrorResponse(e, "delete TOD report");
  }
}
