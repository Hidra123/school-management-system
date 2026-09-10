import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { ensureAppSettings } from "@/lib/approvals";
import { getSessionUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  try {
    const row = await ensureAppSettings();
    return Response.json({ allAccountsLocked: row.allAccountsLocked, lockMessage: row.lockMessage });
  } catch (e) {
    return dbErrorResponse(e, "load system lock state");
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  try {
    const existing = await ensureAppSettings();
    const [updated] = await db
      .update(appSettings)
      .set({
        allAccountsLocked: body.allAccountsLocked === true,
        lockMessage: typeof body.lockMessage === "string" ? body.lockMessage.trim() : "",
        updatedAt: new Date(),
      })
      .where(eq(appSettings.id, existing.id))
      .returning();
    return Response.json({ allAccountsLocked: updated.allAccountsLocked, lockMessage: updated.lockMessage });
  } catch (e) {
    return dbErrorResponse(e, "save system lock state");
  }
}
