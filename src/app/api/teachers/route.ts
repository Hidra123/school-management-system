import { asc } from "drizzle-orm";
import { db } from "@/db";
import { teachers } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(teachers).orderBy(asc(teachers.name));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Teacher name is required." }, { status: 400 });
  }
  const [row] = await db
    .insert(teachers)
    .values({
      name: body.name.trim(),
      email: typeof body.email === "string" ? body.email.trim() : "",
      phone: typeof body.phone === "string" ? body.phone.trim() : "",
      subject: typeof body.subject === "string" ? body.subject.trim() : "",
      qualification: typeof body.qualification === "string" ? body.qualification.trim() : "",
      hireDate: typeof body.hireDate === "string" && body.hireDate ? body.hireDate : null,
    })
    .returning();
  return Response.json(row, { status: 201 });
}
