import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, approvals, exams, studentExamRemarks, students } from "@/db/schema";

export type ApprovalType = "student_admission" | "exam" | "behavior_remark";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type UnifiedApprovalRow = {
  id: number;
  type: ApprovalType;
  refId: number;
  status: ApprovalStatus;
  summary: string;
  submittedById: number | null;
  submittedByName: string;
  note: string;
  decidedAt: string | null;
  createdAt: string;
  source: "queue" | "entity";
};

// Stable synthetic ids (negative) so synthesized entity rows never collide with real queue ids.
const BASE: Record<ApprovalType, number> = {
  student_admission: 1_000_000,
  exam: 3_000_000,
  behavior_remark: 7_000_000,
};

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

/** Approve/reject — works for real queue rows (positive id) AND entity rows (negative synthetic id). */
export async function decideApproval(
  id: number,
  action: "approve" | "reject",
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  const status: ApprovalStatus = action === "approve" ? "approved" : "rejected";

  // ----- Synthetic entity id → decide the entity directly (+ log a queue row) -----
  if (id < 0) {
    return decideByEntity(id, action, note.trim());
  }

  // ----- Real queue row -----
  const [row] = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
  if (!row) return { ok: false, error: "Approval not found." };
  if (row.status !== "pending") return { ok: false, error: "This approval was already decided." };

  if (row.type === "student_admission") {
    await db.update(students).set({ admissionStatus: status }).where(eq(students.id, row.refId));
  } else if (row.type === "exam") {
    await db.update(exams).set({ approvalStatus: status }).where(eq(exams.id, row.refId));
  } else if (row.type === "behavior_remark") {
    await db
      .update(studentExamRemarks)
      .set({ approvalStatus: status, isApproved: action === "approve" })
      .where(eq(studentExamRemarks.id, row.refId));
  }

  await db
    .update(approvals)
    .set({ status, note: note.trim(), decidedAt: new Date() })
    .where(eq(approvals.id, row.id));
  return { ok: true };
}

async function decideByEntity(id: number, action: "approve" | "reject", note: string) {
  const abs = Math.abs(id);
  const status: ApprovalStatus = action === "approve" ? "approved" : "rejected";
  let type: ApprovalType;
  let refId: number;
  if (abs > BASE.behavior_remark) {
    type = "behavior_remark";
    refId = abs - BASE.behavior_remark;
  } else if (abs > BASE.exam) {
    type = "exam";
    refId = abs - BASE.exam;
  } else if (abs > BASE.student_admission) {
    type = "student_admission";
    refId = abs - BASE.student_admission;
  } else {
    return { ok: false, error: "Unknown approval id." };
  }

  let summary = `#${refId}`;
  if (type === "student_admission") {
    await db.update(students).set({ admissionStatus: status }).where(eq(students.id, refId));
    const [r] = await db.select({ name: students.name, admissionNo: students.admissionNo }).from(students).where(eq(students.id, refId)).limit(1);
    if (r) summary = `${r.name} (${r.admissionNo})`;
  } else if (type === "exam") {
    await db.update(exams).set({ approvalStatus: status }).where(eq(exams.id, refId));
    const [r] = await db.select({ name: exams.name, academicYear: exams.academicYear }).from(exams).where(eq(exams.id, refId)).limit(1);
    if (r) summary = `${r.name} (${r.academicYear})`;
  } else {
    await db
      .update(studentExamRemarks)
      .set({ approvalStatus: status, isApproved: action === "approve" })
      .where(eq(studentExamRemarks.id, refId));
    summary = `Behavioural assessment #${refId}`;
  }

  // Record the decision in the queue table so History keeps a trail.
  await db.insert(approvals).values({
    type,
    refId,
    status,
    summary,
    submittedById: null,
    submittedByName: "",
    note,
    decidedAt: new Date(),
  });
  return { ok: true };
}

