import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { classes, studentSubjectMap, students, subjects } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { createApproval } from "@/lib/approvals";
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

  try {
    const url = new URL(req.url);
    // ?strict=1 → Academic Master pia huchujwa kwa assignment (Submit Scores:
    // orodha ya wanafunzi wa kuweka scores). Bila flag hii Academic anaona
    // classes ZOTE hapa (admissions duty — ana-admit wanafunzi popote).
    const strict = url.searchParams.get("strict") === "1";
    const scope = await getTeacherScope(user, strict ? { strictForAcademicMaster: true } : undefined);

    const classIdRaw = url.searchParams.get("classId");
    const subjectIdRaw = url.searchParams.get("subjectId");
    const q = url.searchParams.get("q")?.trim() ?? "";

    const requestedClassId =
      classIdRaw && classIdRaw !== "" && Number.isFinite(Number(classIdRaw)) ? Number(classIdRaw) : null;
    const requestedSubjectId =
      subjectIdRaw && subjectIdRaw !== "" && Number.isFinite(Number(subjectIdRaw)) ? Number(subjectIdRaw) : null;

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

    // If an optional subject is specified, only return mapped students
    if (requestedSubjectId !== null) {
      const [subj] = await db
        .select({ isOptional: subjects.isOptional })
        .from(subjects)
        .where(eq(subjects.id, requestedSubjectId))
        .limit(1);

      if (subj?.isOptional) {
        const mapped = await db
          .select({ studentId: studentSubjectMap.studentId })
          .from(studentSubjectMap)
          .where(eq(studentSubjectMap.subjectId, requestedSubjectId));
        const mappedIds = mapped.map((m) => m.studentId);
        if (mappedIds.length === 0) {
          return Response.json([]);
        }
        conditions.push(inArray(students.id, mappedIds));
      }
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
        dateOfBirth: students.dateOfBirth,
        guardianName: students.guardianName,
        guardianPhone: students.guardianPhone,
        guardianAddress: students.guardianAddress,
        enrollmentDate: students.enrollmentDate,
        createdAt: students.createdAt,
      })
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(students.createdAt));

    // Pending admissions are visible only to the admin or staff trusted to admit students.
    if (user!.role !== "admin" && !user!.permissions.includes("students.create")) {
      return Response.json(rows.filter((r) => (r as unknown as { admissionStatus?: string }).admissionStatus !== "pending"));
    }
    return Response.json(rows);
  } catch (e) {
    return dbErrorResponse(e, "load students");
  }
}

function name(r: { name: string }) { return r.name; }

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
        dateOfBirth: typeof body.dateOfBirth === "string" && body.dateOfBirth ? body.dateOfBirth : null,
        guardianName: typeof body.guardianName === "string" ? body.guardianName.trim() : "",
        guardianPhone: typeof body.guardianPhone === "string" ? body.guardianPhone.trim() : "",
        guardianAddress: typeof body.guardianAddress === "string" ? body.guardianAddress.trim() : "",
        enrollmentDate,
      })
      .returning();
    if (user!.role !== "admin") {
      await db.update(students).set({ admissionStatus: "pending" }).where(eq(students.id, row.id));
      await createApproval({
        type: "student_admission",
        refId: row.id,
        summary: `${name(row)} (${admissionNo})`,
        submittedById: user!.id,
        submittedByName: user!.name,
      });
    }
    return Response.json({ ...row, admissionStatus: user!.role === "admin" ? "approved" : "pending" }, { status: 201 });
  } catch {
    return Response.json(
      { error: "This admission number is already in use in this class. Please choose another one." },
      { status: 409 },
    );
  }
}
