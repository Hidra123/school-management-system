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

// ---------- Timetable ----------
// One lesson slot per (class, day, period). The Academic Master builds the
// general school timetable by filling these cells; teachers only ever READ
// the entries that involve their assigned classes/subjects.
export const timetableEntries = pgTable(
  "timetable_entries",
  {
    id: serial("id").primaryKey(),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    // 1 = Monday .. 5 = Friday (see src/lib/timetableConfig.ts).
    dayOfWeek: integer("day_of_week").notNull(),
    // Lesson period number 1..9 (breaks/lunch/assembly are fixed slots in
    // src/lib/timetableConfig.ts and are NOT stored in the database).
    period: integer("period").notNull(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    // Denormalized from subjects.teacherId at save time so a teacher's own
    // timetable can be one fast lookup; nullable when the subject is unassigned.
    teacherId: integer("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    academicYear: varchar("academic_year", { length: 10 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("timetable_class_day_period_idx").on(t.classId, t.dayOfWeek, t.period)],
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
export type TimetableEntryRow = typeof timetableEntries.$inferSelect;
