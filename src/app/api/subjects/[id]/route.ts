import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { subjects } from "@/db/schema";
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
    const [subject] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, parseInt(id)))
      .limit(1);

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    return NextResponse.json({ subject });
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
    const { name, code, teacherId } = await request.json();

    const [existing] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, parseInt(id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Check if code is being changed and if it already exists
    if (code && code !== existing.code) {
      const [codeExists] = await db
        .select()
        .from(subjects)
        .where(eq(subjects.code, code))
        .limit(1);
      if (codeExists) {
        return NextResponse.json(
          { error: "Subject code already exists" },
          { status: 400 }
        );
      }
    }

    const [updated] = await db
      .update(subjects)
      .set({
        name: name || existing.name,
        code: code || existing.code,
        teacherId: teacherId !== undefined ? teacherId : existing.teacherId,
      })
      .where(eq(subjects.id, parseInt(id)))
      .returning();

    return NextResponse.json({ success: true, subject: updated });
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
    await db.delete(subjects).where(eq(subjects.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
