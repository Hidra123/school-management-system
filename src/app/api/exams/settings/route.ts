import { eq } from "drizzle-orm";
import { db } from "@/db";
import { examSettings } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getOrCreateSettingsRow() {
  const [row] = await db.select().from(examSettings).limit(1);
  if (row) return row;
  const [created] = await db.insert(examSettings).values({}).returning();
  return created;
}

export async function GET() {
  const user = await getSessionUser();
  const err = requirePermission(user, "exams.view");
  if (err) return err;

  try {
    const row = await getOrCreateSettingsRow();
    return Response.json(row);
  } catch (e) {
    return dbErrorResponse(e, "load submission deadline settings");
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "exams.manage");
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  try {
    const existing = await getOrCreateSettingsRow();
    const [updated] = await db
      .update(examSettings)
      .set({
        submissionOpensAt:
          typeof body.submissionOpensAt === "string" && body.submissionOpensAt
            ? new Date(body.submissionOpensAt)
            : null,
        submissionClosesAt:
          typeof body.submissionClosesAt === "string" && body.submissionClosesAt
            ? new Date(body.submissionClosesAt)
            : null,
        updatedAt: new Date(),
      })
      .where(eq(examSettings.id, existing.id))
      .returning();
    return Response.json(updated);
  } catch (e) {
    return dbErrorResponse(e, "save submission deadline settings");
  }
}
