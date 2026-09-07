import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/db";
import { fees } from "@/db/schema";
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
    const [fee] = await db
      .select()
      .from(fees)
      .where(eq(fees.id, parseInt(id)))
      .limit(1);

    if (!fee) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 });
    }

    return NextResponse.json({ fee });
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { paidAmount, status } = await request.json();

    const [existing] = await db
      .select()
      .from(fees)
      .where(eq(fees.id, parseInt(id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 });
    }

    const [updated] = await db
      .update(fees)
      .set({
        paidAmount:
          paidAmount !== undefined ? parseInt(paidAmount) : existing.paidAmount,
        status: status || existing.status,
      })
      .where(eq(fees.id, parseInt(id)))
      .returning();

    return NextResponse.json({ success: true, fee: updated });
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
    await db.delete(fees).where(eq(fees.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
