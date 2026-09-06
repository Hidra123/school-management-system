import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, students } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const all = await db.select().from(classes).orderBy(asc(classes.name));
  const counts = await db
    .select({ classId: students.classId, n: count() })
    .from(students)
    .groupBy(students.classId);
  const map = new Map(counts.map((c) => [c.classId, c.n]));
  return Response.json(
    all.map((c) => ({ ...c, studentCount: c.id !== null ? (map.get(c.id) ?? 0) : 0 })),
  );
}

export async function POST(req: Request) {
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
