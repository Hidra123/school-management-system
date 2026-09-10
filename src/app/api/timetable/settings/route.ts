import { eq } from "drizzle-orm";
import { db } from "@/db";
import { timetableSettings } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, hasPermission, requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  const isManager =
    user.role === "admin" ||
    user.staffRole === "academic_master" ||
    hasPermission(user, "timetable.manage");

  if (!isManager) {
    return Response.json(
      { error: "Only Academic Master or Admin can update timetable settings." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid data." }, { status: 400 });

  try {
    const existing = await db.select().from(timetableSettings).limit(1);

    const patch = {
      councilName:
        typeof body.councilName === "string" && body.councilName.trim()
          ? body.councilName.trim()
          : "ROMBO DISTRICT COUNCIL",
      schoolName:
        typeof body.schoolName === "string" && body.schoolName.trim()
          ? body.schoolName.trim()
          : "MANGI WINGIA SECONDARY SCHOOL",
      academicYear:
        typeof body.academicYear === "string" && body.academicYear.trim()
          ? body.academicYear.trim()
          : "2026",
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : "GENERAL TEACHING TIME TABLE: 2026",
      breakTime:
        typeof body.breakTime === "string" && body.breakTime.trim()
          ? body.breakTime.trim()
          : "10:40 - 11:00",
      lunchTime:
        typeof body.lunchTime === "string" && body.lunchTime.trim()
          ? body.lunchTime.trim()
          : "13:00 - 13:30",
      assemblyTime:
        typeof body.assemblyTime === "string" && body.assemblyTime.trim()
          ? body.assemblyTime.trim()
          : "14:50 - 15:00",
      extraCurriculumTime:
        typeof body.extraCurriculumTime === "string" &&
        body.extraCurriculumTime.trim()
          ? body.extraCurriculumTime.trim()
          : "15:00 - 16:30",
      mondayExtra:
        typeof body.mondayExtra === "string" ? body.mondayExtra.trim() : "Sport & Game",
      tuesdayExtra:
        typeof body.tuesdayExtra === "string" ? body.tuesdayExtra.trim() : "Subject Clubs",
      wednesdayExtra:
        typeof body.wednesdayExtra === "string" ? body.wednesdayExtra.trim() : "Debate",
      thursdayExtra:
        typeof body.thursdayExtra === "string" ? body.thursdayExtra.trim() : "Self Study",
      fridayExtra:
        typeof body.fridayExtra === "string"
          ? body.fridayExtra.trim()
          : "General Cleanliness",
      notes:
        typeof body.notes === "string"
          ? body.notes.trim()
          : "Note: HIS/TZ – Historia ya Tanzania na Maadili, CIV – Civics, HIS – History, GEO – Geography, KISW – Kiswahili, ENG – English, PHY – Physics, CHEM – Chemistry, BIO – Biology, MATH – Mathematics, B/STD – Business Studies, CSC – Computer Science, PS – Private Studies.",
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      const [inserted] = await db.insert(timetableSettings).values(patch).returning();
      return Response.json(inserted);
    } else {
      const [updated] = await db
        .update(timetableSettings)
        .set(patch)
        .where(eq(timetableSettings.id, existing[0].id))
        .returning();
      return Response.json(updated);
    }
  } catch (e) {
    return dbErrorResponse(e, "save timetable settings");
  }
}
