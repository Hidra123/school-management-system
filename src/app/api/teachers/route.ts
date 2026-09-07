import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { teachers, users, userPermissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { ROLE_PRESETS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all teachers with their user accounts
    const allTeachers = await db.select().from(teachers).orderBy(teachers.id);

    // Enrich with user data
    const enrichedTeachers = await Promise.all(
      allTeachers.map(async (teacher) => {
        if (teacher.userId) {
          const [user] = await db
            .select({
              username: users.username,
              rawPassword: users.rawPassword,
              email: users.email,
              active: users.active,
            })
            .from(users)
            .where(eq(users.id, teacher.userId))
            .limit(1);
          return { ...teacher, user };
        }
        return teacher;
      })
    );

    return NextResponse.json({ teachers: enrichedTeachers });
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

    const {
      name,
      email,
      phone,
      subject,
      qualification,
      hireDate,
      username: checkNumber,
    } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Generate username if not provided (check number format)
    const username = checkNumber || `TCH-${Date.now()}`;

    // Check if username exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Default password for teachers
    const defaultPassword = "shulehub2025";
    const password = hashPassword(defaultPassword);

    // Create user account
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        username,
        email: email || null,
        password,
        rawPassword: defaultPassword,
        role: "member",
        active: true,
        mustChangePassword: true, // Force password change on first login
      })
      .returning();

    // Create teacher record linked to user
    const [newTeacher] = await db
      .insert(teachers)
      .values({
        userId: newUser.id,
        name,
        email: email || null,
        phone: phone || null,
        subject: subject || null,
        qualification: qualification || null,
        hireDate: hireDate || new Date(),
      })
      .returning();

    // Grant default teacher permissions
    const defaultPermissions = ROLE_PRESETS["Subject Teacher"] || [];
    for (const permission of defaultPermissions) {
      await db.insert(userPermissions).values({
        userId: newUser.id,
        permission,
      });
    }

    return NextResponse.json({
      success: true,
      teacher: newTeacher,
      user: newUser,
      rawPassword: defaultPassword,
    });
  } catch (error) {
    console.error("Create teacher error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
