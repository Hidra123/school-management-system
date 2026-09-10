import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { studentExamRemarks } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
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
        isApproved: false,
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
    const isAdmin = !!user && user.role === "admin";
    const values = {
      behaviorRatings: typeof body.behaviorRatings === "string" ? body.behaviorRatings : "{}",
      academicComment: typeof body.academicComment === "string" ? body.academicComment.trim() : "",
      principalComment: typeof body.principalComment === "string" ? body.principalComment.trim() : "",
      academicMasterName: typeof body.academicMasterName === "string" ? body.academicMasterName.trim() : "",
      headmasterName: typeof body.headmasterName === "string" ? body.headmasterName.trim() : "",
      isApproved: isAdmin ? (body.isApproved !== undefined ? Boolean(body.isApproved) : true) : false,
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
      return Response.json(updated);
    }

    const [created] = await db
      .insert(studentExamRemarks)
      .values({ studentId, examId, ...values })
      .returning();
    return Response.json(created);
  } catch (e) {
    return dbErrorResponse(e, "save student remarks");
  }
}
