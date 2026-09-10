import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  teacherSubjectClasses,
  teachers,
  userPermissions,
  users,
} from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import {
  createPasswordHash,
  DEFAULT_MEMBER_PASSWORD,
  getSessionUser,
  requireAdmin,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  try {
    // 1. All member accounts
    const staffUsers = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        rawPassword: users.rawPassword,
        role: users.role,
        active: users.active,
        mustChangePassword: users.mustChangePassword,
        staffRole: users.staffRole,
        createdAt: users.createdAt,
        teacherId: teachers.id,
        teacherName: teachers.name,
        teacherPhone: teachers.phone,
        teacherSubject: teachers.subject,
        teacherQualification: teachers.qualification,
      })
      .from(users)
      .leftJoin(teachers, eq(teachers.userId, users.id))
      .where(eq(users.role, "member"))
      .orderBy(asc(users.name));

    // 2. Count permissions per user
    const permCounts = await db
      .select({
        userId: userPermissions.userId,
        count: sql<number>`count(${userPermissions.id})::int`,
      })
      .from(userPermissions)
      .groupBy(userPermissions.userId);
    const permMap = new Map(permCounts.map((p) => [p.userId, p.count]));

    // 3. Count workload per teacher
    const tscCounts = await db
      .select({
        teacherId: teacherSubjectClasses.teacherId,
        classesCount: sql<number>`count(distinct ${teacherSubjectClasses.classId})::int`,
        subjectsCount: sql<number>`count(distinct ${teacherSubjectClasses.subjectId})::int`,
      })
      .from(teacherSubjectClasses)
      .groupBy(teacherSubjectClasses.teacherId);
    const workloadMap = new Map(
      tscCounts.map((w) => [
        w.teacherId,
        { classes: w.classesCount, subjects: w.subjectsCount },
      ]),
    );

    const staffList = staffUsers.map((u) => {
      const wl = u.teacherId ? workloadMap.get(u.teacherId) : null;
      return {
        ...u,
        permissionsCount: permMap.get(u.id) ?? 0,
        assignedClassesCount: wl?.classes ?? 0,
        assignedSubjectsCount: wl?.subjects ?? 0,
      };
    });

    const totalStaff = staffList.length;
    const activeStaff = staffList.filter((s) => s.active).length;
    const deactivatedStaff = totalStaff - activeStaff;
    const mustChangePasswordCount = staffList.filter((s) => s.mustChangePassword).length;

    return Response.json({
      staff: staffList,
      summary: {
        totalStaff,
        activeStaff,
        deactivatedStaff,
        mustChangePasswordCount,
        isAllActive: totalStaff > 0 && activeStaff === totalStaff,
        isAllDisabled: totalStaff > 0 && activeStaff === 0,
      },
    });
  } catch (e) {
    return dbErrorResponse(e, "load staff monitoring data");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return Response.json({ error: "Action is required." }, { status: 400 });
  }

  try {
    // Action 1: System-wide lockdown (Disable all member accounts)
    if (body.action === "disable_all") {
      await db
        .update(users)
        .set({ active: false })
        .where(eq(users.role, "member"));
      return Response.json({ ok: true, message: "All member accounts have been disabled." });
    }

    // Action 2: Enable all member accounts
    if (body.action === "enable_all") {
      await db
        .update(users)
        .set({ active: true })
        .where(eq(users.role, "member"));
      return Response.json({ ok: true, message: "All member accounts have been enabled." });
    }

    // Action 3: Toggle single member account
    if (body.action === "toggle_user") {
      const userId = Number(body.userId);
      const active = Boolean(body.active);
      if (!Number.isInteger(userId)) {
        return Response.json({ error: "Invalid userId." }, { status: 400 });
      }
      const [updated] = await db
        .update(users)
        .set({ active })
        .where(and(eq(users.id, userId), eq(users.role, "member")))
        .returning();
      if (!updated) {
        return Response.json({ error: "User not found or is an administrator." }, { status: 404 });
      }
      return Response.json({ ok: true, user: updated });
    }

    // Action 4: Reset member password to default
    if (body.action === "reset_password") {
      const userId = Number(body.userId);
      if (!Number.isInteger(userId)) {
        return Response.json({ error: "Invalid userId." }, { status: 400 });
      }
      const hash = await createPasswordHash(DEFAULT_MEMBER_PASSWORD);
      const [updated] = await db
        .update(users)
        .set({
          password: hash,
          rawPassword: DEFAULT_MEMBER_PASSWORD,
          mustChangePassword: true,
        })
        .where(and(eq(users.id, userId), eq(users.role, "member")))
        .returning();
      if (!updated) {
        return Response.json({ error: "User not found or is an administrator." }, { status: 404 });
      }
      return Response.json({ ok: true, user: updated });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return dbErrorResponse(e, "execute monitoring action");
  }
}
