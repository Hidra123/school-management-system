import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  classes,
  examClasses,
  exams,
  grades,
  studentExamRemarks,
  students,
} from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  try {
    const url = new URL(req.url);
    const admissionStatusFilter = url.searchParams.get("admissionStatus")?.trim();
    const classIdFilter = Number(url.searchParams.get("classId"));

    // 1. Students / Admissions
    const studentConditions = [];
    if (admissionStatusFilter && admissionStatusFilter !== "all") {
      studentConditions.push(eq(students.admissionStatus, admissionStatusFilter));
    }
    if (classIdFilter && Number.isInteger(classIdFilter)) {
      studentConditions.push(eq(students.classId, classIdFilter));
    }

    const studentRows = await db
      .select({
        id: students.id,
        name: students.name,
        admissionNo: students.admissionNo,
        gender: students.gender,
        classId: students.classId,
        className: classes.name,
        classSection: classes.section,
        guardianName: students.guardianName,
        guardianPhone: students.guardianPhone,
        guardianAddress: students.guardianAddress,
        enrollmentDate: students.enrollmentDate,
        admissionStatus: students.admissionStatus,
        createdAt: students.createdAt,
      })
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(studentConditions.length ? and(...studentConditions) : undefined)
      .orderBy(desc(students.createdAt))
      .limit(300);

    // 2. Examinations for approval / review
    const allExams = await db
      .select({
        id: exams.id,
        name: exams.name,
        examType: exams.examType,
        academicYear: exams.academicYear,
        startDate: exams.startDate,
        endDate: exams.endDate,
        remarks: exams.remarks,
        status: exams.status,
        createdAt: exams.createdAt,
      })
      .from(exams)
      .orderBy(desc(exams.createdAt));

    const examClassLinks = await db
      .select({
        examId: examClasses.examId,
        className: classes.name,
      })
      .from(examClasses)
      .innerJoin(classes, eq(examClasses.classId, classes.id));

    const examClassNames = new Map<number, string[]>();
    for (const l of examClassLinks) {
      if (!examClassNames.has(l.examId)) examClassNames.set(l.examId, []);
      examClassNames.get(l.examId)!.push(l.className);
    }

    const examScoresCount = await db
      .select({
        examId: grades.examId,
        count: sql<number>`count(${grades.id})::int`,
      })
      .from(grades)
      .groupBy(grades.examId);
    const scoreCountMap = new Map(examScoresCount.map((g) => [g.examId, g.count]));

    const enrichedExams = allExams.map((e) => ({
      ...e,
      classNames: examClassNames.get(e.id) ?? [],
      appliesToAllClasses: !examClassNames.has(e.id) || examClassNames.get(e.id)!.length === 0,
      scoresCount: scoreCountMap.get(e.id) ?? 0,
    }));

    // 3. Behavioural Assessments from Class Teachers (student_exam_remarks)
    const remarksRows = await db
      .select({
        id: studentExamRemarks.id,
        studentId: studentExamRemarks.studentId,
        studentName: students.name,
        studentAdmissionNo: students.admissionNo,
        studentGender: students.gender,
        classId: students.classId,
        className: classes.name,
        classSection: classes.section,
        examId: studentExamRemarks.examId,
        examName: exams.name,
        examType: exams.examType,
        academicYear: exams.academicYear,
        behaviorRatings: studentExamRemarks.behaviorRatings,
        academicComment: studentExamRemarks.academicComment,
        principalComment: studentExamRemarks.principalComment,
        academicMasterName: studentExamRemarks.academicMasterName,
        headmasterName: studentExamRemarks.headmasterName,
        isApproved: studentExamRemarks.isApproved,
        updatedAt: studentExamRemarks.updatedAt,
      })
      .from(studentExamRemarks)
      .innerJoin(students, eq(studentExamRemarks.studentId, students.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .leftJoin(exams, eq(studentExamRemarks.examId, exams.id))
      .orderBy(desc(studentExamRemarks.updatedAt))
      .limit(300);

    // Check student scores count per student/exam
    const studentExamScores = await db
      .select({
        studentId: grades.studentId,
        examId: grades.examId,
        count: sql<number>`count(${grades.id})::int`,
      })
      .from(grades)
      .groupBy(grades.studentId, grades.examId);

    const studentScoreMap = new Map<string, number>();
    for (const ses of studentExamScores) {
      if (ses.examId !== null) {
        studentScoreMap.set(`${ses.studentId}-${ses.examId}`, ses.count);
      }
    }

    const enrichedRemarks = remarksRows.map((r) => {
      const scoresCount = studentScoreMap.get(`${r.studentId}-${r.examId}`) ?? 0;
      return {
        ...r,
        scoresCount,
        hasScores: scoresCount > 0,
      };
    });

    // 4. Classes for filtering
    const allClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        section: classes.section,
      })
      .from(classes)
      .orderBy(asc(classes.name));

    // 5. Summary counts for badges
    const [admissionCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${students.admissionStatus} = 'pending')::int`,
        approved: sql<number>`count(*) filter (where ${students.admissionStatus} = 'approved')::int`,
        rejected: sql<number>`count(*) filter (where ${students.admissionStatus} = 'rejected')::int`,
      })
      .from(students);

    const [remarksCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        approved: sql<number>`count(*) filter (where ${studentExamRemarks.isApproved} = true)::int`,
        pending: sql<number>`count(*) filter (where ${studentExamRemarks.isApproved} = false)::int`,
      })
      .from(studentExamRemarks);

    return Response.json({
      students: studentRows,
      exams: enrichedExams,
      remarks: enrichedRemarks,
      classes: allClasses,
      summary: {
        admissions: admissionCounts ?? { total: 0, pending: 0, approved: 0, rejected: 0 },
        exams: {
          total: allExams.length,
          active: allExams.filter((e) => e.status === "active").length,
          inactive: allExams.filter((e) => e.status === "inactive").length,
        },
        remarks: remarksCounts ?? { total: 0, approved: 0, pending: 0 },
      },
    });
  } catch (e) {
    return dbErrorResponse(e, "load approvals data");
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return Response.json({ error: "Valid action is required." }, { status: 400 });
  }

  try {
    // Action 1: Approve single student
    if (body.action === "approve_student") {
      const studentId = Number(body.studentId);
      if (!Number.isInteger(studentId)) {
        return Response.json({ error: "Invalid studentId." }, { status: 400 });
      }
      const [updated] = await db
        .update(students)
        .set({ admissionStatus: "approved" })
        .where(eq(students.id, studentId))
        .returning();
      return Response.json({ ok: true, student: updated });
    }

    // Action 2: Reject single student
    if (body.action === "reject_student") {
      const studentId = Number(body.studentId);
      if (!Number.isInteger(studentId)) {
        return Response.json({ error: "Invalid studentId." }, { status: 400 });
      }
      const [updated] = await db
        .update(students)
        .set({ admissionStatus: "rejected" })
        .where(eq(students.id, studentId))
        .returning();
      return Response.json({ ok: true, student: updated });
    }

    // Action 3: Bulk approve students
    if (body.action === "bulk_approve_students") {
      const studentIds = Array.isArray(body.studentIds)
        ? body.studentIds.map(Number).filter(Number.isInteger)
        : [];
      if (studentIds.length > 0) {
        await db
          .update(students)
          .set({ admissionStatus: "approved" })
          .where(inArray(students.id, studentIds));
      } else {
        // Approve all pending
        await db
          .update(students)
          .set({ admissionStatus: "approved" })
          .where(eq(students.admissionStatus, "pending"));
      }
      return Response.json({ ok: true });
    }

    // Action 4: Toggle Exam Status (Approve / Activate or Deactivate)
    if (body.action === "toggle_exam_status") {
      const examId = Number(body.examId);
      const newStatus = body.status === "active" ? "active" : "inactive";
      if (!Number.isInteger(examId)) {
        return Response.json({ error: "Invalid examId." }, { status: 400 });
      }
      const [updated] = await db
        .update(exams)
        .set({ status: newStatus })
        .where(eq(exams.id, examId))
        .returning();
      return Response.json({ ok: true, exam: updated });
    }

    // Action 5: Approve student behavioral remarks
    if (body.action === "approve_remark") {
      const remarkId = Number(body.remarkId);
      if (!Number.isInteger(remarkId)) {
        return Response.json({ error: "Invalid remarkId." }, { status: 400 });
      }
      const [updated] = await db
        .update(studentExamRemarks)
        .set({ isApproved: true, updatedAt: new Date() })
        .where(eq(studentExamRemarks.id, remarkId))
        .returning();
      return Response.json({ ok: true, remark: updated });
    }

    // Action 6: Unapprove remark
    if (body.action === "unapprove_remark") {
      const remarkId = Number(body.remarkId);
      if (!Number.isInteger(remarkId)) {
        return Response.json({ error: "Invalid remarkId." }, { status: 400 });
      }
      const [updated] = await db
        .update(studentExamRemarks)
        .set({ isApproved: false, updatedAt: new Date() })
        .where(eq(studentExamRemarks.id, remarkId))
        .returning();
      return Response.json({ ok: true, remark: updated });
    }

    // Action 7: Bulk approve all remarks for an exam or class
    if (body.action === "bulk_approve_remarks") {
      const remarkIds = Array.isArray(body.remarkIds)
        ? body.remarkIds.map(Number).filter(Number.isInteger)
        : [];
      if (remarkIds.length > 0) {
        await db
          .update(studentExamRemarks)
          .set({ isApproved: true, updatedAt: new Date() })
          .where(inArray(studentExamRemarks.id, remarkIds));
      } else {
        await db
          .update(studentExamRemarks)
          .set({ isApproved: true, updatedAt: new Date() })
          .where(eq(studentExamRemarks.isApproved, false));
      }
      return Response.json({ ok: true });
    }

    // Action 8: Edit / Save Remarks by Admin directly
    if (body.action === "save_and_approve_remark") {
      const studentId = Number(body.studentId);
      const examId = Number(body.examId);
      if (!Number.isInteger(studentId) || !Number.isInteger(examId)) {
        return Response.json({ error: "studentId and examId required." }, { status: 400 });
      }
      const values = {
        behaviorRatings: typeof body.behaviorRatings === "string" ? body.behaviorRatings : "{}",
        academicComment: typeof body.academicComment === "string" ? body.academicComment.trim() : "",
        principalComment: typeof body.principalComment === "string" ? body.principalComment.trim() : "",
        academicMasterName: typeof body.academicMasterName === "string" ? body.academicMasterName.trim() : "",
        headmasterName: typeof body.headmasterName === "string" ? body.headmasterName.trim() : "",
        isApproved: true,
        updatedAt: new Date(),
      };

      const [existing] = await db
        .select({ id: studentExamRemarks.id })
        .from(studentExamRemarks)
        .where(and(eq(studentExamRemarks.studentId, studentId), eq(studentExamRemarks.examId, examId)))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(studentExamRemarks)
          .set(values)
          .where(eq(studentExamRemarks.id, existing.id))
          .returning();
        return Response.json({ ok: true, remark: updated });
      } else {
        const [created] = await db
          .insert(studentExamRemarks)
          .values({ studentId, examId, ...values })
          .returning();
        return Response.json({ ok: true, remark: created });
      }
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return dbErrorResponse(e, "process approval action");
  }
}
