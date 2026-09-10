import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, teacherClasses, teacherSubjectClasses, teachers, users } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { createMemberAccount, getSessionUser, requireAuth } from "@/lib/auth";
import { ROLE_PRESETS } from "@/lib/permissions";
import { teacherSelect } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const err = requireAuth(user);
  if (err) return err;

  try {
    const rows = await db
      .select(teacherSelect())
      .from(teachers)
      .leftJoin(users, eq(teachers.userId, users.id))
      .orderBy(asc(teachers.name));

    // Count distinct subjects and classes assigned to each teacher via teacher_subject_classes (or fallback to teacher_classes)
    const tscRows = await db
      .select({
        teacherId: teacherSubjectClasses.teacherId,
        subjectId: teacherSubjectClasses.subjectId,
        classId: teacherSubjectClasses.classId,
      })
      .from(teacherSubjectClasses);

    const tcRows = await db
      .select({
        teacherId: teacherClasses.teacherId,
        classId: teacherClasses.classId,
      })
      .from(teacherClasses);

    const teacherSubjSet = new Map<number, Set<number>>();
    const teacherClassSet = new Map<number, Set<number>>();

    for (const r of tscRows) {
      if (!teacherSubjSet.has(r.teacherId)) teacherSubjSet.set(r.teacherId, new Set());
      teacherSubjSet.get(r.teacherId)!.add(r.subjectId);

      if (!teacherClassSet.has(r.teacherId)) teacherClassSet.set(r.teacherId, new Set());
      teacherClassSet.get(r.teacherId)!.add(r.classId);
    }

    for (const r of tcRows) {
      if (!teacherClassSet.has(r.teacherId)) teacherClassSet.set(r.teacherId, new Set());
      teacherClassSet.get(r.teacherId)!.add(r.classId);
    }

    const isAdmin = user!.role === "admin";
    return Response.json(
      rows.map((r) => ({
        ...r,
        hasAccount: r.userId !== null,
        // Only the admin may see the stored raw password
        rawPassword: isAdmin ? r.rawPassword : null,
        subjectCount: teacherSubjSet.get(r.id)?.size ?? 0,
        classCount: teacherClassSet.get(r.id)?.size ?? 0,
      })),
    );
  } catch (e) {
    return dbErrorResponse(e, "load teachers");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requireAuth(user);
  if (err) return err;
  if (user!.role !== "admin") {
    return Response.json({ error: "Only the admin can add teachers." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Teacher name is required." }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!username) {
    return Response.json({ error: "Username (Check Number) is required." }, { status: 400 });
  }

  const staffRoleKey: keyof typeof ROLE_PRESETS =
    typeof body.staffRole === "string" && body.staffRole in ROLE_PRESETS
      ? (body.staffRole as keyof typeof ROLE_PRESETS)
      : "teacher";

  // 1) Create the login account (default password + must change on first login)
  const account = await createMemberAccount({
    name: body.name,
    username,
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : undefined,
    permissions: Array.isArray(body.permissions)
      ? body.permissions
      : [...ROLE_PRESETS[staffRoleKey].permissions],
    staffRole: staffRoleKey,
  });
  if ("error" in account) {
    return Response.json({ error: account.error }, { status: account.status });
  }

  // 2) Create the teacher profile linked to that account
  const [row] = await db
    .insert(teachers)
    .values({
      userId: account.id,
      name: body.name.trim(),
      email: typeof body.email === "string" ? body.email.trim() : "",
      phone: typeof body.phone === "string" ? body.phone.trim() : "",
      subject: typeof body.subject === "string" ? body.subject.trim() : "",
      qualification: typeof body.qualification === "string" ? body.qualification.trim() : "",
      hireDate: typeof body.hireDate === "string" && body.hireDate ? body.hireDate : null,
    })
    .returning();

  return Response.json(
    {
      ...row,
      username: account.username,
      rawPassword: account.rawPassword,
      mustChangePassword: true,
      accountActive: true,
      hasAccount: true,
    },
    { status: 201 },
  );
}
