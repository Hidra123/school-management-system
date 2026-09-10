import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { alumni } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, hasPermission, requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

  try {
    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const q = url.searchParams.get("q")?.trim() ?? "";

    const conditions = [];
    if (year && year !== "all") {
      conditions.push(eq(alumni.graduatedYear, year));
    }
    if (q) {
      conditions.push(
        or(
          ilike(alumni.name, `%${q}%`),
          ilike(alumni.admissionNo, `%${q}%`),
          ilike(alumni.previousClassName, `%${q}%`),
        ),
      );
    }

    const rows = await db
      .select({
        id: alumni.id,
        studentId: alumni.studentId,
        admissionNo: alumni.admissionNo,
        name: alumni.name,
        gender: alumni.gender,
        previousClassId: alumni.previousClassId,
        previousClassName: alumni.previousClassName,
        graduatedYear: alumni.graduatedYear,
        createdAt: alumni.createdAt,
      })
      .from(alumni)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(alumni.graduatedYear), desc(alumni.createdAt))
      .limit(300);

    return Response.json({ alumni: rows });
  } catch (e) {
    return dbErrorResponse(e, "load alumni archive");
  }
}
