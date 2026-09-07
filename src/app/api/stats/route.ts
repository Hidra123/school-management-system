import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classes, fees, grades, students, subjects, teachers } from "@/db/schema";
import { getSessionUser, hasPermission, requirePermission } from "@/lib/auth";
import { getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const EMPTY = {
  counts: { students: 0, teachers: 0, classes: 0, subjects: 0, grades: 0 },
  fees: {
    expected: 0,
    collected: 0,
    balance: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
    overdueCount: 0,
    totalRecords: 0,
  },
  attendance: { date: todayStr(), present: 0, absent: 0, late: 0, excused: 0 },
  recentStudents: [] as unknown[],
};

export async function GET() {
  // 1) Lazima uwe umeingia na uwe na ruhusa ya dashboard.
  const user = await getSessionUser();
  const err = requirePermission(user, "dashboard");
  if (err) return err;

  // 2) Mwalimu anaona vyake tu; admin anaona vyote.
  const scope = await getTeacherScope(user);
  const today = todayStr();

  // Mwalimu asiye na darasa wala somo -> hana takwimu.
  if (scope.scoped && scope.classIds.length === 0 && scope.subjectIds.length === 0) {
    return Response.json({ ...EMPTY, attendance: { ...EMPTY.attendance, date: today }, scoped: true });
  }

  const hasClasses = scope.classIds.length > 0;
  const hasSubjects = scope.subjectIds.length > 0;

  // ---------- Counts ----------
  const studentWhere = scope.scoped
    ? hasClasses
      ? inArray(students.classId, scope.classIds)
      : undefined
    : undefined;

  const [sCount, cCount, subCount] = await Promise.all([
    scope.scoped && !hasClasses
      ? Promise.resolve([{ n: 0 }])
      : db.select({ n: count() }).from(students).where(studentWhere),
    scope.scoped
      ? Promise.resolve([{ n: scope.classIds.length }])
      : db.select({ n: count() }).from(classes),
    scope.scoped
      ? Promise.resolve([{ n: scope.subjectIds.length }])
      : db.select({ n: count() }).from(subjects),
  ]);

  // Mwalimu haoni idadi ya walimu wengine.
  const tCount = scope.scoped ? [{ n: 0 }] : await db.select({ n: count() }).from(teachers);

  // ---------- Grades (masomo yake tu) ----------
  const gradeRows =
    scope.scoped && !hasSubjects
      ? [{ n: 0 }]
      : await db
          .select({ n: count() })
          .from(grades)
          .where(scope.scoped ? inArray(grades.subjectId, scope.subjectIds) : undefined);

  // ---------- Fees (wanafunzi wa madarasa yake tu) ----------
  let feeRows: { amount: number; paidAmount: number; dueDate: string | null }[] = [];
  // Ada zinaonekana tu kwa mwenye ruhusa ya fees.view (na mwalimu lazima awe na darasa).
  const canSeeFees = hasPermission(user, "fees.view") && (!scope.scoped || hasClasses);
  if (canSeeFees) {
    feeRows = await db
      .select({ amount: fees.amount, paidAmount: fees.paidAmount, dueDate: fees.dueDate })
      .from(fees)
      .innerJoin(students, eq(fees.studentId, students.id))
      .where(scope.scoped ? inArray(students.classId, scope.classIds) : undefined);
  }

  const expected = feeRows.reduce((a, f) => a + f.amount, 0);
  const collected = feeRows.reduce((a, f) => a + f.paidAmount, 0);
  const balance = expected - collected;

  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let overdueCount = 0;
  for (const f of feeRows) {
    const bal = f.amount - f.paidAmount;
    const isOverdue = !!f.dueDate && f.dueDate < today && bal > 0;
    if (isOverdue) overdueCount += 1;
    if (bal <= 0) paidCount += 1;
    else if (f.paidAmount > 0) partialCount += 1;
    else unpaidCount += 1;
  }

  // ---------- Attendance ya leo (madarasa yake tu) ----------
  const attCounts: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  if (!scope.scoped || hasClasses) {
    const attWhere = scope.scoped
      ? and(eq(attendance.date, today), inArray(attendance.classId, scope.classIds))
      : eq(attendance.date, today);

    const attRows = await db
      .select({ status: attendance.status, n: count() })
      .from(attendance)
      .where(attWhere)
      .groupBy(attendance.status);

    for (const a of attRows) attCounts[a.status] = a.n;
  }

  // ---------- Wanafunzi wa hivi karibuni (madarasa yake tu) ----------
  const recentStudents =
    scope.scoped && !hasClasses
      ? []
      : await db
          .select({
            id: students.id,
            admissionNo: students.admissionNo,
            name: students.name,
            gender: students.gender,
            classId: students.classId,
            className: classes.name,
            enrollmentDate: students.enrollmentDate,
            createdAt: students.createdAt,
          })
          .from(students)
          .leftJoin(classes, eq(students.classId, classes.id))
          .where(scope.scoped ? inArray(students.classId, scope.classIds) : undefined)
          .orderBy(desc(students.createdAt))
          .limit(5);

  return Response.json({
    counts: {
      students: sCount[0]?.n ?? 0,
      teachers: tCount[0]?.n ?? 0,
      classes: cCount[0]?.n ?? 0,
      subjects: subCount[0]?.n ?? 0,
      grades: gradeRows[0]?.n ?? 0,
    },
    fees: {
      expected: Math.round(expected),
      collected: Math.round(collected),
      balance: Math.round(balance),
      paidCount,
      partialCount,
      unpaidCount,
      overdueCount,
      totalRecords: feeRows.length,
    },
    attendance: { date: today, ...attCounts },
    recentStudents,
    scoped: scope.scoped,
    canSeeFees,
  });
}
