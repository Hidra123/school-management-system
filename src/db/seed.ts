import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  attendance,
  classes,
  fees,
  grades,
  students,
  subjects,
  teachers,
  users,
} from "./schema";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const firstNamesM = [
  "Juma", "Baraka", "Emmanuel", "Godfrey", "Joseph", "Frank", "Alex", "David", "Peter", "Samwel",
  "Hassan", "Ramadhan", "Kelvin", "Elia", "Moses", "Yusuph", "Charles", "Daniel", "Festus", "Michael",
];
const firstNamesF = [
  "Neema", "Grace", "Zawadi", "Happiness", "Amina", "Rehema", "Upendo", "Joyce", "Elizabeth", "Mariamu",
  "Asha", "Mwanaidi", "Beatrice", "Catherine", "Diana", "Esther", "Fatuma", "Halima", "Irene", "Janeth",
];
const lastNames = [
  "Komba", "Mushi", "Kimaro", "Shayo", "Massawe", "Moshi", "Lyimo", "Mbise", "Swai", "Tarimo",
  "Mrema", "Kessy", "Minja", "Mollel", "Nkya", "Sanga", "Urassa", "Mndeme", "Msuya", "Mollel",
];
const guardianNames = [
  "Mr. Hassan Juma",
  "Mrs. Asha Said",
  "Mr. Peter Kimaro",
  "Mrs. Grace Moshi",
  "Mr. Emmanuel Lyimo",
  "Mrs. Rehema Mbise",
  "Mr. Joseph Tarimo",
  "Mrs. Neema Mrema",
  "Mr. Baraka Swai",
  "Mrs. Zawadi Minja",
];
const phoneBase = ["+255 712", "+255 713", "+255 754", "+255 765", "+255 716", "+255 755"];

