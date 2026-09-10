import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { academicYears, alumni, classes, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, hasPermission, requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const canAccess =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "year.manage");

  if (!canAccess) {
    return Response.json({ error: "You do not have permission for this action." }, { status: 403 });
  }

  try {
    const years = await db.select().from(academicYears).orderBy(desc(academicYears.year));

    // Ensure at least 2026 exists
    let activeYear = "2026";
    const activeRow = years.find((y) => y.isActive);
    if (activeRow) {
      activeYear = activeRow.year;
    } else if (years.length === 0) {
      const [inserted] = await db
        .insert(academicYears)
        .values({ year: "2026", isActive: true, studentsArchived: 0 })
        .returning();
      years.push(inserted);
      activeYear = "2026";
    }

    const allClasses = await db.select().from(classes);
    const alumniRows = await db.select({ id: alumni.id }).from(alumni);

    return Response.json({
      activeYear,
      years,
      classes: allClasses,
      totalAlumni: alumniRows.length,
    });
  } catch (e) {
    return dbErrorResponse(e, "load academic years");
  }
}

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
  if (!body || typeof body.action !== "string") {
    return Response.json({ error: "Action is required." }, { status: 400 });
  }

  try {
    // 1. Create a new year
    if (body.action === "create_year") {
      const yearStr = typeof body.year === "string" ? body.year.trim() : "";
      if (!yearStr) {
        return Response.json({ error: "Year is required (e.g. 2027)." }, { status: 400 });
      }

      const [existing] = await db.select().from(academicYears).where(eq(academicYears.year, yearStr)).limit(1);
      if (existing) {
        return Response.json({ error: `Academic Year ${yearStr} already exists.` }, { status: 409 });
      }

      const [created] = await db
        .insert(academicYears)
        .values({
          year: yearStr,
          isActive: false,
          studentsArchived: 0,
        })
        .returning();

      return Response.json({ ok: true, year: created }, { status: 201 });
    }

    // 2. Activate a year
    if (body.action === "activate_year") {
      const yearStr = typeof body.year === "string" ? body.year.trim() : "";
      if (!yearStr) {
        return Response.json({ error: "Year is required." }, { status: 400 });
      }

      await db.transaction(async (tx) => {
        // Deactivate all
        await tx.update(academicYears).set({ isActive: false });
        // Activate chosen one
        const [updated] = await tx
          .update(academicYears)
          .set({ isActive: true })
          .where(eq(academicYears.year, yearStr))
          .returning();

        if (!updated) {
          // If not in table, insert it as active
          await tx.insert(academicYears).values({ year: yearStr, isActive: true, studentsArchived: 0 });
        }
      });

      return Response.json({ ok: true, activeYear: yearStr });
    }

    // 3. Delete an empty inactive year
    if (body.action === "delete_year") {
      const yearStr = typeof body.year === "string" ? body.year.trim() : "";
      const [existing] = await db.select().from(academicYears).where(eq(academicYears.year, yearStr)).limit(1);
      if (!existing) {
        return Response.json({ error: "Academic year not found." }, { status: 404 });
      }
      if (existing.isActive) {
        return Response.json({ error: "Cannot delete the active academic year." }, { status: 400 });
      }

      await db.delete(academicYears).where(eq(academicYears.year, yearStr));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return dbErrorResponse(e, "manage academic year");
  }
}
