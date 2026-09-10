import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  classes,
  subjects,
  teacherSubjectClasses,
  teachers,
  timetableSettings,
  timetableSlots,
} from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, hasPermission, requireAuth } from "@/lib/auth";
import { getAssignedClassIds, getTeacherByUserId } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  const authErr = requireAuth(user);
  if (authErr || !user) return authErr ?? Response.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const teacher = await getTeacherByUserId(user.id);
    const canView =
      user.role === "admin" ||
      user.staffRole === "academic_master" ||
      hasPermission(user, "timetable.view") ||
      !!teacher;

    if (!canView) {
      return Response.json(
        { error: "You do not have permission for this action." },
        { status: 403 },
      );
    }
    const url = new URL(req.url);
    const academicYear = url.searchParams.get("academicYear")?.trim() || "2026";

    const isManager =
      user.role === "admin" ||
      user.staffRole === "academic_master" ||
      hasPermission(user, "timetable.manage");

    let assignedClassIds: number[] = [];
    if (teacher) {
      assignedClassIds = await getAssignedClassIds(teacher.id);
    }

    // 1. Settings (fallback defaults if table is empty)
    const settingsList = await db.select().from(timetableSettings).limit(1);
    const settings = settingsList[0] ?? {
      id: 1,
      councilName: "ROMBO DISTRICT COUNCIL",
      schoolName: "MANGI WINGIA SECONDARY SCHOOL",
      academicYear: "2026",
      title: "GENERAL TEACHING TIME TABLE: 2026",
      breakTime: "10:40 - 11:00",
      lunchTime: "13:00 - 13:30",
      assemblyTime: "14:50 - 15:00",
      extraCurriculumTime: "15:00 - 16:30",
      mondayExtra: "Sport & Game",
      tuesdayExtra: "Subject Clubs",
      wednesdayExtra: "Debate",
      thursdayExtra: "Self Study",
      fridayExtra: "General Cleanliness",
      notes:
        "Note: HIS/TZ – Historia ya Tanzania na Maadili, CIV – Civics, HIS – History, GEO – Geography, KISW – Kiswahili, ENG – English, PHY – Physics, CHEM – Chemistry, BIO – Biology, MATH – Mathematics, B/STD – Business Studies, CSC – Computer Science, PS – Private Studies.",
      updatedAt: new Date().toISOString(),
    };

    // 2. Classes
    const allClasses = await db
      .select({
        id: classes.id,
        name: classes.name,
        section: classes.section,
        capacity: classes.capacity,
      })
      .from(classes)
      .orderBy(asc(classes.id));

    // 3. Subjects
    const allSubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        teacherId: subjects.teacherId,
      })
      .from(subjects)
      .orderBy(asc(subjects.name));

    // 4. Teachers
    const allTeachers = await db
      .select({
        id: teachers.id,
        name: teachers.name,
        subject: teachers.subject,
        phone: teachers.phone,
        email: teachers.email,
        qualification: teachers.qualification,
      })
      .from(teachers)
      .orderBy(asc(teachers.name));

    // 5. Timetable slots with joined info
    const slots = await db
      .select({
        id: timetableSlots.id,
        dayOfWeek: timetableSlots.dayOfWeek,
        period: timetableSlots.period,
        classId: timetableSlots.classId,
        subjectId: timetableSlots.subjectId,
        teacherId: timetableSlots.teacherId,
        customLabel: timetableSlots.customLabel,
        room: timetableSlots.room,
        academicYear: timetableSlots.academicYear,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        teacherName: teachers.name,
        className: classes.name,
        classSection: classes.section,
      })
      .from(timetableSlots)
      .leftJoin(subjects, eq(timetableSlots.subjectId, subjects.id))
      .leftJoin(teachers, eq(timetableSlots.teacherId, teachers.id))
      .leftJoin(classes, eq(timetableSlots.classId, classes.id))
      .where(eq(timetableSlots.academicYear, academicYear))
      .orderBy(
        asc(timetableSlots.dayOfWeek),
        asc(timetableSlots.classId),
        asc(timetableSlots.period),
      );

    // Subject×class assignment matrix (Manage Teachers → Assign) — the
    // builder uses it to pre-select the right teacher when two teachers
    // share one subject across different classes (e.g. Kiswahili F1/F2 vs
    // F3/F4).
    const coverage = await db
      .select({
        subjectId: teacherSubjectClasses.subjectId,
        classId: teacherSubjectClasses.classId,
        teacherId: teacherSubjectClasses.teacherId,
        teacherName: teachers.name,
      })
      .from(teacherSubjectClasses)
      .innerJoin(teachers, eq(teacherSubjectClasses.teacherId, teachers.id));

    return Response.json({
      settings,
      slots,
      classes: allClasses,
      subjects: allSubjects,
      teachers: allTeachers,
      coverage,
      isManager,
      teacherId: teacher?.id ?? null,
      teacherName: teacher?.name ?? null,
      assignedClassIds,
    });
  } catch (e) {
    return dbErrorResponse(e, "load timetable");
  }
}
