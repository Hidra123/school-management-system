import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, examClasses, exams } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Lightweight, teacher-facing list of ACTIVE examinations (id/name/classIds
 * only) — used by the Submit Scores page so any teacher with grades.submit
 * can pick which exam they're entering scores for, without needing the
 * full "exams.view"/"exams.manage" permission (which is reserved for the
 * Academic Master's Manage Examinations module).
 */
export async function GET() {
  const user = await getSessionUser();
  const err = requireAuth(user);
  if (err) return err;

  try {
    const activeExams = await db.select().from(exams).where(and(eq(exams.status, "active"), eq(exams.approvalStatus, "approved"))).orderBy(asc(exams.startDate));
    const links = await db
      .select({ examId: examClasses.examId, classId: examClasses.classId, className: classes.name })
      .from(examClasses)
      .innerJoin(classes, eq(examClasses.classId, classes.id));

    const classMap = new Map<number, number[]>();
    for (const l of links) {
      if (!classMap.has(l.examId)) classMap.set(l.examId, []);
      classMap.get(l.examId)!.push(l.classId);
    }

    return Response.json(
      activeExams.map((e) => ({
        id: e.id,
        name: e.name,
        examType: e.examType,
        academicYear: e.academicYear,
        classIds: classMap.get(e.id) ?? [],
        appliesToAllClasses: !classMap.has(e.id),
      })),
    );
  } catch (e) {
    return dbErrorResponse(e, "load active examinations");
  }
}
