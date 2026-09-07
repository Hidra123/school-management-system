import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { staffAssignments, users, userPermissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ROLE_PRESETS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignments = await db.select().from(staffAssignments).orderBy(staffAssignments.id);

    // Enrich with user data
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const [user] = await db
          .select({ name: users.name, username: users.username, role: users.role })
          .from(users)
          .where(eq(users.id, assignment.userId))
          .limit(1);
        return { ...assignment, user };
      })
    );

    return NextResponse.json({ assignments: enrichedAssignments });
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

    const { userId, assignmentType, details } = await request.json();

    if (!userId || !assignmentType) {
      return NextResponse.json(
        { error: "userId and assignmentType are required" },
        { status: 400 }
      );
    }

    // Create assignment
    const [newAssignment] = await db
      .insert(staffAssignments)
      .values({
        userId: parseInt(userId),
        assignmentType,
        details: details || null,
      })
      .returning();

    // Update user role
    await db
      .update(users)
      .set({ role: assignmentType })
      .where(eq(users.id, parseInt(userId)));

    // Delete existing permissions for this user
    await db
      .delete(userPermissions)
      .where(eq(userPermissions.userId, parseInt(userId)));

    // Grant permissions based on role preset
    const permissions = ROLE_PRESETS[assignmentType] || [];
    for (const permission of permissions) {
      await db.insert(userPermissions).values({
        userId: parseInt(userId),
        permission,
      });
    }

    return NextResponse.json({ success: true, assignment: newAssignment });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
