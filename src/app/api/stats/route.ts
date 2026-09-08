import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classes, fees, grades, students, subjects, teachers } from "@/db/schema";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { getTeacherScope } from "@/lib/teachers";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET() {
  const user = await getSessionUser();
  const err = requirePermission(user, "dashboard");
  if (err) return err;

  const scope = await getTeacherScope(user);
  const today = todayStr();

  // A scoped teacher with no assignments yet sees an all-zero dashboard.
  const noAssignments = scope.scoped && scope.classIds.length === 0 && scope.subjectIds.length === 0;
  const classIdFilter = scope.scoped ? (scope.classIds.length > 0 ? scope.classIds : [-1]) : null;
  const subjectIdFilter = scope.scoped ? (scope.subjectIds.length > 0 ? scope.subjectIds : [-1]) : null;

  // ----- Students -----
  const studentCountRow = noAssignments
    ? [{ n: 0 }]
    : classIdFilter
      ? await db.select({ n: count() }).from(students).where(inArray(students.classId, classIdFilter))
      : await db.select({ n: count() }).from(students);

  // ----- Classes / Subjects / Teachers counts -----
  let classCount: number;
  let subjectCount: number;
  let teacherCount: number;
  if (scope.scoped) {
    classCount = scope.classIds.length;
    subjectCount = scope.subjectIds.length;
    teacherCount = 1; // the teacher themself
  } else {
    const [[c], [s], [t]] = await Promise.all([
      db.select({ n: count() }).from(classes),
      db.select({ n: count() }).from(subjects),
      db.select({ n: count() }).from(teachers),
    ]);
    classCount = c?.n ?? 0;
    subjectCount = s?.n ?? 0;
    teacherCount = t?.n ?? 0;
  }

  // ----- Fees: scoped to students in the teacher's assigned classes -----
  let feeRows: (typeof fees.$inferSelect)[] = [];
  if (!noAssignments) {
    if (classIdFilter) {
      const scopedStudents = await db.select({ id: students.id }).from(students).where(inArray(students.classId, classIdFilter));
      const studentIds = scopedStudents.map((s) => s.id);
      feeRows = studentIds.length > 0 ? await db.select().from(fees).where(inArray(fees.studentId, studentIds)) : [];
    } else {
      feeRows = await db.select().from(fees);
    }
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

  // ----- Attendance today: scoped to the teacher's assigned classes -----
  const attCounts: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  if (!noAssignments) {
    const whereClause = classIdFilter
      ? and(eq(attendance.date, today), inArray(attendance.classId, classIdFilter))
      : eq(attendance.date, today);
    const attRows = await db
      .select({ status: attendance.status, n: count() })
      .from(attendance)
      .where(whereClause)
      .groupBy(attendance.status);
    for (const a of attRows) attCounts[a.status] = a.n;
  }

  // ----- Grades: scoped to the teacher's assigned subjects -----
  let gradeCount = 0;
  if (!noAssignments) {
    const [g] = subjectIdFilter
      ? await db.select({ n: count() }).from(grades).where(inArray(grades.subjectId, subjectIdFilter))
      : await db.select({ n: count() }).from(grades);
    gradeCount = g?.n ?? 0;
  }

  // ----- Recently added students: scoped to the teacher's assigned classes -----
  const recentStudents = noAssignments
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
        .where(classIdFilter ? inArray(students.classId, classIdFilter) : undefined)
        .orderBy(desc(students.createdAt))
        .limit(5);

  return Response.json({
    scope: {
      scoped: scope.scoped,
      classCount: scope.scoped ? scope.classIds.length : null,
      subjectCount: scope.scoped ? scope.subjectIds.length : null,
      noAssignments,
    },
    counts: {
      students: studentCountRow[0]?.n ?? 0,
      teachers: teacherCount,
      classes: classCount,
      subjects: subjectCount,
      grades: gradeCount,
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
  });
}
