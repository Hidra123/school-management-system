import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, teachers } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      code: subjects.code,
      teacherId: subjects.teacherId,
      teacherName: teachers.name,
      createdAt: subjects.createdAt,
    })
    .from(subjects)
    .leftJoin(teachers, eq(subjects.teacherId, teachers.id))
    .orderBy(asc(subjects.name));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Subject name is required." }, { status: 400 });
  }
  const teacherId =
    body.teacherId === "" || body.teacherId === null || body.teacherId === undefined
      ? null
      : Number(body.teacherId);
  const [row] = await db
    .insert(subjects)
    .values({
      name: body.name.trim(),
      code: typeof body.code === "string" ? body.code.trim().toUpperCase() : "",
      teacherId: Number.isFinite(teacherId) ? teacherId : null,
    })
    .returning();
  return Response.json({ ...row, teacherName: null }, { status: 201 });
}
