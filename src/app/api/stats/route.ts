import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendance, classes, fees, grades, students, subjects, teachers } from "@/db/schema";

export const dynamic = "force-dynamic";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET() {
  const today = todayStr();

  const [sCount, tCount, cCount, subCount] = await Promise.all([
    db.select({ n: count() }).from(students),
    db.select({ n: count() }).from(teachers),
    db.select({ n: count() }).from(classes),
    db.select({ n: count() }).from(subjects),
  ]);

  const feeRows = await db.select().from(fees);
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

  const attRows = await db
    .select({ status: attendance.status, n: count() })
    .from(attendance)
    .where(eq(attendance.date, today))
    .groupBy(attendance.status);
  const attCounts: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const a of attRows) attCounts[a.status] = a.n;

  const gradeRows = await db.select({ n: count() }).from(grades);

  const recentStudents = await db
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
  });
}
