import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { classAllowed, getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "students.view");
  if (err) return err;

  const scope = await getTeacherScope(user);

  const url = new URL(req.url);
  const classIdRaw = url.searchParams.get("classId");
  const q = url.searchParams.get("q")?.trim() ?? "";

  const requestedClassId =
    classIdRaw && classIdRaw !== "" && Number.isFinite(Number(classIdRaw)) ? Number(classIdRaw) : null;

  // A scoped teacher asking for a class outside their assignment gets nothing.
  if (requestedClassId !== null && !classAllowed(scope, requestedClassId)) {
    return Response.json([]);
  }
  // A scoped teacher with no assigned classes at all has nothing to see.
  if (scope.scoped && scope.classIds.length === 0) {
    return Response.json([]);
  }

  const conditions = [];
  if (requestedClassId !== null) {
    conditions.push(eq(students.classId, requestedClassId));
  } else if (scope.scoped) {
    conditions.push(inArray(students.classId, scope.classIds));
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
  const user = await getSessionUser();
  const err = requirePermission(user, "students.create");
  if (err) return err;

  const scope = await getTeacherScope(user);

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

  if (scope.scoped && !classAllowed(scope, classId)) {
    return Response.json({ error: "You can only add students to your assigned classes." }, { status: 403 });
  }

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
