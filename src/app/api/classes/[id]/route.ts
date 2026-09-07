import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { classes } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    const [cls] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, parseInt(id)))
      .limit(1);

    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    return NextResponse.json({ class: cls });
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
    const { name, section, capacity } = await request.json();

    const [existing] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, parseInt(id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(classes)
      .set({
        name: name || existing.name,
        section: section !== undefined ? section : existing.section,
        capacity: capacity !== undefined ? capacity : existing.capacity,
      })
      .where(eq(classes.id, parseInt(id)))
      .returning();

    return NextResponse.json({ success: true, class: updated });
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
    await db.delete(classes).where(eq(classes.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
