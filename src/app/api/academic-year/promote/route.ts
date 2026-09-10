import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { academicYears, alumni, classes, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, hasPermission, requireAuth } from "@/lib/auth";
import { getFormLevel } from "../preview-promotion/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const canManage =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "year.manage");

  if (!canManage) {
    return Response.json({ error: "Permission denied." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid data." }, { status: 400 });

  const fromYear = typeof body.fromYear === "string" ? body.fromYear.trim() : "";
  const toYear = typeof body.toYear === "string" ? body.toYear.trim() : "";
  const targetClassId = body.classId && body.classId !== "all" ? Number(body.classId) : null;

  if (!fromYear || !toYear) {
    return Response.json({ error: "From Year and To Year are required (e.g. 2026 to 2027)." }, { status: 400 });
  }

  try {
    const allClasses = await db.select().from(classes).orderBy(asc(classes.id));

    // Determine max level (e.g. 4)
    let maxLevel = 4;
    for (const c of allClasses) {
      const lvl = getFormLevel(c.name);
      if (lvl !== null && lvl > maxLevel) maxLevel = lvl;
    }

    // Determine promotion plan for each class
    // Order from HIGHEST level to LOWEST level (e.g. Form 4 -> Form 3 -> Form 2 -> Form 1)
    const promotionPlan: {
      fromClass: typeof classes.$inferSelect;
      toClass: typeof classes.$inferSelect | null;
      isGraduating: boolean;
    }[] = [];

    const candidateClasses = targetClassId
      ? allClasses.filter((c) => c.id === targetClassId)
      : allClasses;

    for (const c of candidateClasses) {
      const lvl = getFormLevel(c.name);
      if (lvl === null) continue;

      if (lvl >= maxLevel) {
        // Form 4 -> Graduating!
        promotionPlan.push({
          fromClass: c,
          toClass: null,
          isGraduating: true,
        });
      } else {
        const nextLevel = lvl + 1;
        const targetNext =
          allClasses.find((tc) => getFormLevel(tc.name) === nextLevel && tc.section === c.section) ||
          allClasses.find((tc) => getFormLevel(tc.name) === nextLevel);

        if (targetNext) {
          promotionPlan.push({
            fromClass: c,
            toClass: targetNext,
            isGraduating: false,
          });
        }
      }
    }

    // Sort: Graduating (highest level) first, then descending by form level
    promotionPlan.sort((a, b) => {
      const la = getFormLevel(a.fromClass.name) ?? 0;
      const lb = getFormLevel(b.fromClass.name) ?? 0;
      return lb - la; // Descending!
    });

    let totalGraduated = 0;
    let totalPromoted = 0;

    await db.transaction(async (tx) => {
      for (const step of promotionPlan) {
        if (step.isGraduating) {
          // 1. Fetch all students in Form 4
          const graduatingStudents = await tx
            .select()
            .from(students)
            .where(eq(students.classId, step.fromClass.id));

          if (graduatingStudents.length > 0) {
            // 2. Insert into alumni archive
            const alumniRows = graduatingStudents.map((s) => ({
              studentId: s.id,
              admissionNo: s.admissionNo,
              name: s.name,
              gender: s.gender,
              previousClassId: step.fromClass.id,
              previousClassName: `${step.fromClass.name}${step.fromClass.section ? ` (${step.fromClass.section})` : ""}`,
              graduatedYear: fromYear,
            }));

            await tx.insert(alumni).values(alumniRows);

            // 3. Mark students classId as null so they leave the active school roster
            await tx
              .update(students)
              .set({ classId: null })
              .where(eq(students.classId, step.fromClass.id));

            totalGraduated += graduatingStudents.length;
          }
        } else if (step.toClass) {
          // Promote students up one form level
          const movingStudents = await tx
            .select({ id: students.id })
            .from(students)
            .where(eq(students.classId, step.fromClass.id));

          if (movingStudents.length > 0) {
            await tx
              .update(students)
              .set({ classId: step.toClass.id })
              .where(eq(students.classId, step.fromClass.id));

            totalPromoted += movingStudents.length;
          }
        }
      }

      // 4. Update academic_years
      // Ensure toYear exists and is active
      const [existingToYear] = await tx
        .select()
        .from(academicYears)
        .where(eq(academicYears.year, toYear))
        .limit(1);

      await tx.update(academicYears).set({ isActive: false });

      if (existingToYear) {
        await tx
          .update(academicYears)
          .set({ isActive: true })
          .where(eq(academicYears.year, toYear));
      } else {
        await tx.insert(academicYears).values({
          year: toYear,
          isActive: true,
          studentsArchived: 0,
        });
      }

      // Update archived count on fromYear
      if (totalGraduated > 0) {
        await tx
          .update(academicYears)
          .set({ studentsArchived: sql`${academicYears.studentsArchived} + ${totalGraduated}` })
          .where(eq(academicYears.year, fromYear));
      }
    });

    return Response.json({
      ok: true,
      promotedCount: totalPromoted,
      graduatedCount: totalGraduated,
      fromYear,
      toYear,
    });
  } catch (e) {
    return dbErrorResponse(e, "execute student promotion");
  }
}
