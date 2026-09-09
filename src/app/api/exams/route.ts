import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classes, examClasses, exams } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { isExamType, normalizeExamType } from "@/lib/examTypes";

export const dynamic = "force-dynamic";

/** Parses a comma-separated "Form 1, Form 2" string into trimmed, non-empty names. */
function parseClassNames(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET() {
  const user = await getSessionUser();
  const err = requirePermission(user, "exams.view");
  if (err) return err;

  try {
    const allExams = await db.select().from(exams).orderBy(asc(exams.startDate));
    const links = await db
      .select({ examId: examClasses.examId, classId: examClasses.classId, className: classes.name })
      .from(examClasses)
      .innerJoin(classes, eq(examClasses.classId, classes.id));

    const classMap = new Map<number, { classId: number; className: string }[]>();
    for (const l of links) {
      if (!classMap.has(l.examId)) classMap.set(l.examId, []);
      classMap.get(l.examId)!.push({ classId: l.classId, className: l.className });
    }

    return Response.json(
      allExams.map((e) => {
        const cls = classMap.get(e.id) ?? [];
        return {
          ...e,
          classIds: cls.map((c) => c.classId),
          classNames: cls.map((c) => c.className),
          appliesToAllClasses: cls.length === 0,
        };
      }),
    );
  } catch (e) {
    return dbErrorResponse(e, "load examinations");
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "exams.manage");
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "Exam name is required." }, { status: 400 });
  }
  // Exam Type: only SE (School Examination) or CA (Continuously Assessment).
  if (body.examType !== undefined && !isExamType(typeof body.examType === "string" ? body.examType : "")) {
    return Response.json(
      { error: "Exam Type must be either SE (School Examination) or CA (Continuously Assessment)." },
      { status: 400 },
    );
  }

  try {
    const classNames = parseClassNames(body.classes);
    let classIds: number[] = [];
    if (classNames.length > 0) {
      const allClasses = await db.select().from(classes);
      const byName = new Map(allClasses.map((c) => [c.name.trim().toLowerCase(), c.id]));
      const unmatched: string[] = [];
      for (const name of classNames) {
        const id = byName.get(name.toLowerCase());
        if (id !== undefined) classIds.push(id);
        else unmatched.push(name);
      }
      if (unmatched.length > 0) {
        return Response.json(
          { error: `These classes were not found: ${unmatched.join(", ")}. Create them first in Manage Classes.` },
          { status: 400 },
        );
      }
    }

    const [row] = await db
      .insert(exams)
      .values({
        name: body.name.trim(),
        examType: typeof body.examType === "string" && body.examType.trim() ? normalizeExamType(body.examType) : "SE",
        academicYear: typeof body.academicYear === "string" ? body.academicYear.trim() : "",
        startDate: typeof body.startDate === "string" && body.startDate ? body.startDate : null,
        endDate: typeof body.endDate === "string" && body.endDate ? body.endDate : null,
        remarks: typeof body.remarks === "string" ? body.remarks.trim() : "",
        status: body.status === "inactive" ? "inactive" : "active",
      })
      .returning();

    if (classIds.length > 0) {
      await db.insert(examClasses).values(classIds.map((classId) => ({ examId: row.id, classId })));
    }

    return Response.json({ ...row, classIds, appliesToAllClasses: classIds.length === 0 }, { status: 201 });
  } catch (e) {
    return dbErrorResponse(e, "create the examination");
  }
}
