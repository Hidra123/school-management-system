import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendance, students } from "@/db/schema";

export const dynamic = "force-dynamic";

const VALID = ["present", "absent", "late", "excused"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const classId = Number(url.searchParams.get("classId"));
  const date = url.searchParams.get("date");

  if (!Number.isFinite(classId) || !date) {
    return Response.json({ error: "classId and date are required." }, { status: 400 });
  }

  const rows = await db
    .select({
      id: attendance.id,
      studentId: attendance.studentId,
      classId: attendance.classId,
      date: attendance.date,
      status: attendance.status,
      studentName: students.name,
      admissionNo: students.admissionNo,
    })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .where(and(eq(attendance.classId, classId), eq(attendance.date, date)));

  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const classId = Number(body.classId);
  const date = typeof body.date === "string" ? body.date : "";
  const records = Array.isArray(body.records) ? body.records : [];

  if (!Number.isFinite(classId) || !date) {
    return Response.json({ error: "Class and date are required." }, { status: 400 });
  }
  if (records.length === 0) {
    return Response.json({ error: "No students were selected." }, { status: 400 });
  }

  const rows = records
    .filter((r: { studentId?: unknown; status?: unknown }) => {
      const sid = Number(r?.studentId);
      return Number.isFinite(sid) && VALID.includes(String(r?.status));
    })
    .map((r: { studentId?: unknown; status?: unknown }) => ({
      studentId: Number(r.studentId),
      classId,
      date,
      status: String(r.status) as "present" | "absent" | "late" | "excused",
    }));

  if (rows.length === 0) {
    return Response.json({ error: "Attendance data is invalid." }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx.delete(attendance).where(and(eq(attendance.classId, classId), eq(attendance.date, date)));
    await tx.insert(attendance).values(rows);
  });

  return Response.json({ saved: rows.length }, { status: 201 });
}
