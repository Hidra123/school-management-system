import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { classes, students } from "@/db/schema";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const classIdRaw = url.searchParams.get("classId");
  const q = url.searchParams.get("q")?.trim() ?? "";

  const conditions = [];
  if (classIdRaw && classIdRaw !== "" && Number.isFinite(Number(classIdRaw))) {
    conditions.push(eq(students.classId, Number(classIdRaw)));
  }
  if (q) {
    conditions.push(
      or(
        ilike(students.name, `%${q}%`),
        ilike(students.admissionNo, `%${q}%`),
        ilike(students.guardianName, `%${q}%`),
        ilike(students.guardianPhone, `%${q}%`),
      ),
    );
  }

  const rows = await db
    .select({
      id: students.id,
      admissionNo: students.admissionNo,
      name: students.name,
      gender: students.gender,
      classId: students.classId,
      className: classes.name,
      guardianName: students.guardianName,
      guardianPhone: students.guardianPhone,
      enrollmentDate: students.enrollmentDate,
      createdAt: students.createdAt,
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(students.createdAt));

  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Student name is required." }, { status: 400 });
  }
  const admissionNo =
    typeof body.admissionNo === "string" && body.admissionNo.trim()
      ? body.admissionNo.trim()
      : `ADM-${Date.now().toString().slice(-6)}`;

  const classId =
    body.classId === "" || body.classId === null || body.classId === undefined
      ? null
      : Number(body.classId);
  const gender = body.gender === "female" ? "female" : "male";
  const enrollmentDate =
    typeof body.enrollmentDate === "string" && body.enrollmentDate
      ? body.enrollmentDate
      : todayStr();

  try {
    const [row] = await db
      .insert(students)
      .values({
        admissionNo,
        name: body.name.trim(),
        gender,
        classId: Number.isFinite(classId) ? classId : null,
        guardianName: typeof body.guardianName === "string" ? body.guardianName.trim() : "",
        guardianPhone: typeof body.guardianPhone === "string" ? body.guardianPhone.trim() : "",
        enrollmentDate,
      })
      .returning();
    return Response.json(row, { status: 201 });
  } catch {
    return Response.json(
      { error: "This admission number is already in use. Please choose another one." },
      { status: 409 },
    );
  }
}
