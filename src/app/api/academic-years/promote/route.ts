import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { alumni, classes, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requireAnyPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

function allowed(user: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions.includes("students.edit");
}

/** Extract the form number from a class name like "Form 3" (null when no number). */
function formNumber(name: string): number | null {
  const m = name.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Class Promotion Engine — Form1→2, Form2→3, Form3→4, Form4→Alumni.
 * Finds the target class by numeric name (Form N+1); when none exists the
 * students graduate (snapshot into `alumni`, unassigned from their class,
 * keeping all historical grades/attendance rows intact).
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  if (!allowed(user)) return Response.json({ error: "You do not have permission for this action." }, { status: 403 });

  try {
    const classIdRaw = new URL(req.url).searchParams.get("classId");
    const classId = classIdRaw && classIdRaw !== "all" ? Number(classIdRaw) : null;

    const list = classId !== null
      ? await db.select().from(classes).where(eq(classes.id, classId))
      : await db.select().from(classes).orderBy(asc(classes.name));
    const allClasses = await db.select().from(classes).orderBy(asc(classes.name));

    const preview = [];
    for (const cls of list) {
      const n = formNumber(cls.name);
      const nextClass = n !== null ? (allClasses.find((c) => formNumber(c.name) === n + 1) ?? null) : null;
      const classStudents = await db
        .select({ id: students.id, name: students.name, gender: students.gender, admissionNo: students.admissionNo })
        .from(students)
        .where(eq(students.classId, cls.id))
        .orderBy(asc(students.name));
      preview.push({
        classId: cls.id,
        className: cls.name,
        target: nextClass ? { id: nextClass.id, name: nextClass.name, action: "promote" as const } : { name: "Alumni (Graduated)", action: "graduate" as const },
        students: classStudents,
      });
    }
    return Response.json(preview);
  } catch (e) {
    return dbErrorResponse(e, "preview the promotion");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  if (!allowed(user)) return Response.json({ error: "You do not have permission for this action." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const classId = Number(body?.classId);
  const toYear = typeof body?.toYear === "string" ? body.toYear.trim() : "";
  if (!Number.isInteger(classId) || !toYear) {
    return Response.json({ error: "classId and toYear are required." }, { status: 400 });
  }

  try {
    const allClasses = await db.select().from(classes).orderBy(asc(classes.name));
    const cls = allClasses.find((c) => c.id === classId);
    if (!cls) return Response.json({ error: "Class not found." }, { status: 404 });

    const n = formNumber(cls.name);
    const nextClass = n !== null ? (allClasses.find((c) => formNumber(c.name) === n + 1) ?? null) : null;
    const classStudents = await db.select().from(students).where(eq(students.classId, classId));
    if (classStudents.length === 0) {
      return Response.json({ error: "This class has no students to move." }, { status: 400 });
    }

    let promoted = 0;
    let graduated = 0;

    await db.transaction(async (tx) => {
      if (nextClass) {
        await tx
          .update(students)
          .set({ classId: nextClass.id })
          .where(inArray(students.id, classStudents.map((s) => s.id)));
        promoted = classStudents.length;
      } else {
        // Graduate to alumni: snapshot + unassign from the class (history stays).
        await tx.insert(alumni).values(
          classStudents.map((s) => ({
            studentId: s.id,
            admissionNo: s.admissionNo,
            name: s.name,
            gender: s.gender,
            previousClassId: cls.id,
            previousClassName: cls.name,
            graduatedYear: toYear,
          })),
        );
        await tx
          .update(students)
          .set({ classId: null })
          .where(inArray(students.id, classStudents.map((s) => s.id)));
        graduated = classStudents.length;
      }
    });

    return Response.json({
      ok: true,
      moved: promoted || graduated,
      action: nextClass ? "promoted" : "graduated",
      target: nextClass?.name ?? "Alumni",
    });
  } catch (e) {
    return dbErrorResponse(e, "execute the promotion");
  }
}
