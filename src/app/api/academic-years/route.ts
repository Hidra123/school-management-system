import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { academicYears, alumni } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requireAnyPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

function allowed(user: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions.includes("students.edit");
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  if (!allowed(user)) return Response.json({ error: "You do not have permission for this action." }, { status: 403 });

  try {
    const mode = new URL(req.url).searchParams.get("mode");
    if (mode === "alumni") {
      const year = new URL(req.url).searchParams.get("year");
      const rows = year
        ? await db.select().from(alumni).where(eq(alumni.graduatedYear, year)).orderBy(asc(alumni.name))
        : await db.select().from(alumni).orderBy(desc(alumni.graduatedYear), asc(alumni.name)).limit(400);
      return Response.json(rows);
    }

    const years = await db.select().from(academicYears).orderBy(desc(academicYears.year));
    const counts = await db.select({ graduatedYear: alumni.graduatedYear }).from(alumni);
    const byYear = new Map<string, number>();
    for (const c of counts) byYear.set(c.graduatedYear, (byYear.get(c.graduatedYear) ?? 0) + 1);
    return Response.json(
      years.map((y) => ({ ...y, studentsArchived: byYear.get(y.year) ?? 0 })),
    );
  } catch (e) {
    return dbErrorResponse(e, "load academic years");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  if (!allowed(user)) return Response.json({ error: "You do not have permission for this action." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const year = typeof body?.year === "string" ? body.year.trim() : "";
  if (!year || !/^\d{4}$/.test(year)) {
    return Response.json({ error: "Year is required (e.g. 2027)." }, { status: 400 });
  }

  try {
    const [row] = await db.insert(academicYears).values({ year, isActive: false }).returning();
    return Response.json(row, { status: 201 });
  } catch {
    return Response.json({ error: `Academic year ${year} already exists.` }, { status: 409 });
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Not authenticated." }, { status: 401 });
  if (!allowed(user)) return Response.json({ error: "You do not have permission for this action." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  const activate = body?.activate === true;
  if (!Number.isInteger(id) || !activate) {
    return Response.json({ error: "id and activate=true are required." }, { status: 400 });
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(academicYears).set({ isActive: false });
      await tx.update(academicYears).set({ isActive: true }).where(eq(academicYears.id, id));
    });
    return Response.json({ ok: true });
  } catch (e) {
    return dbErrorResponse(e, "activate the academic year");
  }
}