/**
 * The Approve Admissions panel is DATA-DRIVEN: it returns real queue rows PLUS
 * synthesized rows built from the actual entity tables, so the admin always
 * sees the true pending + approved state of students, exams and behavioural
 * assessments — even work submitted before this system existed or via the
 * parallel admin-admissions implementation (isApproved flag).
 */
export async function listUnifiedApprovals(): Promise<UnifiedApprovalRow[]> {
  const queueRowsRaw = await db.select().from(approvals).orderBy(desc(approvals.createdAt)).limit(200);
  const out: UnifiedApprovalRow[] = queueRowsRaw.map((r) => ({
    id: r.id,
    type: r.type as ApprovalType,
    refId: r.refId,
    status: r.status as ApprovalStatus,
    summary: r.summary,
    submittedById: r.submittedById,
    submittedByName: r.submittedByName,
    note: r.note,
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    source: "queue",
  }));
  const pendingKeys = new Set(out.filter((r) => r.status === "pending").map((r) => `${r.type}|${r.refId}`));

  const [studentRows, examRows, remarkRows] = await Promise.all([
    db
      .select({ id: students.id, name: students.name, admissionNo: students.admissionNo, admissionStatus: students.admissionStatus, createdAt: students.createdAt })
      .from(students)
      .orderBy(desc(students.createdAt))
      .limit(60),
    db.select({ id: exams.id, name: exams.name, academicYear: exams.academicYear, approvalStatus: exams.approvalStatus, createdAt: exams.createdAt }).from(exams).orderBy(desc(exams.createdAt)).limit(30),
    db
      .select({ id: studentExamRemarks.id, studentId: studentExamRemarks.studentId, studentName: students.name, approvalStatus: studentExamRemarks.approvalStatus, isApproved: studentExamRemarks.isApproved, updatedAt: studentExamRemarks.updatedAt })
      .from(studentExamRemarks)
      .innerJoin(students, eq(studentExamRemarks.studentId, students.id))
      .limit(60),
  ]);

  for (const s of studentRows) {
    const status = (s.admissionStatus as ApprovalStatus) ?? "approved";
    if (status === "pending" && pendingKeys.has(`student_admission|${s.id}`)) continue;
    out.push({
      id: -(BASE.student_admission + s.id),
      type: "student_admission",
      refId: s.id,
      status,
      summary: `${s.name} (${s.admissionNo})`,
      submittedById: null,
      submittedByName: "",
      note: "",
      decidedAt: null,
      createdAt: s.createdAt.toISOString(),
      source: "entity",
    });
  }
  for (const e of examRows) {
    const status = (e.approvalStatus as ApprovalStatus) ?? "approved";
    if (status === "pending" && pendingKeys.has(`exam|${e.id}`)) continue;
    out.push({
      id: -(BASE.exam + e.id),
      type: "exam",
      refId: e.id,
      status,
      summary: `${e.name} (${e.academicYear})`,
      submittedById: null,
      submittedByName: "",
      note: "",
      decidedAt: null,
      createdAt: e.createdAt.toISOString(),
      source: "entity",
    });
  }
  for (const r of remarkRows) {
    const status: ApprovalStatus = r.isApproved ? "approved" : r.approvalStatus === "rejected" ? "rejected" : "pending";
    if (status === "pending" && pendingKeys.has(`behavior_remark|${r.id}`)) continue;
    out.push({
      id: -(BASE.behavior_remark + r.id),
      type: "behavior_remark",
      refId: r.id,
      status,
      summary: `Behavioural assessment for ${r.studentName}`,
      submittedById: null,
      submittedByName: "",
      note: "",
      decidedAt: null,
      createdAt: r.updatedAt.toISOString(),
      source: "entity",
    });
  }

  // Pending first, newest first.
  out.sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || b.createdAt.localeCompare(a.createdAt));
  return out;
}

export async function listApprovals() {
  return listUnifiedApprovals();
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
