import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, teachers, todReports, timetableSettings } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { getTeacherByUserId } from "@/lib/teachers";




export const dynamic = "force-dynamic";




function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}




export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.view");
  if (err || !user) return err ?? Response.json({ error: "Not authenticated" }, { status: 401 });




  try {
    const url = new URL(req.url);
    const dateQuery = url.searchParams.get("date")?.trim() || todayStr();
    const myTeacher = await getTeacherByUserId(user.id);
    const allTeachers = await db.select({ id: teachers.id, name: teachers.name, subject: teachers.subject, phone: teachers.phone }).from(teachers).orderBy(asc(teachers.name));
    const allClasses = await db.select({ id: classes.id, name: classes.name, section: classes.section }).from(classes).orderBy(asc(classes.id));
    const studentCounts = await db.select({
      classId: students.classId,
      total: sql<number>`count(${students.id})::int`,
      boys: sql<number>`count(${students.id}) filter (where ${students.gender} = 'male')::int`,
      girls: sql<number>`count(${students.id}) filter (where ${students.gender} = 'female')::int`,
    }).from(students).where(sql`${students.classId} IS NOT NULL`).groupBy(students.classId);
    const countsMap = new Map(studentCounts.map((s) => [s.classId, s]));
    const roster = allClasses.map((c) => {
      const counts = countsMap.get(c.id) ?? { total: 0, boys: 0, girls: 0 };
      return {
        classId: c.id,

import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, students, teachers, todReports, timetableSettings } from "@/db/schema";
import { dbErrorResponse } from "@/lib/apiError";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { getTeacherByUserId } from "@/lib/teachers";


export const dynamic = "force-dynamic";


function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


export async function GET(req: Request) {
  const user = await getSessionUser();
  const err = requirePermission(user, "tod.view");
  if (err || !user) return err ?? Response.json({ error: "Not authenticated" }, { status: 401 });


  try {
    const url = new URL(req.url);
    const dateQuery = url.searchParams.get("date")?.trim() || todayStr();
    const myTeacher = await getTeacherByUserId(user.id);
    const allTeachers = await db.select({ id: teachers.id, name: teachers.name, subject: teachers.subject, phone: teachers.phone }).from(teachers).orderBy(asc(teachers.name));
    const allClasses = await db.select({ id: classes.id, name: classes.name, section: classes.section }).from(classes).orderBy(asc(classes.id));
    const studentCounts = await db.select({
      classId: students.classId,
      total: sql<number>`count(${students.id})::int`,
      boys: sql<number>`count(${students.id}) filter (where ${students.gender} = 'male')::int`,
      girls: sql<number>`count(${students.id}) filter (where ${students.gender} = 'female')::int`,
    }).from(students).where(sql`${students.classId} IS NOT NULL`).groupBy(students.classId);
    const countsMap = new Map(studentCounts.map((s) => [s.classId, s]));
    const roster = allClasses.map((c) => {
      const counts = countsMap.get(c.id) ?? { total: 0, boys: 0, girls: 0 };
      return {
        classId: c.id,
