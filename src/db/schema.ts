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
export const examTypeEnum = pgEnum("exam_type", [
  "assignment",
  "quiz",
  "midterm",
  "final",
  "project",
]);
export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);

// ---------- Auth Tables ----------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 120 }).notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("member"),
  active: boolean("active").notNull().default(true),
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

export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    admissionNo: varchar("admission_no", { length: 30 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    gender: genderEnum("gender").notNull().default("male"),
    classId: integer("class_id").references(() => classes.id, {
      onDelete: "set null",
    }),
    guardianName: varchar("guardian_name", { length: 120 }).notNull().default(""),
    guardianPhone: varchar("guardian_phone", { length: 40 }).notNull().default(""),
    enrollmentDate: date("enrollment_date", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("students_admission_no_idx").on(t.admissionNo)],
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
    status: attendanceStatusEnum("status").notNull().default("present"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("attendance_class_date_idx").on(t.classId, t.date),
    uniqueIndex("attendance_student_date_idx").on(t.studentId, t.date),
  ],
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
    examType: examTypeEnum("exam_type").notNull(),
    term: varchar("term", { length: 60 }).notNull().default("Term 1"),
    score: doublePrecision("score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("grades_student_subject_idx").on(t.studentId, t.subjectId)],
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

// ---------- Types ----------
export type UserRow = typeof users.$inferSelect;
export type UserPermRow = typeof userPermissions.$inferSelect;
export type ClassRow = typeof classes.$inferSelect;
export type TeacherRow = typeof teachers.$inferSelect;
export type SubjectRow = typeof subjects.$inferSelect;
export type StudentRow = typeof students.$inferSelect;
export type AttendanceRow = typeof attendance.$inferSelect;
export type GradeRow = typeof grades.$inferSelect;
export type FeeRow = typeof fees.$inferSelect;
