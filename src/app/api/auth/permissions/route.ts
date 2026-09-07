import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { userPermissions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ permissions: [] }, { status: 401 });
    }

    const permissions = await db
      .select({ permission: userPermissions.permission })
      .from(userPermissions)
      .where(eq(userPermissions.userId, session.userId));

    return NextResponse.json({
      permissions: permissions.map((p) => p.permission),
    });
  } catch {
    return NextResponse.json({ permissions: [] }, { status: 500 });
  }
}
