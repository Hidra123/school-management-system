import { asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, teacherClasses } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const err = requirePermission(user, "classes.view");
  if (err) return err;

  try {
    const scope = await getTeacherScope(user);

    let all: (typeof classes.$inferSelect)[];
    if (scope.scoped) {
      if (scope.classIds.length === 0) {
        return Response.json([]);
      }
      all = await db
        .select({
          id: classes.id,
          name: classes.name,
          section: classes.section,
          capacity: classes.capacity,
          createdAt: classes.createdAt,
        })
        .from(classes)
        .innerJoin(teacherClasses, eq(teacherClasses.classId, classes.id))
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
