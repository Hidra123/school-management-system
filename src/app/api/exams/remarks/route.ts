import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { studentExamRemarks } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { createApproval } from "@/lib/approvals";
import { getSessionUser, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "exams.results");
  if (err) return err;

  try {
    const url = new URL(req.url);
    const studentId = Number(url.searchParams.get("studentId"));
    const examId = Number(url.searchParams.get("examId"));
    if (!Number.isFinite(studentId) || !Number.isFinite(examId)) {
      return Response.json({ error: "studentId and examId are required." }, { status: 400 });
    }

    const [row] = await db
      .select()
      .from(studentExamRemarks)
      .where(and(eq(studentExamRemarks.studentId, studentId), eq(studentExamRemarks.examId, examId)))
      .limit(1);

    return Response.json(
      row ?? {
        studentId,
        examId,
        behaviorRatings: "{}",
        academicComment: "",
        principalComment: "",
        academicMasterName: "",
        headmasterName: "",
      },
    );
  } catch (e) {
    return dbErrorResponse(e, "load student remarks");
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "exams.results");
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  const studentId = Number(body.studentId);
  const examId = Number(body.examId);
  if (!Number.isFinite(studentId) || !Number.isFinite(examId)) {
    return Response.json({ error: "studentId and examId are required." }, { status: 400 });
  }

  try {
    const values = {
      behaviorRatings: typeof body.behaviorRatings === "string" ? body.behaviorRatings : "{}",
      academicComment: typeof body.academicComment === "string" ? body.academicComment.trim() : "",
      principalComment: typeof body.principalComment === "string" ? body.principalComment.trim() : "",
      academicMasterName: typeof body.academicMasterName === "string" ? body.academicMasterName.trim() : "",
      headmasterName: typeof body.headmasterName === "string" ? body.headmasterName.trim() : "",
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: studentExamRemarks.id })
      .from(studentExamRemarks)
      .where(and(eq(studentExamRemarks.studentId, studentId), eq(studentExamRemarks.examId, examId)))
      .limit(1);

    const pending = user!.role !== "admin";
    if (existing) {
      const [updated] = await db
        .update(studentExamRemarks)
        .set({ ...values, approvalStatus: pending ? "pending" : "approved" })
        .where(eq(studentExamRemarks.id, existing.id))
        .returning();
      if (pending) {
        await createApproval({
          type: "behavior_remark",
          refId: updated.id,
          summary: `Behavioural assessment for student #${studentId} (exam #${examId})`,
          submittedById: user!.id,
          submittedByName: user!.name,
        });
      }
      return Response.json(updated);
    }

    const [created] = await db
      .insert(studentExamRemarks)
      .values({ studentId, examId, ...values, approvalStatus: pending ? "pending" : "approved" })
      .returning();
    if (pending) {
      await createApproval({
        type: "behavior_remark",
        refId: created.id,
        summary: `Behavioural assessment for student #${studentId} (exam #${examId})`,
        submittedById: user!.id,
        submittedByName: user!.name,
      });
    }
    return Response.json(created);
  } catch (e) {
    return dbErrorResponse(e, "save student remarks");
  }
}
