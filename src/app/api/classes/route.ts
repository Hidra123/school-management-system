import { asc, count, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requireAuth, requirePermission } from "@/lib/auth";
import { getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

// NOTE: intentionally only requires being logged in (not the granular
// "classes.view" permission). Many pages — Attendance, Submit Scores, Fees,
// Students — need the class list purely as helper/dropdown data, and the
// results are already correctly scoped to what a teacher is allowed to see
// (via getTeacherScope). Requiring a separate "classes.view" permission on
// top of the page's own permission (e.g. "attendance.view") just creates
// confusing dead-ends where an admin forgets to also grant it.
export async function GET() {
  const user = await getSessionUser();
  const err = requireAuth(user);
  if (err) return err;

  try {
    const scope = await getTeacherScope(user);

    let all: (typeof classes.$inferSelect)[];
    if (scope.scoped) {
      if (scope.classIds.length === 0) {
        return Response.json([]);
      }
      // scope.classIds already contains exactly this teacher's assigned class
      // IDs (deduplicated) — query classes directly, no join needed. (A join
      // against teacherClasses filtered only by classId would incorrectly
      // return one duplicate row per *other* teacher also assigned to the
      // same class.)
      all = await db
        .select()
        .from(classes)
        .where(inArray(classes.id, scope.classIds))
        .orderBy(asc(classes.name));
    } else {
      all = await db.select().from(classes).orderBy(asc(classes.name));
    }

    const counts = await db
      .select({ classId: students.classId, n: count() })
      .from(students)
      .groupBy(students.classId);
    const map = new Map(counts.map((c) => [c.classId, c.n]));
    return Response.json(
      all.map((c) => ({ ...c, studentCount: c.id !== null ? (map.get(c.id) ?? 0) : 0 })),
    );
  } catch (e) {
    return dbErrorResponse(e, "load classes");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "classes.manage");
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Class name is required." }, { status: 400 });
  }
  const [row] = await db
    .insert(classes)
    .values({
      name: body.name.trim(),
      section: typeof body.section === "string" ? body.section.trim() : "",
      capacity: Math.max(1, Number(body.capacity) || 40),
    })
    .returning();
  return Response.json({ ...row, studentCount: 0 }, { status: 201 });
}
