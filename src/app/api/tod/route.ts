import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, teachers, todReports, timetableSettings } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { getTeacherByUserId } from "@/lib/teachers";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return \`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}\`;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.view");
  if (err || !user) return err ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const dateQuery = url.searchParams.get("date")?.trim() || todayStr();
    const myTeacher = await getTeacherByUserId(user.id);
    const allTeachers = await db.select({ id: teachers.id, name: teachers.name, subject: teachers.subject, phone: teachers.phone }).from(teachers).orderBy(asc(teachers.name));
    const allClasses = await db.select({ id: classes.id, name: classes.name, section: classes.section }).from(classes).orderBy(asc(classes.id));
    const studentCounts = await db.select({
      classId: students.classId,
      total: sql<number>\`count(${students.id})::int\`,
      boys: sql<number>\`count(${students.id}) filter (where ${students.gender} = 'male')::int\`,
      girls: sql<number>\`count(${students.id}) filter (where ${students.gender} = 'female')::int\`,
    }).from(students).where(sql\`${students.classId} IS NOT NULL\`).groupBy(students.classId);
    const countsMap = new Map(studentCounts.map((s) => [s.classId, s]));
    const roster = allClasses.map((c) => {
      const counts = countsMap.get(c.id) ?? { total: 0, boys: 0, girls: 0 };
      return {
        classId: c.id,
        className: c.name.replace(/^Form\\s*1\\b/i, "Form I").replace(/^Form\\s*2\\b/i, "Form II").replace(/^Form\\s*3\\b/i, "Form III").replace(/^Form\\s*4\\b/i, "Form IV"),
        classSection: c.section,
        rb: counts.boys, rg: counts.girls, ab: 0, ag: 0, sb: 0, sg: 0, pb: 0, pg: 0,
      };
    });
    const [tSettings] = await db.select().from(timetableSettings).limit(1);
    const [existingReport] = await db.select().from(todReports).where(eq(todReports.date, dateQuery)).limit(1);
    const reports = await db.select({
      id: todReports.id, date: todReports.date, teacherId: todReports.teacherId, teacherName: todReports.teacherName,
      answers: todReports.answers, attendanceRows: todReports.attendanceRows, attendanceRate: todReports.attendanceRate,
      todComment: todReports.todComment, headComment: todReports.headComment, headAcknowledged: todReports.headAcknowledged,
      headmasterName: todReports.headmasterName, createdAt: todReports.createdAt,
    }).from(todReports).orderBy(desc(todReports.date)).limit(30);
    if (url.searchParams.get("mode") === "list") return Response.json(reports);
    return Response.json({
      date: dateQuery, roster, mine: existingReport ?? null, allTeachers, myTeacher, reports,
      settings: {
        councilName: existingReport?.councilName || tSettings?.councilName || "ROMBO DISTRICT COUNCIL",
        schoolName: existingReport?.schoolName || tSettings?.schoolName || "MANGI WINGIA SECONDARY SCHOOL",
        headOfSchoolName: existingReport?.headmasterName || "Saidi Rashid Mpambika",
        motto: existingReport?.motto || "MANGI WINGIA SECONDARY SCHOOL: Honor All Build Together",
        logoData: tSettings?.logoData || "",
      },
      isAdmin: user.role === "admin" || user.staffRole === "academic_master",
    });
  } catch (e) { return dbErrorResponse(e, "load TOD report"); }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.manage");
  if (err || !user) return err ?? Response.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid data." }, { status: 400 });
  const reportDate = typeof body.date === "string" ? body.date.trim() : todayStr();
  const teacherName = typeof body.teacherName === "string" ? body.teacherName.trim() : "";
  if (!teacherName) return Response.json({ error: "Teacher On Duty name is required." }, { status: 400 });
  const teacherId = body.teacherId && Number.isInteger(Number(body.teacherId)) ? Number(body.teacherId) : null;
  const answers = typeof body.answers === "string" ? body.answers : JSON.stringify(body.answers || {});
  const attendanceRows = typeof body.attendanceRows === "string" ? body.attendanceRows : JSON.stringify(body.attendanceRows || []);
  const attendanceRate = Number.isFinite(Number(body.attendanceRate)) ? Number(body.attendanceRate) : 0;
  const value = (key: string, fallback = "") => typeof body[key] === "string" ? body[key].trim() : fallback;
  const fields = {
    teacherId, teacherName, answers, attendanceRows, attendanceRate,
    todComment: value("todComment"), headComment: value("headComment"),
    todSignature: value("todSignature"), headSignature: value("headSignature"),
    headmasterName: value("headmasterName", "Saidi Rashid Mpambika"),
    councilName: value("councilName", "ROMBO DISTRICT COUNCIL"),
    schoolName: value("schoolName", "MANGI WINGIA SECONDARY SCHOOL"),
    motto: value("motto", "MANGI WINGIA SECONDARY SCHOOL: Honor All Build Together"),
    headAcknowledged: true,
    updatedAt: new Date(),
  };
  try {
    const [existing] = await db.select({ id: todReports.id }).from(todReports).where(eq(todReports.date, reportDate)).limit(1);
    if (existing) {
      const [updated] = await db.update(todReports).set(fields).where(eq(todReports.id, existing.id)).returning();
      return Response.json({ ok: true, report: updated });
    }
    const [created] = await db.insert(todReports).values({ ...fields, date: reportDate }).returning();
    return Response.json({ ok: true, report: created }, { status: 201 });
  } catch (e) { return dbErrorResponse(e, "save TOD report"); }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.manage");
  if (err || !user) return err ?? Response.json({ error: "Not authenticated" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "Invalid report ID." }, { status: 400 });
  try { await db.delete(todReports).where(eq(todReports.id, id)); return Response.json({ ok: true }); }
  catch (e) { return dbErrorResponse(e, "delete TOD report"); }
}
