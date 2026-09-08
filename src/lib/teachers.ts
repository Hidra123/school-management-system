import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, teacherClasses, teachers, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";

/** Columns returned for a teacher joined with their login account. */
export function teacherSelect() {
  return {
    id: teachers.id,
    userId: teachers.userId,
    name: teachers.name,
    email: teachers.email,
    phone: teachers.phone,
    subject: teachers.subject,
    qualification: teachers.qualification,
    hireDate: teachers.hireDate,
    createdAt: teachers.createdAt,
    username: users.username,
    rawPassword: users.rawPassword,
    mustChangePassword: users.mustChangePassword,
    accountActive: users.active,
  };
}

/** Find the teacher profile linked to a logged-in user (null if the user is not a teacher). */
export async function getTeacherByUserId(userId: number) {
  const [row] = await db.select().from(teachers).where(eq(teachers.userId, userId)).limit(1);
  return row ?? null;
}

/** Class IDs a teacher is assigned to (deduplicated — defense in depth). */
export async function getAssignedClassIds(teacherId: number): Promise<number[]> {
  const rows = await db
    .select({ classId: teacherClasses.classId })
    .from(teacherClasses)
    .where(eq(teacherClasses.teacherId, teacherId));
  return Array.from(new Set(rows.map((r) => r.classId)));
}

/** Subject IDs a teacher is assigned to teach (subjects.teacherId, deduplicated). */
export async function getAssignedSubjectIds(teacherId: number): Promise<number[]> {
  const rows = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.teacherId, teacherId));
  return Array.from(new Set(rows.map((r) => r.id)));
}

/**
 * Scope info for the current session user: for members who have a linked
 * teacher profile, returns the set of class IDs / fact they are scoped.
 * Admins and non-teaching staff (no linked teacher profile) are unscoped.
 */
export type TeacherScope = {
  scoped: boolean;
  teacherId: number | null;
  classIds: number[];
  subjectIds: number[];
};

export async function getTeacherScope(user: SessionUser | null): Promise<TeacherScope> {
  if (!user || user.role === "admin") return { scoped: false, teacherId: null, classIds: [], subjectIds: [] };
  // Academic Master is a school-wide role (like a deputy/vice-principal for
  // academics) — even though they get a `teachers` profile row (so they can
  // also appear in Manage Teachers), they must NEVER be scoped to specific
  // classes/subjects. Without this check, a newly-created Academic Master
  // with no class/subject assignments would see literally nothing, instead
  // of everything, which defeats the purpose of the role.
  if (user.staffRole === "academic_master") {
    return { scoped: false, teacherId: null, classIds: [], subjectIds: [] };
  }
  const teacher = await getTeacherByUserId(user.id);
  if (!teacher) return { scoped: false, teacherId: null, classIds: [], subjectIds: [] };
  const [classIds, subjectIds] = await Promise.all([
    getAssignedClassIds(teacher.id),
    getAssignedSubjectIds(teacher.id),
  ]);
  return { scoped: true, teacherId: teacher.id, classIds, subjectIds };
}

/** True if a class id is allowed for a scoped teacher (always true when unscoped). */
export function classAllowed(scope: TeacherScope, classId: number | null | undefined): boolean {
  if (!scope.scoped) return true;
  if (classId === null || classId === undefined) return false;
  return scope.classIds.includes(classId);
}

/** True if a subject id is allowed for a scoped teacher (always true when unscoped). */
export function subjectAllowed(scope: TeacherScope, subjectId: number | null | undefined): boolean {
  if (!scope.scoped) return true;
  if (subjectId === null || subjectId === undefined) return false;
  return scope.subjectIds.includes(subjectId);
}
