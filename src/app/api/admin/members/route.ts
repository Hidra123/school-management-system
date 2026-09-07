import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { users, userPermissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { ROLE_PRESETS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allUsers = await db.select().from(users).orderBy(users.id);
    return NextResponse.json({ users: allUsers });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
      username,
      email,
      role,
      password: rawPassword,
      permissions: selectedPermissions,
    } = await request.json();

    if (!name || !username) {
      return NextResponse.json(
        { error: "Name and username are required" },
        { status: 400 }
      );
    }

    // Check if username exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Use default password if not provided
    const finalRawPassword = rawPassword || "shulehub2025";
    const password = hashPassword(finalRawPassword);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        username,
        email: email || null,
        password,
        rawPassword: finalRawPassword,
        role: role || "member",
        active: true,
        mustChangePassword: true, // Force password change on first login
      })
      .returning();

    // Grant permissions based on role preset or selected permissions
    let permissionsToGrant: string[] = [];
    if (selectedPermissions && Array.isArray(selectedPermissions)) {
      permissionsToGrant = selectedPermissions;
    } else if (role && ROLE_PRESETS[role]) {
      permissionsToGrant = ROLE_PRESETS[role];
    }

    // Grant permissions
    for (const permission of permissionsToGrant) {
      await db.insert(userPermissions).values({
        userId: newUser.id,
        permission,
      });
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      rawPassword: finalRawPassword,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
