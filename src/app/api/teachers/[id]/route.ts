import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { teachers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, parseInt(id)))
      .limit(1);

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Get user data if linked
    let user = null;
    if (teacher.userId) {
      [user] = await db
        .select({
          id: users.id,
          username: users.username,
          rawPassword: users.rawPassword,
          email: users.email,
          active: users.active,
          mustChangePassword: users.mustChangePassword,
        })
        .from(users)
        .where(eq(users.id, teacher.userId))
        .limit(1);
    }

    return NextResponse.json({ teacher, user });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const {
      name,
      email,
      phone,
      subject,
      qualification,
      hireDate,
      username,
      rawPassword,
    } = await request.json();

    const [existingTeacher] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, parseInt(id)))
      .limit(1);

    if (!existingTeacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Update teacher
    const [updatedTeacher] = await db
      .update(teachers)
      .set({
        name: name || existingTeacher.name,
        email: email !== undefined ? email : existingTeacher.email,
        phone: phone !== undefined ? phone : existingTeacher.phone,
        subject: subject !== undefined ? subject : existingTeacher.subject,
        qualification:
          qualification !== undefined ? qualification : existingTeacher.qualification,
        hireDate: hireDate !== undefined ? hireDate : existingTeacher.hireDate,
      })
      .where(eq(teachers.id, parseInt(id)))
      .returning();

    // Update user if linked
    if (existingTeacher.userId && (username || rawPassword)) {
      const updates: Record<string, any> = {};
      if (username) updates.username = username;
      if (rawPassword) {
        updates.password = hashPassword(rawPassword);
        updates.rawPassword = rawPassword;
      }
      await db
        .update(users)
        .set(updates)
        .where(eq(users.id, existingTeacher.userId));
    }

    return NextResponse.json({ success: true, teacher: updatedTeacher });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get teacher to check if has user
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, parseInt(id)))
      .limit(1);

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // If teacher has a user, delete the user first
    if (teacher.userId) {
      await db.delete(users).where(eq(users.id, teacher.userId));
    }

    // Delete teacher
    await db.delete(teachers).where(eq(teachers.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
