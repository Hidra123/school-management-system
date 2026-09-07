import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { users, userPermissions } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { ROLE_PRESETS } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user permissions
    const permissions = await db
      .select({ permission: userPermissions.permission })
      .from(userPermissions)
      .where(eq(userPermissions.userId, user.id));

    return NextResponse.json({
      user,
      permissions: permissions.map((p) => p.permission),
    });
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
      username,
      email,
      role,
      active,
      password: rawPassword,
      permissions: selectedPermissions,
    } = await request.json();

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if username is being changed and if it already exists
    if (username && username !== existing.username) {
      const [usernameExists] = await db
        .select()
        .from(users)
        .where(and(eq(users.username, username), ne(users.id, parseInt(id))))
        .limit(1);

      if (usernameExists) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 400 }
        );
      }
    }

    // Update user
    const updates: Record<string, any> = {
      name: name || existing.name,
      username: username || existing.username,
      email: email !== undefined ? email : existing.email,
      role: role || existing.role,
      active: active !== undefined ? active : existing.active,
    };

    if (rawPassword) {
      updates.password = hashPassword(rawPassword);
      updates.rawPassword = rawPassword;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, parseInt(id)))
      .returning();

    // Update permissions
    if (selectedPermissions && Array.isArray(selectedPermissions)) {
      // Delete existing permissions
      await db
        .delete(userPermissions)
        .where(eq(userPermissions.userId, parseInt(id)));

      // Add new permissions
      for (const permission of selectedPermissions) {
        await db.insert(userPermissions).values({
          userId: parseInt(id),
          permission,
        });
      }
    }

    return NextResponse.json({ success: true, user: updatedUser });
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

    // Delete user permissions first
    await db
      .delete(userPermissions)
      .where(eq(userPermissions.userId, parseInt(id)));

    // Delete user
    await db.delete(users).where(eq(users.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
