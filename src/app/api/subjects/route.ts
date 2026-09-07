import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { subjects, teachers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allSubjects = await db.select().from(subjects).orderBy(subjects.id);

    // Enrich with teacher names
    const enrichedSubjects = await Promise.all(
      allSubjects.map(async (subject) => {
        if (subject.teacherId) {
          const [teacher] = await db
            .select({ name: teachers.name })
            .from(teachers)
            .where(eq(teachers.id, subject.teacherId))
            .limit(1);
          return { ...subject, teacherName: teacher?.name };
        }
        return subject;
      })
    );

    return NextResponse.json({ subjects: enrichedSubjects });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, code, teacherId } = await request.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check if code exists
    const [existing] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.code, code))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Subject code already exists" },
        { status: 400 }
      );
    }

    const [newSubject] = await db
      .insert(subjects)
      .values({
        name,
        code,
        teacherId: teacherId || null,
      })
      .returning();

    return NextResponse.json({ success: true, subject: newSubject });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