async function main() {
  console.log("🧹 Clearing old data...");
  await db.execute(
    sql`TRUNCATE TABLE user_permissions, users, attendance, fees, grades, students, subjects, teachers, classes RESTART IDENTITY CASCADE`,
  );

  console.log("🔐 Admin user...");
  // Hash password "admin123" using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode("admin123" + "shulehub_salt_2025");
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const adminHash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await db.insert(users).values({
    name: "System Admin",
    email: "admin@shulehub.com",
    password: adminHash,
    role: "admin",
    active: true,
  });

  console.log("🏫 Classes...");
  const classDefs = [
    { name: "Grade 1", section: "A", capacity: 40 },
    { name: "Grade 2", section: "A", capacity: 45 },
    { name: "Grade 3", section: "A", capacity: 40 },
    { name: "Grade 4", section: "A", capacity: 45 },
    { name: "Grade 5", section: "A", capacity: 40 },
    { name: "Grade 6", section: "A", capacity: 40 },
    { name: "Grade 7", section: "A", capacity: 35 },
  ];
  const classRows = await db.insert(classes).values(classDefs).returning();

  console.log("👨‍🏫 Teachers...");
  const teacherDefs = [
    { name: "Neema Komba", email: "neema.komba@shulehub.ac.tz", phone: "+255 712 345 001", subject: "Mathematics", qualification: "B.Ed. Mathematics", hireDate: "2018-01-15" },
    { name: "Joseph Mushi", email: "joseph.mushi@shulehub.ac.tz", phone: "+255 713 345 002", subject: "Kiswahili", qualification: "B.A. Kiswahili", hireDate: "2019-02-10" },
    { name: "Grace Kimaro", email: "grace.kimaro@shulehub.ac.tz", phone: "+255 754 345 003", subject: "English", qualification: "B.Ed. English", hireDate: "2017-08-01" },
    { name: "Emmanuel Shayo", email: "emmanuel.shayo@shulehub.ac.tz", phone: "+255 765 345 004", subject: "Science and Technology", qualification: "B.Sc. Education", hireDate: "2020-01-05" },
    { name: "Happiness Massawe", email: "happiness.massawe@shulehub.ac.tz", phone: "+255 716 345 005", subject: "Social Studies", qualification: "B.A. Geography", hireDate: "2021-06-14" },
    { name: "Baraka Moshi", email: "baraka.moshi@shulehub.ac.tz", phone: "+255 755 345 006", subject: "Civics and Moral Education", qualification: "B.A. History", hireDate: "2019-09-01" },
    { name: "Zawadi Lyimo", email: "zawadi.lyimo@shulehub.ac.tz", phone: "+255 712 345 007", subject: "Mathematics", qualification: "M.Sc. Mathematics", hireDate: "2022-01-10" },
    { name: "Godfrey Mbise", email: "godfrey.mbise@shulehub.ac.tz", phone: "+255 713 345 008", subject: "English", qualification: "Dip. Education", hireDate: "2020-08-20" },
  ];
  const teacherRows = await db.insert(teachers).values(teacherDefs).returning();

  console.log("📚 Subjects...");
  const subjectDefs = [
    { name: "Mathematics", code: "MATH", teacherId: teacherRows[0].id },
    { name: "Kiswahili", code: "KIS", teacherId: teacherRows[1].id },
    { name: "English", code: "ENG", teacherId: teacherRows[2].id },
    { name: "Science and Technology", code: "SCI", teacherId: teacherRows[3].id },
    { name: "Social Studies", code: "SST", teacherId: teacherRows[4].id },
    { name: "Civics and Moral Education", code: "CIV", teacherId: teacherRows[5].id },
  ];
  const subjectRows = await db.insert(subjects).values(subjectDefs).returning();

  console.log("👨‍🎓 Students...");
  const studentValues: Array<{
    admissionNo: string;
    name: string;
    gender: "male" | "female";
    classId: number;
    guardianName: string;
    guardianPhone: string;
    enrollmentDate: string;
  }> = [];
  let counter = 1001;
  const feeAmountByClass = [120000, 120000, 150000, 150000, 200000, 200000, 200000];

  for (let ci = 0; ci < classRows.length; ci++) {
    const cls = classRows[ci];
    const count = ci % 2 === 0 ? 4 : 5;
    for (let i = 0; i < count; i++) {
      const female = Math.random() < 0.5;
      const name = `${female ? pick(firstNamesF) : pick(firstNamesM)} ${pick(lastNames)}`;
      const month = randInt(0, 11);
      const year = month >= 9 ? 2024 : 2025;
      const day = String(randInt(1, 26)).padStart(2, "0");
      studentValues.push({
        admissionNo: `ADM-${counter++}`,
        name,
        gender: female ? "female" : "male",
        classId: cls.id,
        guardianName: `${pick(guardianNames)} (parent of ${name.split(" ")[0]})`,
        guardianPhone: `${pick(phoneBase)} ${String(randInt(100, 999)).padStart(3, "0")} ${String(randInt(100, 999)).padStart(3, "0")}`,
        enrollmentDate: `${year}-${String(month + 1).padStart(2, "0")}-${day}`,
      });
    }
  }
  const studentRows = await db.insert(students).values(studentValues).returning();

  console.log("✅ Today's attendance...");
  const today = todayStr();
  const attValues: Array<{ studentId: number; classId: number; date: string; status: "present" | "absent" | "late" | "excused" }> = [];
  for (const s of studentRows) {
    const r = Math.random();
    let status: "present" | "absent" | "late" | "excused" = "present";
    if (r > 0.92) status = "excused";
    else if (r > 0.84) status = "late";
    else if (r > 0.72) status = "absent";
    attValues.push({ studentId: s.id, classId: s.classId!, date: today, status });
  }
  await db.insert(attendance).values(attValues);

  console.log("📝 Grades...");
  const gradeValues: Array<{
    studentId: number;
    subjectId: number;
    examType: "assignment" | "quiz" | "midterm" | "final" | "project";
    term: string;
    score: number;
  }> = [];
  const exams: Array<"assignment" | "quiz" | "midterm" | "final" | "project"> = [
    "assignment", "quiz", "midterm", "final", "project",
  ];
  for (const s of studentRows) {
    const subjA = subjectRows[randInt(0, subjectRows.length - 1)];
    let subjB = subjectRows[randInt(0, subjectRows.length - 1)];
    while (subjB.id === subjA.id) subjB = subjectRows[randInt(0, subjectRows.length - 1)];
    const examA = pick(exams);
    const examB = examA === "final" ? "midterm" : examA === "midterm" ? "final" : "quiz";
    gradeValues.push(
      { studentId: s.id, subjectId: subjA.id, examType: examA, term: "Term 1", score: randInt(40, 99) },
      { studentId: s.id, subjectId: subjB.id, examType: examB, term: "Term 1", score: randInt(35, 98) },
    );
  }
  await db.insert(grades).values(gradeValues);

  console.log("💰 Fees...");
  const duePast = "2025-03-15";
  const dueFuture = "2026-03-15";
  const feeValues: Array<{
    studentId: number;
    description: string;
    amount: number;
    paidAmount: number;
    dueDate: string | null;
  }> = [];
  studentRows.forEach((s, idx) => {
    const clsIndex = classRows.findIndex((c) => c.id === s.classId);
    const amount = feeAmountByClass[clsIndex] ?? 150000;
    const mode = idx % 4;
    let paid = 0;
    let dueDate: string | null = dueFuture;
    if (mode === 0) paid = amount; // full
    else if (mode === 1) paid = Math.round(amount / 2); // half
    else if (mode === 2) {
      paid = 0;
      dueDate = duePast; // overdue unpaid
    } else {
      paid = Math.round(amount * 0.25);
      dueDate = idx % 2 === 0 ? duePast : dueFuture; // partial, some overdue
    }
    feeValues.push({
      studentId: s.id,
      description: "Term 1 Fees — 2025",
      amount,
      paidAmount: paid,
      dueDate,
    });
  });
  await db.insert(fees).values(feeValues);

  console.log("✅ Seed completed!");
  console.log(`   Classes: ${classRows.length}`);
  console.log(`   Teachers: ${teacherRows.length}`);
  console.log(`   Subjects: ${subjectRows.length}`);
  console.log(`   Students: ${studentRows.length}`);
  console.log(`   Attendance: ${attValues.length}`);
  console.log(`   Grades: ${gradeValues.length}`);
  console.log(`   Fees: ${feeValues.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
