import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classes, studentSubjectMap, students, subjects } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requireAnyPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Student-Subject Mapping (Map Students) — Academic-only tool for OPTIONAL
 * subjects (electives like Civics, Computer Application, Business Studies).
 * Submit Scores shows only mapped students for an optional subject.
 */

function allowed(user: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions.includes("students.edit") || user.permissions.includes("subjects.manage");
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  if (!allowed(user)) return Response.json({ error: "You do not have permission for this action." }, { status: 403 });

  try {
    const url = new URL(req.url);
    const subjectIdRaw = url.searchParams.get("subjectId");
    const classIdRaw = url.searchParams.get("classId");

    // ----- List: optional subjects (with mapped counts) + every class -----
    if (!subjectIdRaw) {
      const optionals = await db
        .select({ id: subjects.id, name: subjects.name, code: subjects.code })
        .from(subjects)
        .where(eq(subjects.isOptional, true))
        .orderBy(asc(subjects.name));
      const counts = await db
        .select({ subjectId: studentSubjectMap.subjectId, n: count() })
        .from(studentSubjectMap)
        .groupBy(studentSubjectMap.subjectId);
      const cMap = new Map(counts.map((c) => [c.subjectId, c.n]));
      const allClasses = await db.select({ id: classes.id, name: classes.name, section: classes.section }).from(classes).orderBy(asc(classes.name));
      return Response.json({
        subjects: optionals.map((s) => ({ ...s, mappedCount: cMap.get(s.id) ?? 0 })),
        classes: allClasses,
      });
    }

    // ----- Detail: students of one class with their mapped flag -----
    const subjectId = Number(subjectIdRaw);
    const classId = Number(classIdRaw);
    if (!Number.isInteger(subjectId) || !Number.isInteger(classId)) {
      return Response.json({ error: "subjectId and classId are required." }, { status: 400 });
    }

    const classStudents = await db
      .select({ id: students.id, name: students.name, gender: students.gender, admissionNo: students.admissionNo, admissionStatus: students.admissionStatus })
      .from(students)
      .where(eq(students.classId, classId))
      .orderBy(asc(students.name));
    const mapped = await db
      .select({ studentId: studentSubjectMap.studentId })
      .from(studentSubjectMap)
      .where(
        and(
          eq(studentSubjectMap.subjectId, subjectId),
          inArray(
            studentSubjectMap.studentId,
            classStudents.length > 0 ? classStudents.map((s) => s.id) : [-1],
          ),
        ),
      );
    const mappedSet = new Set(mapped.map((m) => m.studentId));

    return Response.json(
      classStudents.map((s) => ({
        ...s,
        gender: s.gender === "female" ? "Female" : "Male",
        mapped: mappedSet.has(s.id),
      })),
    );
  } catch (e) {
    return dbErrorResponse(e, "load subject mapping");
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  if (!allowed(user)) return Response.json({ error: "You do not have permission for this action." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const subjectId = Number(body.subjectId);
  const classId = Number(body.classId);
  const studentIds: number[] = Array.isArray(body.studentIds)
    ? body.studentIds.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n))
    : [];
  if (!Number.isInteger(subjectId) || !Number.isInteger(classId)) {
    return Response.json({ error: "subjectId and classId are required." }, { status: 400 });
  }

  try {
    // Replace this class's mapping for the subject — never touch other classes.
    const classStudentIds = (
      await db.select({ id: students.id }).from(students).where(eq(students.classId, classId))
    ).map((r) => r.id);

    await db.transaction(async (tx) => {
      if (classStudentIds.length > 0) {
        await tx
          .delete(studentSubjectMap)
          .where(
            and(
              eq(studentSubjectMap.subjectId, subjectId),
              inArray(studentSubjectMap.studentId, classStudentIds),
            ),
          );
      }
      const validIds = studentIds.filter((sid) => classStudentIds.includes(sid));
      if (validIds.length > 0) {
        await tx.insert(studentSubjectMap).values(validIds.map((studentId) => ({ studentId, subjectId })));
      }
    });

    return Response.json({ ok: true, mapped: studentIds.length });
  } catch (e) {
    return dbErrorResponse(e, "save subject mapping");
  }
}
