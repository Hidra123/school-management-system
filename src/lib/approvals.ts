import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, approvals, exams, studentExamRemarks, students } from "@/db/schema";

export type ApprovalType = "student_admission" | "exam" | "behavior_remark";

/** Queue a new pending approval (or refresh the existing pending row for this entity). */
export async function createApproval(opts: {
  type: ApprovalType;
  refId: number;
  summary: string;
  submittedById: number | null;
  submittedByName: string;
}): Promise<void> {
  const [existing] = await db
    .select({ id: approvals.id })
    .from(approvals)
    .where(and(eq(approvals.type, opts.type), eq(approvals.refId, opts.refId), eq(approvals.status, "pending")))
    .limit(1);
  if (existing) {
    await db
      .update(approvals)
      .set({ summary: opts.summary, submittedById: opts.submittedById, submittedByName: opts.submittedByName })
      .where(eq(approvals.id, existing.id));
    return;
  }
  await db.insert(approvals).values({
    type: opts.type,
    refId: opts.refId,
    summary: opts.summary,
    submittedById: opts.submittedById,
    submittedByName: opts.submittedByName,
  });
}

/** Resolve a pending approval: mark the entity + the queue row. */
export async function decideApproval(
  id: number,
  action: "approve" | "reject",
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  const [row] = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
  if (!row) return { ok: false, error: "Approval not found." };
  if (row.status !== "pending") return { ok: false, error: "This approval was already decided." };

  const status = action === "approve" ? "approved" : "rejected";

  if (row.type === "student_admission") {
    await db.update(students).set({ admissionStatus: status }).where(eq(students.id, row.refId));
  } else if (row.type === "exam") {
    await db.update(exams).set({ approvalStatus: status }).where(eq(exams.id, row.refId));
  } else if (row.type === "behavior_remark") {
    await db.update(studentExamRemarks).set({ approvalStatus: status }).where(eq(studentExamRemarks.id, row.refId));
  }

  await db
    .update(approvals)
    .set({ status, note: note.trim(), decidedAt: new Date() })
    .where(eq(approvals.id, row.id));
  return { ok: true };
}

export async function listApprovals() {
  return db.select().from(approvals).orderBy(desc(approvals.createdAt)).limit(200);
}

// ---------- System lock (Monitor Dashboards) ----------
export async function ensureAppSettings() {
  const [row] = await db.select().from(appSettings).limit(1);
  if (row) return row;
  const [created] = await db.insert(appSettings).values({}).returning();
  return created;
}

export async function systemLockState(): Promise<{ locked: boolean; message: string }> {
  const row = await ensureAppSettings();
  return { locked: row.allAccountsLocked, message: row.lockMessage };
}
