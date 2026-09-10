import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, studentSubjectMap, students, subjects } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, hasPermission, requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Categorize subjects into Science, Art, Commercial, etc. */
export function getSubjectDepartment(name: string, code: string): string {
  const n = name.toLowerCase();
  const c = code.toLowerCase();
  if (
    n.includes("physics") ||
    n.includes("chemistry") ||
    n.includes("biology") ||
    n.includes("science") ||
    c.includes("phy") ||
    c.includes("chem") ||
    c.includes("bio") ||
    c.includes("csc") ||
    c.includes("capp")
  ) {
    return "Science";
  }
  if (
    n.includes("business") ||
    n.includes("commerce") ||
    n.includes("bookkeeping") ||
    c.includes("b/std") ||
    c.includes("bst")
  ) {
    return "Commercial";
  }
  if (
    n.includes("history") ||
    n.includes("geography") ||
    n.includes("civics") ||
    n.includes("kiswahili") ||
    n.includes("english") ||
    n.includes("tanzania")
  ) {
    return "Art";
  }
  return "General";
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const canView =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "students.map") ||
    hasPermission(user, "students.view");

  if (!canView) {
    return Response.json({ error: "You do not have permission for this action." }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const classIdRaw = url.searchParams.get("classId");
    const subjectIdRaw = url.searchParams.get("subjectId");

    const classId = classIdRaw && Number.isFinite(Number(classIdRaw)) ? Number(classIdRaw) : null;
    const subjectId = subjectIdRaw && Number.isFinite(Number(subjectIdRaw)) ? Number(subjectIdRaw) : null;

    // 1. All subjects + mapping count
    const allSubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        isOptional: subjects.isOptional,
        teacherId: subjects.teacherId,
      })
      .from(subjects)
      .orderBy(asc(subjects.name));

    // Count how many active students are mapped to each subject
    const mapCounts = await db
      .select({
        subjectId: studentSubjectMap.subjectId,
        count: sql<number>`count(${studentSubjectMap.id})::int`,
      })
      .from(studentSubjectMap)
      .innerJoin(students, eq(studentSubjectMap.studentId, students.id))
      .groupBy(studentSubjectMap.subjectId);

    const countMap = new Map(mapCounts.map((m) => [m.subjectId, m.count]));

    const enrichedSubjects = allSubjects.map((s) => ({
      ...s,
      department: getSubjectDepartment(s.name, s.code),
      mappedCount: countMap.get(s.id) ?? 0,
    }));

    // 2. All classes
    const allClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        section: classes.section,
      })
      .from(classes)
      .orderBy(asc(classes.name));

    // 3. Students list (if classId is selected)
    let studentRows: {
      id: number;
      name: string;
      gender: "male" | "female";
      admissionNo: string;
      classId: number | null;
      isMapped: boolean;
    }[] = [];

    if (classId !== null) {
      const rawStudents = await db
        .select({
          id: students.id,
          name: students.name,
          gender: students.gender,
          admissionNo: students.admissionNo,
          classId: students.classId,
        })
        .from(students)
        .where(eq(students.classId, classId))
        .orderBy(asc(students.name));

      let mappedIds = new Set<number>();
      if (subjectId !== null) {
        const mapped = await db
          .select({ studentId: studentSubjectMap.studentId })
          .from(studentSubjectMap)
          .where(
            and(
              eq(studentSubjectMap.subjectId, subjectId),
              inArray(
                studentSubjectMap.studentId,
                rawStudents.map((s) => s.id),
              ),
            ),
          );
        mappedIds = new Set(mapped.map((m) => m.studentId));
      }

      studentRows = rawStudents.map((s) => ({
        ...s,
        isMapped: mappedIds.has(s.id),
      }));
    }

    return Response.json({
      subjects: enrichedSubjects,
      classes: allClasses,
      students: studentRows,
    });
  } catch (e) {
    return dbErrorResponse(e, "load student-subject mapping");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const canManage =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "students.map") ||
    hasPermission(user, "students.edit");

  if (!canManage) {
    return Response.json({ error: "You do not have permission to modify student mappings." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid data." }, { status: 400 });

  try {
    // Action 1: Toggle subject optionality
    if (body.action === "toggle_optional") {
      const subjectId = Number(body.subjectId);
      const isOptional = Boolean(body.isOptional);
      if (!Number.isInteger(subjectId)) {
        return Response.json({ error: "Invalid subjectId." }, { status: 400 });
      }
      const [updated] = await db
        .update(subjects)
        .set({ isOptional })
        .where(eq(subjects.id, subjectId))
        .returning();
      return Response.json({ ok: true, subject: updated });
    }

    // Action 2: Toggle single student
    if (body.action === "toggle_student") {
      const studentId = Number(body.studentId);
      const subjectId = Number(body.subjectId);
      const shouldBeMapped = Boolean(body.isMapped);

      if (!Number.isInteger(studentId) || !Number.isInteger(subjectId)) {
        return Response.json({ error: "Invalid studentId or subjectId." }, { status: 400 });
      }

      if (shouldBeMapped) {
        await db
          .insert(studentSubjectMap)
          .values({ studentId, subjectId })
          .onConflictDoNothing({ target: [studentSubjectMap.studentId, studentSubjectMap.subjectId] });
      } else {
        await db
          .delete(studentSubjectMap)
          .where(and(eq(studentSubjectMap.studentId, studentId), eq(studentSubjectMap.subjectId, subjectId)));
      }

      return Response.json({ ok: true });
    }

    // Action 3: Bulk save class-subject mapping
    const classId = Number(body.classId);
    const subjectId = Number(body.subjectId);
    const studentIds: number[] = Array.isArray(body.studentIds)
      ? body.studentIds.map(Number).filter(Number.isInteger)
      : [];

    if (!Number.isInteger(classId) || !Number.isInteger(subjectId)) {
      return Response.json({ error: "classId and subjectId are required." }, { status: 400 });
    }

    // Fetch all student IDs in this class
    const classStudents = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.classId, classId));
    const allClassStudentIds = classStudents.map((s) => s.id);

    await db.transaction(async (tx) => {
      // 1. Delete all existing mappings for students in this class for this subject
      if (allClassStudentIds.length > 0) {
        await tx
          .delete(studentSubjectMap)
          .where(
            and(
              eq(studentSubjectMap.subjectId, subjectId),
              inArray(studentSubjectMap.studentId, allClassStudentIds),
            ),
          );
      }

      // 2. Insert new mappings
      if (studentIds.length > 0) {
        const rowsToInsert = studentIds.map((sid) => ({
          studentId: sid,
          subjectId,
        }));
        await tx.insert(studentSubjectMap).values(rowsToInsert).onConflictDoNothing();
      }

      // Also ensure subject is marked isOptional if it was not already
      await tx
        .update(subjects)
        .set({ isOptional: true })
        .where(eq(subjects.id, subjectId));
    });

    return Response.json({ ok: true, mappedCount: studentIds.length });
  } catch (e) {
    return dbErrorResponse(e, "save student mapping");
  }
}
