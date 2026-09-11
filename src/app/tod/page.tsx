"use client";


import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { EmptyState, Loader, PageHeader, btnPrimary, inputCls } from "@/components/ui";
import { cls, postJSON, useFetch, todayStr } from "@/lib/utils";


const SECTIONS = [
  ["1", "PUNCTUALITY", ["All students arrived on time", "Most students arrived on time", "Some students arrived late", "Many students arrived late"]],
  ["2", "CLEANLINESS", ["School compound and classrooms are clean", "Fairly clean", "Needs improvement"]],
  ["3", "ACADEMICS", ["All lessons conducted as per timetable", "Most lessons conducted as per timetable", "Some lessons were missed", "Lessons interrupted"]],
  ["4", "DISCIPLINE", ["Students were well disciplined throughout the day", "Generally disciplined with minor issues", "Several disciplinary cases reported"]],
  ["5", "BREAKFAST & MEAL", ["Breakfast and meals served on time, students satisfied", "Meals served on time", "Delayed meal service", "Complaints about meals"]],
  ["6", "HEALTH", ["No health issues reported", "A few students received first aid", "Students taken to clinic", "Serious health issue occurred"]],
  ["7", "VISITORS", ["No visitors today", "A few visitors received", "Parents visited", "Government officials visited"]],
  ["8", "SPECIAL EVENT(S)", ["None", "Examination in progress", "School event held", "Special assembly"]],
  ["9", "SECURITY", ["School security is good, no incidents", "Minor security concern", "Security incident occurred"]],
  ["10", "SPORT AND GAMES", ["No sports activities today", "Sports activities conducted", "Inter-class matches held", "Sports day preparations"]],
] as const;


type Row = { classId: number; className: string; rb: number; rg: number; ab: number; ag: number; sb: number; sg: number; pb: number; pg: number };
type Report = { id: number; date: string; teacherId: number | null; teacherName: string; answers: string; attendanceRows: string; todComment: string; headComment: string; headAcknowledged: boolean };
type Data = { roster: Row[]; mine: Report | null; myTeacher?: { id: number; name: string } | null; settings?: Settings };
type Settings = { schoolName: string; councilName: string; motto: string; headOfSchoolName: string; logoData: string };


function esc(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;"); }
function signatureName(name: string) { const p = name.trim().split(/\\s+/).filter(Boolean); if (!p.length) return ""; if (p.length === 1) return p[0]; return p.slice(0, -1).map((x) => x[0].toUpperCase()).join(".") + ". " + p[p.length - 1]; }
function todComment(pct: number, absent: number) { if (pct >= 90) return `Attendance was excellent at ${pct}%. We appreciate the students and teachers for maintaining a strong attendance record. ${absent} absent student(s) should be followed up.`; if (pct >= 80) return `Attendance was good at ${pct}%. We will continue encouraging the ${absent} absent student(s) to attend regularly.`; if (pct >= 70) return `Attendance was moderate at ${pct}%. Class teachers should follow up with the ${absent} absent student(s) and improve attendance.`; return `Attendance was concerningly low at ${pct}%. Immediate follow-up is required for the ${absent} absent student(s).`; }
function headComment(pct: number, absent: number) { if (pct >= 90) return `Excellent attendance at ${pct}%. The effort is acknowledged and appreciated. Keep it up.`; if (pct >= 80) return `Attendance is good at ${pct}%. The ${absent} absent case(s) require follow-up. This T.O.D. report is acknowledged.`; if (pct >= 70) return `Attendance at ${pct}% must improve. Class teachers are directed to follow up with the ${absent} absent student(s). Report acknowledged.`; return `Urgent action is required: attendance is ${pct}%. Follow up with the ${absent} absent student(s) within 24 hours. Report acknowledged.`; }


export default function TodPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayStr());
  const { data, loading, error, refresh } = useFetch<Data>(`/api/tod?date=${date}`);
  const settingsFetch = useFetch<Settings>("/api/school-settings");
