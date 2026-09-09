import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, teachers } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requireAuth, requirePermission } from "@/lib/auth";
import { getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

// NOTE: intentionally only requires being logged in (not the granular
// "subjects.view" permission) — see the matching comment in
// src/app/api/classes/route.ts for the rationale.
//
// ?strict=1 → Academic Master included: only THEIR assigned subjects are
// returned (used by Submit Scores — see /api/classes for the full story).
export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requireAuth(user);
  if (err) return err;

  try {
    const strict = new URL(req.url).searchParams.get("strict") === "1";
    const scope = await getTeacherScope(user, { strictForAcademicMaster: strict });

    const query = db
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

    // A strictly-scoped user with no teacher profile sees no subjects —
    // never "all" (defense in depth for strict mode).
    if (scope.scoped && scope.teacherId === null) return Response.json([]);

    const rows = scope.scoped
      ? await query.where(eq(subjects.teacherId, scope.teacherId!))
      : await query;

    return Response.json(rows);
  } catch (e) {
    return dbErrorResponse(e, "load subjects");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "subjects.manage");
  if (err) return err;

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
