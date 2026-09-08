import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendance, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { classAllowed, getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

const VALID_STATUS = ["present", "absent", "late", "excused"];
const VALID_SESSION = ["morning", "afternoon"];

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "attendance.view");
  if (err) return err;

  try {
    const scope = await getTeacherScope(user);

    const url = new URL(req.url);
    const classId = Number(url.searchParams.get("classId"));
    const date = url.searchParams.get("date");

    if (!Number.isFinite(classId) || !date) {
      return Response.json({ error: "classId and date are required." }, { status: 400 });
    }
    if (!classAllowed(scope, classId)) {
      return Response.json({ error: "You are not assigned to this class." }, { status: 403 });
    }

    const rows = await db
      .select({
        id: attendance.id,
        studentId: attendance.studentId,
        classId: attendance.classId,
        date: attendance.date,
        session: attendance.session,
        status: attendance.status,
        studentName: students.name,
        admissionNo: students.admissionNo,
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(and(eq(attendance.classId, classId), eq(attendance.date, date)));

    return Response.json(rows);
  } catch (e) {
    return dbErrorResponse(e, "load attendance");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "attendance.manage");
  if (err) return err;

  try {
    const scope = await getTeacherScope(user);

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

    const classId = Number(body.classId);
    const date = typeof body.date === "string" ? body.date : "";
    const records = Array.isArray(body.records) ? body.records : [];

    if (!Number.isFinite(classId) || !date) {
      return Response.json({ error: "Class and date are required." }, { status: 400 });
    }
    if (!classAllowed(scope, classId)) {
      return Response.json({ error: "You are not assigned to this class." }, { status: 403 });
    }
    if (records.length === 0) {
      return Response.json({ error: "No students were selected." }, { status: 400 });
    }

    // Each record carries a status per session: { studentId, morning, afternoon }
    const rows: Array<{ studentId: number; classId: number; date: string; session: "morning" | "afternoon"; status: "present" | "absent" | "late" | "excused" }> = [];
    for (const r of records as Array<{ studentId?: unknown; morning?: unknown; afternoon?: unknown; status?: unknown; session?: unknown }>) {
      const sid = Number(r?.studentId);
      if (!Number.isFinite(sid)) continue;

      // Support both the new {morning, afternoon} shape and the legacy {status, session} shape.
      if (typeof r?.morning === "string" && VALID_STATUS.includes(r.morning)) {
        rows.push({ studentId: sid, classId, date, session: "morning", status: r.morning as "present" | "absent" | "late" | "excused" });
      }
      if (typeof r?.afternoon === "string" && VALID_STATUS.includes(r.afternoon)) {
        rows.push({ studentId: sid, classId, date, session: "afternoon", status: r.afternoon as "present" | "absent" | "late" | "excused" });
      }
      if (typeof r?.status === "string" && VALID_STATUS.includes(r.status)) {
        const session = typeof r?.session === "string" && VALID_SESSION.includes(r.session) ? (r.session as "morning" | "afternoon") : "morning";
        rows.push({ studentId: sid, classId, date, session, status: r.status as "present" | "absent" | "late" | "excused" });
      }
    }

    if (rows.length === 0) {
      return Response.json({ error: "Attendance data is invalid." }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(attendance).where(and(eq(attendance.classId, classId), eq(attendance.date, date)));
      await tx.insert(attendance).values(rows);
    });

    return Response.json({ saved: rows.length }, { status: 201 });
  } catch (e) {
    return dbErrorResponse(e, "save attendance");
  }
}
