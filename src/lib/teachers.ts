import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, teacherClasses, teacherSubjectClasses, teachers, users } from "@/db/schema";
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

/**
 * Subject IDs a teacher teaches, from BOTH sources:
 *  - the authoritative subject×class assignment matrix (teacher_subject_classes)
 *  - the legacy single-owner subjects.teacherId (kept as backward-compat)
 * Two teachers may share the same subject NAME for different classes — the
 * matrix allows that while the legacy column can only name one owner.
 */
export async function getAssignedSubjectIds(teacherId: number): Promise<number[]> {
  const legacy = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.teacherId, teacherId));
  const matrix = await db
    .select({ subjectId: teacherSubjectClasses.subjectId })
    .from(teacherSubjectClasses)
    .where(eq(teacherSubjectClasses.teacherId, teacherId));
  return Array.from(new Set([...legacy.map((r) => r.id), ...matrix.map((r) => r.subjectId)]));
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

export type TeacherScopeOptions = {
  /**
   * When true, the Academic Master is treated like any other teacher and is
   * scoped to THEIR OWN assigned classes/subjects. Used by Submit Scores
   * (/grades) — the Academic Master admits students to ANY class (see
   * getTeacherScope without this flag) but may only submit scores for the
   * classes the admin has assigned to them.
   * Default behaviour (no flag): Academic Master is a school-wide role and
   * sees ALL classes/subjects/students.
   */
  strictForAcademicMaster?: boolean;
};

export async function getTeacherScope(
  user: SessionUser | null,
  opts: TeacherScopeOptions = {},
): Promise<TeacherScope> {
  if (!user || user.role === "admin") return { scoped: false, teacherId: null, classIds: [], subjectIds: [] };
  // Academic Master is a school-wide role (like a deputy/vice-principal for
  // academics) — even though they get a `teachers` profile row (so they can
  // also appear in Manage Teachers), they must NEVER be scoped to specific
  // classes/subjects. Without this check, a newly-created Academic Master
  // with no class/subject assignments would see literally nothing, instead
  // of everything, which defeats the purpose of the role.
  if (user.staffRole === "academic_master" && !opts.strictForAcademicMaster) {
    return { scoped: false, teacherId: null, classIds: [], subjectIds: [] };
  }
  const teacher = await getTeacherByUserId(user.id);
  if (!teacher) {
    // Strict mode must NEVER fall through to "see everything": a strictly
    // scoped user with no teacher profile (e.g. an Academic Master who was
    // never given one) sees NOTHING until the admin assigns them.
    if (opts.strictForAcademicMaster) return { scoped: true, teacherId: null, classIds: [], subjectIds: [] };
    return { scoped: false, teacherId: null, classIds: [], subjectIds: [] };
  }
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
