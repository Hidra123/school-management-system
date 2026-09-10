import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, todReports } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requireAnyPermission, requirePermission } from "@/lib/auth";
import { getTeacherByUserId } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export type AttRow = {
  classId: number;
  className: string;
  rb: number; rg: number; // registered boys / girls (auto from roster)
  ab: number; ag: number; // absent
  sb: number; sg: number; // sick
  pb: number; pg: number; // permitted
};

/** Registered students per class by gender — the report auto-fills this. */
async function rosterRows(): Promise<AttRow[]> {
  const allClasses = await db.select().from(classes).orderBy(asc(classes.name));
  const counts = await db
    .select({ classId: students.classId, gender: students.gender, n: count() })
    .from(students)
    .groupBy(students.classId, students.gender);
  const map = new Map<string, number>();
  for (const c of counts) if (c.classId !== null) map.set(`${c.classId}|${c.gender}`, c.n);
  return allClasses.map((c) => ({
    classId: c.id,
    className: c.name,
    rb: map.get(`${c.id}|male`) ?? 0,
    rg: map.get(`${c.id}|female`) ?? 0,
    ab: 0, ag: 0, sb: 0, sg: 0, pb: 0, pg: 0,
  }));
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requireAnyPermission(user, ["tod.view", "tod.manage"]);
  if (err) return err;

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    // ----- List/recent reports -----
    if (mode === "list") {
      const rows = await db.select().from(todReports).orderBy(desc(todReports.date), desc(todReports.id)).limit(60);
      if (user?.role === "admin") return Response.json(rows);
      const teacher = await getTeacherByUserId(user!.id);
      return Response.json(rows.filter((r) => teacher && r.teacherId === teacher.id));
    }

    // ----- One date: roster + my report -----
    const date = url.searchParams.get("date");
    if (!date) return Response.json({ error: "date is required." }, { status: 400 });

    const roster = await rosterRows();
    const reports = await db.select().from(todReports).where(eq(todReports.date, date)).orderBy(asc(todReports.teacherName));
    const teacher = await getTeacherByUserId(user!.id);
    const mine = teacher ? (reports.find((r) => r.teacherId === teacher.id) ?? null) : null;
    return Response.json({
      roster,
      reports: user?.role === "admin" ? reports : reports.filter((r) => mine && r.id === mine.id),
      mine,
      teacherName: teacher?.name ?? user!.name,
      teacherId: teacher?.id ?? null,
    });
  } catch (e) {
    return dbErrorResponse(e, "load the duty report");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.manage");
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const date = typeof body.date === "string" ? body.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "date (YYYY-MM-DD) is required." }, { status: 400 });

  const teacher = await getTeacherByUserId(user!.id);
  const teacherName = teacher?.name ?? user!.name;
  const answers = typeof body.answers === "string" ? body.answers : "{}";
  const attendanceRows = typeof body.attendanceRows === "string" ? body.attendanceRows : "[]";
  const todComment = typeof body.todComment === "string" ? body.todComment.trim() : "";

  try {
    const [existing] = await db
      .select({ id: todReports.id })
      .from(todReports)
      .where(and(eq(todReports.date, date), eq(todReports.teacherName, teacherName)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(todReports)
        .set({ answers, attendanceRows, todComment, updatedAt: new Date() })
        .where(eq(todReports.id, existing.id))
        .returning();
      return Response.json(updated);
    }

    const [created] = await db
      .insert(todReports)
      .values({ date, teacherId: teacher?.id ?? null, teacherName, answers, attendanceRows, todComment })
      .returning();
    return Response.json(created, { status: 201 });
  } catch (e) {
    return dbErrorResponse(e, "save the duty report");
  }
}

/** Admin (Head of School) writes the head comment + acknowledges the report. */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.manage");
  if (err) return err;
  if (user!.role !== "admin" && user!.staffRole !== "academic_master") {
    return Response.json({ error: "Only the Head of School can acknowledge reports." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id)) return Response.json({ error: "Report id is required." }, { status: 400 });

  try {
    const [updated] = await db
      .update(todReports)
      .set({
        headComment: typeof body.headComment === "string" ? body.headComment.trim() : "",
        headAcknowledged: true,
        updatedAt: new Date(),
      })
      .where(eq(todReports.id, id))
      .returning();
    if (!updated) return Response.json({ error: "Report not found." }, { status: 404 });
    return Response.json(updated);
  } catch (e) {
    return dbErrorResponse(e, "acknowledge the duty report");
  }
}
