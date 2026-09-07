import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  date,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table - for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  password: text("password").notNull(),
  rawPassword: text("rawPassword"),
  role: varchar("role", { length: 20 }).notNull().default("member"),
  active: boolean("active").notNull().default(true),
  mustChangePassword: boolean("mustChangePassword").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// User permissions junction table
export const userPermissions = pgTable("user_permissions", {
  userId: integer("userId").notNull(),
  permission: varchar("permission", { length: 100 }).notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.permission] }),
  };
});

// Classes table
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  section: varchar("section", { length: 50 }),
  capacity: integer("capacity"),
  teacherId: integer("teacherId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Teachers table - linked to users
export const teachers = pgTable("teachers", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  subject: text("subject"),
  qualification: text("qualification"),
  hireDate: date("hireDate"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Subjects table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  teacherId: integer("teacherId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  admissionNo: varchar("admissionNo", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  gender: varchar("gender", { length: 10 }),
  classId: integer("classId"),
  guardianName: text("guardianName"),
  guardianPhone: varchar("guardianPhone", { length: 20 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Attendance table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("studentId").notNull(),
  classId: integer("classId").notNull(),
  date: date("date").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Grades table
export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  studentId: integer("studentId").notNull(),
  subjectId: integer("subjectId").notNull(),
  examType: varchar("examType", { length: 50 }).notNull(),
  term: varchar("term", { length: 20 }).notNull(),
  score: integer("score"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Fees table
export const fees = pgTable("fees", {
  id: serial("id").primaryKey(),
  studentId: integer("studentId").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  paidAmount: integer("paidAmount").notNull().default(0),
  dueDate: date("dueDate"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Parents table
export const parents = pgTable("parents", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  studentIds: text("studentIds"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Assignments table (for staff assignments/roles)
export const staffAssignments = pgTable("staff_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  assignmentType: varchar("assignmentType", { length: 50 }).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Admissions table (pending approvals)
export const admissions = pgTable("admissions", {
  id: serial("id").primaryKey(),
  studentName: text("studentName").notNull(),
  admissionNo: varchar("admissionNo", { length: 50 }).notNull().unique(),
  gender: varchar("gender", { length: 10 }),
  classId: integer("classId"),
  guardianName: text("guardianName").notNull(),
  guardianPhone: varchar("guardianPhone", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Audit trail table
export const auditTrail = pgTable("audit_trail", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  username: varchar("username", { length: 50 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: integer("entityId"),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Activity control table
export const activityControl = pgTable("activity_control", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  feature: varchar("feature", { length: 100 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Live sessions table
export const liveSessions = pgTable("live_sessions", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacherId"),
  classId: integer("classId"),
  subjectId: integer("subjectId"),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"),
  meetingLink: varchar("meetingLink", { length: 500 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("senderId").notNull(),
  receiverId: integer("receiverId"),
  subject: varchar("subject", { length: 200 }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Timetable table
export const timetable = pgTable("timetable", {
  id: serial("id").primaryKey(),
  classId: integer("classId").notNull(),
  subjectId: integer("subjectId").notNull(),
  teacherId: integer("teacherId"),
  dayOfWeek: integer("dayOfWeek").notNull(),
  startTime: varchar("startTime", { length: 10 }).notNull(),
  endTime: varchar("endTime", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Lesson plans table
export const lessonPlans = pgTable("lesson_plans", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacherId").notNull(),
  subjectId: integer("subjectId").notNull(),
  classId: integer("classId"),
  title: varchar("title", { length: 200 }).notNull(),
  objectives: text("objectives"),
  content: text("content"),
  resources: text("resources"),
  date: date("date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Log book table
export const logBook = pgTable("log_book", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacherId").notNull(),
  subjectId: integer("subjectId").notNull(),
  classId: integer("classId"),
  date: date("date").notNull(),
  topic: varchar("topic", { length: 200 }).notNull(),
  content: text("content"),
  remarks: text("remarks"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Teacher on duty table
export const teacherOnDuty = pgTable("teacher_on_duty", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacherId").notNull(),
  date: date("date").notNull(),
  dutyType: varchar("dutyType", { length: 50 }).notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Exams table
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  examType: varchar("examType", { length: 50 }).notNull(),
  term: varchar("term", { length: 20 }).notNull(),
  classId: integer("classId"),
  subjectId: integer("subjectId"),
  startDate: date("startDate"),
  endDate: date("endDate"),
  totalMarks: integer("totalMarks"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// System settings table
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;
export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;
export type Fee = typeof fees.$inferSelect;
export type NewFee = typeof fees.$inferInsert;
export type Parent = typeof parents.$inferSelect;
export type NewParent = typeof parents.$inferInsert;
export type StaffAssignment = typeof staffAssignments.$inferSelect;
export type NewStaffAssignment = typeof staffAssignments.$inferInsert;
export type Admission = typeof admissions.$inferSelect;
export type NewAdmission = typeof admissions.$inferInsert;
export type AuditTrail = typeof auditTrail.$inferSelect;
export type NewAuditTrail = typeof auditTrail.$inferInsert;
export type ActivityControl = typeof activityControl.$inferSelect;
export type NewActivityControl = typeof activityControl.$inferInsert;
export type LiveSession = typeof liveSessions.$inferSelect;
export type NewLiveSession = typeof liveSessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Timetable = typeof timetable.$inferSelect;
export type NewTimetable = typeof timetable.$inferInsert;
export type LessonPlan = typeof lessonPlans.$inferSelect;
export type NewLessonPlan = typeof lessonPlans.$inferInsert;
export type LogBook = typeof logBook.$inferSelect;
export type NewLogBook = typeof logBook.$inferInsert;
export type TeacherOnDuty = typeof teacherOnDuty.$inferSelect;
export type NewTeacherOnDuty = typeof teacherOnDuty.$inferInsert;
export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
