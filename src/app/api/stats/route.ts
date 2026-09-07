import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  students,
  teachers,
  classes,
  subjects,
  attendance,
  grades,
  fees,
} from "@/db/schema";
import { count, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      usersCount,
      studentsCount,
      teachersCount,
      classesCount,
      subjectsCount,
      attendanceCount,
      gradesCount,
      feesCount,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(students),
      db.select({ count: count() }).from(teachers),
      db.select({ count: count() }).from(classes),
      db.select({ count: count() }).from(subjects),
      db.select({ count: count() }).from(attendance),
      db.select({ count: count() }).from(grades),
      db.select({ count: count() }).from(fees),
    ]);

    return NextResponse.json({
      stats: {
        users: usersCount[0]?.count || 0,
        students: studentsCount[0]?.count || 0,
        teachers: teachersCount[0]?.count || 0,
        classes: classesCount[0]?.count || 0,
        subjects: subjectsCount[0]?.count || 0,
        attendance: attendanceCount[0]?.count || 0,
        grades: gradesCount[0]?.count || 0,
        fees: feesCount[0]?.count || 0,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
