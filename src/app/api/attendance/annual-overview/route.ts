import { and, asc, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classes } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Days-recorded-per-class summary for a whole year — one row per class. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "attendance.trackall");
  if (err) return err;

  try {
    const url = new URL(req.url);
    const year = Number(url.searchParams.get("year"));
    if (!Number.isFinite(year)) return Response.json({ error: "year is required." }, { status: 400 });

    const allClasses = await db.select().from(classes).orderBy(asc(classes.name));

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const rows = await db
      .select({ classId: attendance.classId, date: attendance.date, status: attendance.status })
      .from(attendance)
      .where(and(gte(attendance.date, startDate), lte(attendance.date, endDate)));

    const perClass = new Map<number, { dates: Set<string>; present: number; late: number; total: number }>();
    for (const c of allClasses) perClass.set(c.id, { dates: new Set(), present: 0, late: 0, total: 0 });
    for (const r of rows) {
      const bucket = perClass.get(r.classId);
      if (!bucket) continue;
      bucket.dates.add(r.date);
      bucket.total++;
      if (r.status === "present") bucket.present++;
      else if (r.status === "late") bucket.late++;
    }

    const result = allClasses.map((c) => {
      const bucket = perClass.get(c.id)!;
      const rate = bucket.total > 0 ? Math.round(((bucket.present + bucket.late) / bucket.total) * 100) : 0;
      return { classId: c.id, className: c.name, daysRecorded: bucket.dates.size, rate };
    });

    return Response.json({ year, classes: result });
  } catch (e) {
    return dbErrorResponse(e, "load the annual days-recorded overview");
  }
}
