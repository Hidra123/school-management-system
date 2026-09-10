import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { approvals } from "@/db/schema";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { classAllowed, getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

type ImportRow = {
  admissionNo?: string;
  firstName?: string;
  lastName?: string;
  sex?: string;
  dateOfBirth?: string;
  className?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianAddress?: string;
};

type RowResult = { row: number; status: "ok" | "error"; message?: string; admissionNo?: string; name?: string };

function normalizeSex(raw: string | undefined): "male" | "female" | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (["male", "m", "boy"].includes(v)) return "male";
  if (["female", "f", "girl"].includes(v)) return "female";
  return null;
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, or an Excel serial date (already
 * converted to string by the client) and normalizes to YYYY-MM-DD, or null. */
function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const dmy = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return null;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "students.create");
  if (err) return err;

  try {
    const scope = await getTeacherScope(user);

    const body = await req.json().catch(() => null);
    const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];
    if (rows.length === 0) {
      return Response.json({ error: "No rows were provided." }, { status: 400 });
    }
    if (rows.length > 1000) {
      return Response.json({ error: "Too many rows in one import (max 1000). Split into smaller files." }, { status: 400 });
    }

    const allClasses = await db.select().from(classes);
    const byExactName = new Map<string, typeof allClasses>();
    const byNameSection = new Map<string, (typeof allClasses)[number]>();
    for (const c of allClasses) {
      const key = c.name.trim().toLowerCase();
      if (!byExactName.has(key)) byExactName.set(key, []);
      byExactName.get(key)!.push(c);
      byNameSection.set(`${key}|${c.section.trim().toLowerCase()}`, c);
    }

    // Admission numbers only need to be unique WITHIN a class (many schools
    // restart numbering per class, e.g. every class has its own S6790-001,
    // S6790-002...), so duplicate checks below are keyed by "classId|admNo",
    // not by admission number alone.
    const existingKey = (classId: number, admNo: string) => `${classId}|${admNo.toLowerCase()}`;
    const existingAdmissionNos = new Set(
      (await db.select({ admissionNo: students.admissionNo, classId: students.classId }).from(students))
        .filter((s) => s.classId !== null)
        .map((s) => existingKey(s.classId as number, s.admissionNo)),
    );
    const usedInBatch = new Set<string>();

    const results: RowResult[] = [];
    const toInsert: (typeof students.$inferInsert)[] = [];

    rows.forEach((raw, idx) => {
      const rowNum = idx + 1;
      const firstName = (raw.firstName ?? "").trim();
      const lastName = (raw.lastName ?? "").trim();
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
      if (!fullName) {
        results.push({ row: rowNum, status: "error", message: "Missing First/Last name." });
        return;
      }

      const sex = normalizeSex(raw.sex);
      if (!sex) {
        results.push({ row: rowNum, status: "error", message: `Invalid Sex value "${raw.sex ?? ""}" (use Male/Female).` });
        return;
      }

      const classNameRaw = (raw.className ?? "").trim();
      if (!classNameRaw) {
        results.push({ row: rowNum, status: "error", message: "Missing Class." });
        return;
      }
      const classKey = classNameRaw.toLowerCase();
      let matchedClass = byNameSection.get(classKey);
      if (!matchedClass) {
        const candidates = byExactName.get(classKey) ?? [];
        if (candidates.length === 1) matchedClass = candidates[0];
        else if (candidates.length > 1) {
          results.push({ row: rowNum, status: "error", message: `Class "${classNameRaw}" is ambiguous (multiple sections). Use "Name — Section".` });
          return;
        }
      }
      if (!matchedClass) {
        results.push({ row: rowNum, status: "error", message: `Class "${classNameRaw}" was not found. Create it first in Manage Classes.` });
        return;
      }
      if (scope.scoped && !classAllowed(scope, matchedClass.id)) {
        results.push({ row: rowNum, status: "error", message: `You are not assigned to class "${classNameRaw}".` });
        return;
      }

      let admissionNo = (raw.admissionNo ?? "").trim();
      if (admissionNo) {
        const key = existingKey(matchedClass.id, admissionNo);
        if (existingAdmissionNos.has(key) || usedInBatch.has(key)) {
          results.push({ row: rowNum, status: "error", message: `Admission number "${admissionNo}" is already in use in class "${matchedClass.name}".` });
          return;
        }
      } else {
        // Auto-generate an admission number unique within this class.
        let candidate = "";
        do {
          candidate = `ADM-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
        } while (existingAdmissionNos.has(existingKey(matchedClass.id, candidate)) || usedInBatch.has(existingKey(matchedClass.id, candidate)));
        admissionNo = candidate;
      }
      usedInBatch.add(existingKey(matchedClass.id, admissionNo));

      toInsert.push({
        admissionNo,
        name: fullName,
        gender: sex,
        classId: matchedClass.id,
        dateOfBirth: normalizeDate(raw.dateOfBirth),
        guardianName: (raw.guardianName ?? "").trim(),
        guardianPhone: (raw.guardianPhone ?? "").trim(),
        guardianAddress: (raw.guardianAddress ?? "").trim(),
        enrollmentDate: todayStr(),
      });
      results.push({ row: rowNum, status: "ok", admissionNo, name: fullName });
    });

    if (toInsert.length > 0) {
      if (user!.role !== "admin") {
        const inserted = await db
          .insert(students)
          .values(toInsert.map((r) => ({ ...r, admissionStatus: "pending" })))
          .returning({ id: students.id, name: students.name, admissionNo: students.admissionNo });
        if (inserted.length > 0) {
          await db.insert(approvals).values(
            inserted.map((r) => ({
              type: "student_admission",
              refId: r.id,
              summary: `${r.name} (${r.admissionNo}) [Excel import]`,
              submittedById: user!.id,
              submittedByName: user!.name,
        })),
          );
        }
      } else {
        await db.insert(students).values(toInsert);
      }
    }

    const successCount = results.filter((r) => r.status === "ok").length;
    const errorCount = results.length - successCount;

    return Response.json({ successCount, errorCount, results });
  } catch (e) {
    return dbErrorResponse(e, "import students");
  }
}
