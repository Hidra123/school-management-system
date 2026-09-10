import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------
export const genderEnum = pgEnum("gender", ["male", "female"]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
]);
/**
 * Exam types for grades (Submit Scores).
 * "SE" and "CA" are the two CURRENT types — see src/lib/examTypes.ts:
 *   SE = School Examination, CA = Continuously Assessment.
 * The old values are kept only so existing rows and older clients keep
 * working; the UI never offers them and Neon SQL migrates old rows to SE/CA.
 */
export const examTypeEnum = pgEnum("exam_type", [
  "SE",
  "CA",
  "assignment",
  "quiz",
  "midterm",
  "final",
  "project",
]);
export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const attendanceSessionEnum = pgEnum("attendance_session", ["morning", "afternoon"]);
export const examStatusEnum = pgEnum("exam_status", ["active", "inactive"]);

// ---------- Auth Tables ----------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  username: varchar("username", { length: 60 }).notNull().unique(),
  email: varchar("email", { length: 120 }).notNull().default(""),
  password: text("password").notNull(),
  rawPassword: varchar("raw_password", { length: 120 }).notNull().default(""),
  role: userRoleEnum("role").notNull().default("member"),
  active: boolean("active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  // Human-readable staff role key (e.g. "class_teacher", "teacher", "academic_master",
  // "accountant", "sports", "lab", "librarian") used to show a role badge in the UI.
  staffRole: varchar("staff_role", { length: 40 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPermissions = pgTable(
  "user_permissions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 60 }).notNull(),
  },
  (t) => [uniqueIndex("user_perm_idx").on(t.userId, t.permission)],
);

// ---------- School Tables ----------
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  section: varchar("section", { length: 40 }).notNull().default(""),
  capacity: integer("capacity").notNull().default(40),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  // Link to the login account in `users` (created automatically by admin)
  userId: integer("user_id")
    .unique()
    .references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 120 }).notNull().default(""),
  phone: varchar("phone", { length: 40 }).notNull().default(""),
  subject: varchar("subject", { length: 100 }).notNull().default(""),
  qualification: varchar("qualification", { length: 150 }).notNull().default(""),
  hireDate: date("hire_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().default(""),
  teacherId: integer("teacher_id").references(() => teachers.id, {
    onDelete: "set null",
  }),
  // Optional/elective subjects (e.g. Civics F3-4, Computer Application F1...) —
  // only students mapped to them appear when submitting scores.
  isOptional: boolean("is_optional").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Which classes a teacher is assigned to (many-to-many).
// A teacher only sees students/attendance/grades for their assigned classes,
// and only the subjects assigned to them (subjects.teacherId).
export const teacherClasses = pgTable(
  "teacher_classes",
  {
    id: serial("id").primaryKey(),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("teacher_class_idx").on(t.teacherId, t.classId)],
);

export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    // Admission numbers are only unique WITHIN a class (many schools restart
    // numbering per class, e.g. every class has its own S6790-001, S6790-002...),
    // so there is intentionally NO global unique() on this column — see the
    // composite index below instead.
    admissionNo: varchar("admission_no", { length: 30 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    gender: genderEnum("gender").notNull().default("male"),
    classId: integer("class_id").references(() => classes.id, {
      onDelete: "set null",
    }),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    guardianName: varchar("guardian_name", { length: 120 }).notNull().default(""),
    guardianPhone: varchar("guardian_phone", { length: 40 }).notNull().default(""),
    guardianAddress: varchar("guardian_address", { length: 200 }).notNull().default(""),
    enrollmentDate: date("enrollment_date", { mode: "string" }),
  // Members (e.g. Academic Master) can admit students, but the admin approves them.
  admissionStatus: varchar("admission_status", { length: 12 }).notNull().default("approved"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Admission number must be unique per class (not school-wide). Students
  // with no class assigned (classId IS NULL) are exempt from this check,
  // since NULL values are never considered equal in a Postgres unique index.
  (t) => [uniqueIndex("students_class_admission_no_idx").on(t.classId, t.admissionNo)],
);

export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    // Attendance is taken twice a day: morning and afternoon.
    session: attendanceSessionEnum("session").notNull().default("morning"),
    status: attendanceStatusEnum("status").notNull().default("present"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("attendance_class_date_idx").on(t.classId, t.date),
    uniqueIndex("attendance_student_date_session_idx").on(t.studentId, t.date, t.session),
  ],
);

// ---------- Examinations (NECTA-style) ----------
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  // ONLY two values are allowed: "SE" (School Examination) or
  // "CA" (Continuously Assessment) — validated in the API and enforced in the
  // UI dropdown. See src/lib/examTypes.ts.
  examType: varchar("exam_type", { length: 20 }).notNull().default("SE"),
  academicYear: varchar("academic_year", { length: 10 }).notNull().default(""),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  remarks: varchar("remarks", { length: 300 }).notNull().default(""),
  // Inactive exams are hidden from teachers (cannot submit scores against them).
  status: examStatusEnum("status").notNull().default("active"),
  // Exams created by the Academic Master wait for admin approval before teachers may use them.
  approvalStatus: varchar("approval_status", { length: 12 }).notNull().default("approved"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Which classes an exam applies to. No rows for an exam = applies to ALL classes
// (matches the "Leave blank for all classes" hint in the Create Examination form).
export const examClasses = pgTable(
  "exam_classes",
  {
    id: serial("id").primaryKey(),
    examId: integer("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("exam_class_idx").on(t.examId, t.classId)],
);

// Single global window during which teachers may submit exam scores.
// Stored as one row (id=1) rather than a generic key/value table for simplicity.
export const examSettings = pgTable("exam_settings", {
  id: serial("id").primaryKey(),
  submissionOpensAt: timestamp("submission_opens_at", { withTimezone: true }),
  submissionClosesAt: timestamp("submission_closes_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Behavioural ratings + comments shown on an individual student's report card.
// One row per (student, exam).
export const studentExamRemarks = pgTable(
  "student_exam_remarks",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    examId: integer("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    // JSON map of criteria label -> rating letter (A-F), e.g.
    // {"Communication Skills":"B","Team Work & Collaboration":"A"}
    behaviorRatings: text("behavior_ratings").notNull().default("{}"),
    academicComment: varchar("academic_comment", { length: 300 }).notNull().default(""),
    principalComment: varchar("principal_comment", { length: 300 }).notNull().default(""),
    academicMasterName: varchar("academic_master_name", { length: 120 }).notNull().default(""),
    headmasterName: varchar("headmaster_name", { length: 120 }).notNull().default(""),
  // Class Teacher behavioural assessments wait for admin approval before printing.
  approvalStatus: varchar("approval_status", { length: 12 }).notNull().default("approved"),
  // Same flag as a boolean for the report card and admin admissiions checks.
  isApproved: boolean("is_approved").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("student_exam_remarks_idx").on(t.studentId, t.examId)],
);

export const grades = pgTable(
  "grades",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    // "SE" (School Examination) or "CA" (Continuously Assessment).
    examType: examTypeEnum("exam_type").notNull().default("SE"),
    term: varchar("term", { length: 60 }).notNull().default("Term 1"),
    score: doublePrecision("score").notNull().default(0),
    // Links a score entry to a specific named Examination (Manage Examinations
    // module). Nullable for backward compatibility with older ad-hoc scores
    // entered before this module existed (assignment/quiz/project entries
    // typically won't have an exam attached).
    examId: integer("exam_id").references(() => exams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("grades_student_subject_idx").on(t.studentId, t.subjectId),
    index("grades_exam_idx").on(t.examId),
  ],
);

export const fees = pgTable("fees", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  description: varchar("description", { length: 160 }).notNull().default("School fee"),
  amount: doublePrecision("amount").notNull().default(0),
  paidAmount: doublePrecision("paid_amount").notNull().default(0),
  dueDate: date("due_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Timetable Tables ----------
export const timetableSettings = pgTable("timetable_settings", {
  id: serial("id").primaryKey(),
  councilName: varchar("council_name", { length: 150 })
    .notNull()
    .default("ROMBO DISTRICT COUNCIL"),
  schoolName: varchar("school_name", { length: 150 })
    .notNull()
    .default("MANGI WINGIA SECONDARY SCHOOL"),
  academicYear: varchar("academic_year", { length: 20 })
    .notNull()
    .default("2026"),
  title: varchar("title", { length: 150 })
    .notNull()
    .default("GENERAL TEACHING TIME TABLE: 2026"),
  breakTime: varchar("break_time", { length: 50 })
    .notNull()
    .default("10:40 - 11:00"),
  lunchTime: varchar("lunch_time", { length: 50 })
    .notNull()
    .default("13:00 - 13:30"),
  assemblyTime: varchar("assembly_time", { length: 50 })
    .notNull()
    .default("14:50 - 15:00"),
  extraCurriculumTime: varchar("extra_curriculum_time", { length: 50 })
    .notNull()
    .default("15:00 - 16:30"),
  mondayExtra: varchar("monday_extra", { length: 100 })
    .notNull()
    .default("Sport & Game"),
  tuesdayExtra: varchar("tuesday_extra", { length: 100 })
    .notNull()
    .default("Subject Clubs"),
  wednesdayExtra: varchar("wednesday_extra", { length: 100 })
    .notNull()
    .default("Debate"),
  thursdayExtra: varchar("thursday_extra", { length: 100 })
    .notNull()
    .default("Self Study"),
  fridayExtra: varchar("friday_extra", { length: 100 })
    .notNull()
    .default("General Cleanliness"),
  notes: text("notes")
    .notNull()
    .default(
      "Note: HIS/TZ – Historia ya Tanzania na Maadili, CIV – Civics, HIS – History, GEO – Geography, KISW – Kiswahili, ENG – English, PHY – Physics, CHEM – Chemistry, BIO – Biology, MATH – Mathematics, B/STD – Business Studies, CSC – Computer Science, PS – Private Studies.",
    ),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const timetableSlots = pgTable(
  "timetable_slots",
  {
    id: serial("id").primaryKey(),
    dayOfWeek: integer("day_of_week").notNull(), // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
    period: integer("period").notNull(), // 1 to 9
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    teacherId: integer("teacher_id").references(() => teachers.id, {
      onDelete: "set null",
    }),
    customLabel: varchar("custom_label", { length: 50 }),
    room: varchar("room", { length: 50 }),
    academicYear: varchar("academic_year", { length: 20 })
      .notNull()
      .default("2026"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("timetable_slot_unique_idx").on(
      t.dayOfWeek,
      t.period,
      t.classId,
      t.academicYear,
    ),
    index("timetable_slot_class_idx").on(t.classId),
    index("timetable_slot_teacher_idx").on(t.teacherId),
  ],
);


// ---------- Teaching Assignments (subject x class per teacher) ----------
// The authoritative "who teaches WHAT subject in WHICH class" matrix. Small
// schools share subjects across teachers per class (e.g. Teacher X has
// Kiswahili in Form 3 & 4 while Teacher Y has the SAME subject in Form 1 & 2)
// - a single subjects.teacherId cannot express that, so assignments live here.
// One teacher per (subject, class) cell - enforced by the unique index below.
export const teacherSubjectClasses = pgTable(
  "teacher_subject_classes",
  {
    id: serial("id").primaryKey(),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("teacher_subject_class_idx").on(t.subjectId, t.classId)],
);


// ---------- Admin Approvals & System Lock ----------
// One queue for every action the admin must approve (Approve Admissions page).
// New sensitive work submitted by members lands here as "pending"; the admin
// approves or rejects it, and the linked entity flips its own status column.
export const approvals = pgTable(
  "approvals",
  {
    id: serial("id").primaryKey(),
    // "student_admission" | "exam" | "behavior_remark" (extensible later: fees, publishing...)
    type: varchar("type", { length: 30 }).notNull(),
    // id of the entity (students.id / exams.id / student_exam_remarks.id)
    refId: integer("ref_id").notNull(),
    status: varchar("status", { length: 12 }).notNull().default("pending"), // pending | approved | rejected
    // Human-readable one-liner shown in the queue.
    summary: varchar("summary", { length: 300 }).notNull().default(""),
    submittedById: integer("submitted_by_id"),
    submittedByName: varchar("submitted_by_name", { length: 120 }).notNull().default(""),
    note: varchar("note", { length: 300 }).notNull().default(""),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("approvals_status_idx").on(t.status, t.type)],
);

// Single-row global switches (id = 1) — used by Monitor Dashboards to lock or
// unlock EVERY member account at once, or single accounts via users.active.
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  allAccountsLocked: boolean("all_accounts_locked").notNull().default(false),
  lockMessage: varchar("lock_message", { length: 200 }).notNull().default(""),
  // School identity used by printed documents (TOD Duty Report, future reports)
  schoolName: varchar("school_name", { length: 150 }).notNull().default("ShuleHub School"),
  councilName: varchar("council_name", { length: 150 }).notNull().default(""),
  motto: varchar("motto", { length: 160 }).notNull().default(""),
  headOfSchoolName: varchar("head_of_school_name", { length: 120 }).notNull().default(""),
  // Uploaded logo stored as a data URL (client-resized ~240px PNG, self-contained)
  logoData: text("logo_data").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});


// ---------- Student-Subject Mapping (optional / elective subjects) ----------
// Academic Master assigns which students enrol in each optional subject.
// A mapped student may have scores submitted for that subject; unmapped ones
// never appear in the Submit Scores roster for it.
export const studentSubjectMap = pgTable(
  "student_subject_map",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("student_subject_map_idx").on(t.studentId, t.subjectId)],
);

// ---------- Academic Years & Alumni (Year Progression) ----------
export const academicYears = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  year: varchar("year", { length: 10 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(false),
  studentsArchived: integer("students_archived").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Graduated students (Form 4 completers). Full snapshot so the row stays
// readable even if the live student record changes later.
export const alumni = pgTable("alumni", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  admissionNo: varchar("admission_no", { length: 30 }).notNull().default(""),
  name: varchar("name", { length: 120 }).notNull(),
  gender: genderEnum("gender").notNull().default("male"),
  previousClassId: integer("previous_class_id"),
  previousClassName: varchar("previous_class_name", { length: 60 }).notNull().default(""),
  graduatedYear: varchar("graduated_year", { length: 10 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});


// ---------- Teacher On Duty (Daily Duty Report) ----------
// One report per (teacher, date) — sections 1-10 are SELECTION-based answers,
// attendance is per-class registered/present/absent/sick/permitted tables, and
// the printed report mirrors the official duty report layout.
export const todReports = pgTable(
  "tod_reports",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    teacherId: integer("teacher_id")
      .references(() => teachers.id, { onDelete: "set null" }),
    teacherName: varchar("teacher_name", { length: 120 }).notNull(),
    // JSON: {"1": "All students arrived on time", …, "10": "No sports activities today"}
    answers: text("answers").notNull().default("{}"),
    // JSON rows: [{"classId":1,"className":"Form 1","rb":0,"rg":0,"ab":0,"ag":0,"sb":0,"sg":0,"pb":0,"pg":0}]
    attendanceRows: text("attendance_rows").notNull().default("[]"),
    todComment: varchar("tod_comment", { length: 600 }).notNull().default(""),
    headComment: varchar("head_comment", { length: 600 }).notNull().default(""),
    headAcknowledged: boolean("head_acknowledged").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tod_teacher_date_idx").on(t.date, t.teacherName)],
);

// ---------- Types ----------
export type UserRow = typeof users.$inferSelect;
export type UserPermRow = typeof userPermissions.$inferSelect;
export type ClassRow = typeof classes.$inferSelect;
export type TeacherRow = typeof teachers.$inferSelect;
export type SubjectRow = typeof subjects.$inferSelect;
export type TeacherClassRow = typeof teacherClasses.$inferSelect;
export type StudentRow = typeof students.$inferSelect;
export type AttendanceRow = typeof attendance.$inferSelect;
export type GradeRow = typeof grades.$inferSelect;
export type FeeRow = typeof fees.$inferSelect;
export type ExamRow = typeof exams.$inferSelect;
export type ExamClassRow = typeof examClasses.$inferSelect;
export type ExamSettingsRow = typeof examSettings.$inferSelect;
export type StudentExamRemarksRow = typeof studentExamRemarks.$inferSelect;
export type TimetableSettingsRow = typeof timetableSettings.$inferSelect;
export type TimetableSlotRow = typeof timetableSlots.$inferSelect;
export type TeacherSubjectClassRow = typeof teacherSubjectClasses.$inferSelect;
export type ApprovalRow = typeof approvals.$inferSelect;
export type AppSettingsRow = typeof appSettings.$inferSelect;
export type StudentSubjectMapRow = typeof studentSubjectMap.$inferSelect;
export type AcademicYearRow = typeof academicYears.$inferSelect;
export type AlumniRow = typeof alumni.$inferSelect;
export type TodReportRow = typeof todReports.$inferSelect;
