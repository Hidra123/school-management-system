import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { ensureAppSettings } from "@/lib/approvals";
import { getSessionUser, requireAdmin, requireAuth } from "@/lib/auth";
import { readSchoolLogos, storeSchoolLogos } from "@/lib/schoolLogos";

export const dynamic = "force-dynamic";

/** School identity used by all printed reports. Anyone logged in may read it. */
export async function GET() {
  const user = await getSessionUser();
  const err = requireAuth(user);
  if (err) return err;

  try {
    const row = await ensureAppSettings();
    const logos = readSchoolLogos(row.logoData);
    return Response.json({
      schoolName: row.schoolName,
      councilName: row.councilName,
      motto: row.motto,
      headOfSchoolName: row.headOfSchoolName,
      logoData: logos.left,
      logoLeftData: logos.left,
      logoRightData: logos.right,
    });
  } catch (e) {
    return dbErrorResponse(e, "load school settings");
  }
}

/** Admin Settings page saves the school identity here (name, council, motto, head, logo). */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  const err = requireAdmin(user);
  if (err) return err;

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request data." }, { status: 400 });

  try {
    const existing = await ensureAppSettings();
    const existingLogos = readSchoolLogos(existing.logoData);
    const logoLeftData =
      typeof body.logoLeftData === "string"
        ? body.logoLeftData
        : typeof body.logoData === "string"
          ? body.logoData
          : existingLogos.left;
    const logoRightData =
      typeof body.logoRightData === "string" ? body.logoRightData : existingLogos.right;
    const shouldStoreLogoPair =
      typeof body.logoLeftData === "string" ||
      typeof body.logoRightData === "string" ||
      (typeof body.logoData === "string" && !!existingLogos.right);
    const logoDataToStore = shouldStoreLogoPair
      ? storeSchoolLogos({ left: logoLeftData, right: logoRightData })
      : typeof body.logoData === "string"
        ? body.logoData
        : existing.logoData;
    const [updated] = await db
      .update(appSettings)
      .set({
        schoolName: typeof body.schoolName === "string" && body.schoolName.trim() ? body.schoolName.trim() : existing.schoolName,
        councilName: typeof body.councilName === "string" ? body.councilName.trim() : existing.councilName,
        motto: typeof body.motto === "string" ? body.motto.trim() : existing.motto,
        headOfSchoolName: typeof body.headOfSchoolName === "string" ? body.headOfSchoolName.trim() : existing.headOfSchoolName,
        logoData: logoDataToStore,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.id, existing.id))
      .returning();
    const updatedLogos = readSchoolLogos(updated.logoData);
    return Response.json({
      schoolName: updated.schoolName,
      councilName: updated.councilName,
      motto: updated.motto,
      headOfSchoolName: updated.headOfSchoolName,
      logoData: updatedLogos.left,
      logoLeftData: updatedLogos.left,
      logoRightData: updatedLogos.right,
    });
  } catch (e) {
    return dbErrorResponse(e, "save school settings");
  }
}
