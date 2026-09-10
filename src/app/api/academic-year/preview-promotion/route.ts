import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, hasPermission, requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export type PromotionStep = {
  fromClassId: number;
  fromClassName: string;
  fromClassSection: string;
  toClassId: number | null;
  toClassName: string;
  studentCount: number;
  isGraduating: boolean;
};

/** Parse form level number from a class name, e.g. "Form 1" -> 1, "Form 4" -> 4 */
export function getFormLevel(className: string): number | null {
  const match = className.match(/Form\s*(\d+)/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const canAccess =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "year.manage");

  if (!canAccess) {
    return Response.json({ error: "Permission denied." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const targetClassId = body?.classId && body.classId !== "all" ? Number(body.classId) : null;

  try {
    const allClasses = await db.select().from(classes).orderBy(asc(classes.id));

    // Find highest form level in the school (usually 4)
    let maxLevel = 4;
    for (const c of allClasses) {
      const lvl = getFormLevel(c.name);
      if (lvl !== null && lvl > maxLevel) maxLevel = lvl;
    }

    // Student counts per class
    const studentCounts = await db
      .select({
        classId: students.classId,
        count: sql<number>`count(${students.id})::int`,
      })
      .from(students)
      .where(sql`${students.classId} IS NOT NULL`)
      .groupBy(students.classId);

    const countMap = new Map(studentCounts.map((s) => [s.classId, s.count]));

    const filteredClasses = targetClassId
      ? allClasses.filter((c) => c.id === targetClassId)
      : allClasses;

    const preview: PromotionStep[] = [];
    let totalStudents = 0;
    let totalGraduating = 0;

    for (const c of filteredClasses) {
      const currentLevel = getFormLevel(c.name);
      const studentCount = countMap.get(c.id) ?? 0;
      totalStudents += studentCount;

      if (currentLevel === null) {
        // Unknown custom class name
        preview.push({
          fromClassId: c.id,
          fromClassName: c.name,
          fromClassSection: c.section,
          toClassId: null,
          toClassName: "Manual Assignment Required",
          studentCount,
          isGraduating: false,
        });
        continue;
      }

      if (currentLevel >= maxLevel) {
        // Highest level (e.g. Form 4) -> Graduating to Alumni!
        totalGraduating += studentCount;
        preview.push({
          fromClassId: c.id,
          fromClassName: c.name,
          fromClassSection: c.section,
          toClassId: null,
          toClassName: "Graduated (Alumni Archive)",
          studentCount,
          isGraduating: true,
        });
      } else {
        const nextLevel = currentLevel + 1;
        // Find next class with matching section if possible, otherwise next level class
        const targetNext =
          allClasses.find((tc) => getFormLevel(tc.name) === nextLevel && tc.section === c.section) ||
          allClasses.find((tc) => getFormLevel(tc.name) === nextLevel);

        preview.push({
          fromClassId: c.id,
          fromClassName: c.name,
          fromClassSection: c.section,
          toClassId: targetNext?.id ?? null,
          toClassName: targetNext ? `${targetNext.name}${targetNext.section ? ` (${targetNext.section})` : ""}` : `Form ${nextLevel}`,
          studentCount,
          isGraduating: false,
        });
      }
    }

    return Response.json({
      preview,
      totalStudents,
      totalGraduating,
      totalPromoted: totalStudents - totalGraduating,
    });
  } catch (e) {
    return dbErrorResponse(e, "calculate promotion preview");
  }
}
