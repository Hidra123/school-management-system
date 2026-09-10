"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  Badge,
  EmptyState,
  Field,
  Loader,
  Modal,
  PageHeader,
  StatCard,
  btnDanger,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { staffRoleLabel } from "@/lib/permissions";
import { cls, delJSON, postJSON, shortDate, todayStr, useFetch } from "@/lib/utils";

// ---------------- TYPES ----------------
type TeacherOption = { id: number; name: string; subject: string; phone: string };

type ClassAttendanceRow = {
  classId: number;
  className: string;
  classSection: string;
  regB: number;
  regG: number;
  regT: number;
  presB: number;
  presG: number;
  presT: number;
  absB: number;
  absG: number;
  absT: number;
  sickB: number;
  sickG: number;
  sickT: number;
  permB: number;
  permG: number;
  permT: number;
  total: number;
};

type TodReportData = {
  id?: number;
  date: string;
  teacherId?: number | null;
  teacherName: string;
  headmasterName: string;
  councilName: string;
  schoolName: string;
  motto: string;
  answers: Record<string, string>;
  attendanceRows: ClassAttendanceRow[];
  attendanceRate: number;
  todComments: string;
  headmasterComments: string;
  todSignature: string;
  headmasterSignature: string;
  headAcknowledged?: boolean;
};

type TodApiResponse = {
  date: string;
  report: {
    id: number;
    date: string;
    teacherId: number | null;
    teacherName: string;
    answers: string;
    attendanceRows: string;
    todComment: string;
    headComment: string;
    headAcknowledged: boolean;
    councilName: string;
    schoolName: string;
    headmasterName: string;
    motto: string;
    todSignature: string;
    headSignature: string;
    attendanceRate: number;
  } | null;
  defaultAttendanceRows: ClassAttendanceRow[];
  allTeachers: TeacherOption[];
  myTeacher: TeacherOption | null;
  settings: {
    councilName: string;
    schoolName: string;
    headmasterName: string;
    motto: string;
  };
  recentReports: { id: number; date: string; teacherName: string; attendanceRate: number }[];
  isAdmin: boolean;
};

// ---------------- HELPER: INITIALS GENERATOR ----------------
function generateInitials(fullName: string): string {
  if (!fullName || typeof fullName !== "string") return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const capLast = last.charAt(0).toUpperCase() + last.slice(1);
  const initials = parts.slice(0, -1).map((p) => p.charAt(0).toUpperCase() + ".").join(" ");
  return `${initials} ${capLast}`;
}

// ---------------- CRITERIA & PRESETS ----------------
type CriterionKey =
  | "punctuality"
  | "cleanliness"
  | "academics"
  | "discipline"
  | "breakfastMeal"
  | "health"
  | "visitors"
  | "specialEvents"
  | "security"
  | "sportGames";

const CRITERIA_CONFIG: {
  key: CriterionKey;
  num: number;
  title: string;
  presets: string[];
}[] = [
  {
    key: "punctuality",
    num: 1,
    title: "PUNCTUALITY",
    presets: [
      "All students arrived on time",
      "Most students arrived on time, latecomers counseled",
      "All boarders and day scholars reported punctually for morning parade",
      "Morning parade started promptly at 07:15 AM with high student punctuality",
      "Morning arrival was orderly; transport delay affected 4 students who were admitted after recording",
    ],
  },
  {
    key: "cleanliness",
    num: 2,
    title: "CLEANLINESS",
    presets: [
      "School compound and classrooms are clean",
      "Morning inspection conducted; classrooms and surroundings well maintained",
      "General cleanliness done satisfactorily; trash bins emptied and grounds swept",
      "Dormitories, dining hall, and classroom blocks inspected and found tidy",
      "Compound cleaned thoroughly during morning duty supervision",
    ],
  },
  {
    key: "academics",
    num: 3,
    title: "ACADEMICS",
    presets: [
      "All lessons conducted as per timetable",
      "Teaching and learning proceeded smoothly across all forms",
      "All scheduled periods taught; practical science sessions held successfully",
      "Morning and afternoon sessions completed with active student participation",
      "Teachers attended all periods promptly according to the master timetable",
    ],
  },
  {
    key: "discipline",
    num: 4,
    title: "DISCIPLINE",
    presets: [
      "Students were well disciplined throughout the day",
      "Good discipline maintained; calm and orderly atmosphere in classrooms",
      "Minor disciplinary cases handled amicably by the discipline committee",
      "High standard of discipline observed during parade, break, and lunch times",
      "Students observed school rules and wore proper school uniform",
    ],
  },
  {
    key: "breakfastMeal",
    num: 5,
    title: "BREAKFAST & MEAL",
    presets: [
      "Breakfast and meals served on time, students satisfied",
      "Porridge served at 10:40 AM and lunch served at 13:00 PM smoothly",
      "Kitchen staff prepared meals efficiently; queue was orderly",
      "Meals served on schedule in accordance with health and hygiene standards",
      "No meal complaints recorded; food supply was sufficient and well prepared",
    ],
  },
  {
    key: "health",
    num: 6,
    title: "HEALTH",
    presets: [
      "No health issues reported",
      "First aid administered to minor headache complaints; students recovered",
      "Two students reported feeling unwell and were attended to at the dispensary",
      "Compound clean, water points functional, no health emergencies",
      "Sick bay attended all minor medical cases promptly",
    ],
  },
  {
    key: "visitors",
    num: 7,
    title: "VISITORS",
    presets: [
      "No visitors today",
      "Parents visited for academic consultations and were attended courteously",
      "Ward Education Officer (WEO) visited the school for routine inspection",
      "Government officials registered at the security gate and completed their mission",
      "Educational stakeholders visited to discuss school development projects",
    ],
  },
  {
    key: "specialEvents",
    num: 8,
    title: "SPECIAL EVENT(S)",
    presets: [
      "Normal school day routine, no special events",
      "Examination in progress as per schedule",
      "School Examination (SE) in progress according to routine",
      "Continuous Assessment (CAs) conducted across assigned forms",
      "General school assembly and prize-giving ceremony held",
      "Departmental academic briefing conducted in staff room",
    ],
  },
  {
    key: "security",
    num: 9,
    title: "SECURITY",
    presets: [
      "School security is good, no incidents",
      "Security guards stationed at main gate; visitor log properly maintained",
      "All entry and exit points secured throughout day and night shifts",
      "Peaceful and safe environment across the entire school premises",
      "Day scholars exited orderly through the gate at closing time",
    ],
  },
  {
    key: "sportGames",
    num: 10,
    title: "SPORT AND GAMES",
    presets: [
      "No sports activities today",
      "Sports and games conducted as scheduled from 15:00 - 16:30",
      "Inter-class football and netball matches played with high morale",
      "Subject clubs and debate sessions held during extra curriculum time",
      "Extracurricular physical fitness and running sessions completed successfully",
    ],
  },
];

// Presets for TOD and Headmaster Comments
const TOD_COMMENT_TEMPLATES = [
  "The school day was generally positive. Although attendance was at {RATE}%, we appreciate the effort of students who attended. We will continue to encourage more students to attend regularly. Together, we will achieve better results in the days ahead.",
  "The day was calm, orderly, and academic goals were achieved with an overall attendance of {RATE}%. Special commendation to punctual students and dedicated staff.",
  "Overall school operations ran smoothly. Attendance stood at {RATE}% with {ABSENTS} absentees noted for follow-up. Compound cleanliness and student discipline were commendable.",
  "Teaching and learning proceeded satisfactorily. Daily routine was strictly adhered to by both students and teaching staff.",
];

const HEADMASTER_COMMENT_TEMPLATES = [
  "Attendance is good at {RATE}%. {ABSENTS} student(s) absent requires follow-up. Special events noted. The TOD report is acknowledged.",
  "Noted with thanks. Teacher on duty commended for thorough supervision and maintaining discipline. Keep up the good work.",
  "Report received and approved. Class teachers are directed to follow up immediately on the {ABSENTS} absent student(s).",
  "Satisfactory report. All departments operated according to guidelines. Let us sustain this standard.",
];

// ---------------- PRINT HELPER ----------------
function printViaIframe(htmlContent: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "10px";
  iframe.style.height = "10px";
  iframe.style.opacity = "0.01";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }
  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    try {
      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        win.print();
      }
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 5000);
    }
  }, 350);
}

// ---------------- MAIN COMPONENT ----------------
export default function TeacherOnDutyPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());

  // API Fetch
  const todFetch = useFetch<TodApiResponse>(`/api/tod?date=${selectedDate}`);
  const data = todFetch.data;

  // Form State
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [teacherName, setTeacherName] = useState<string>("");
  const [headmasterName, setHeadmasterName] = useState<string>("");
  const [councilName, setCouncilName] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [motto, setMotto] = useState<string>("");

  const [answers, setAnswers] = useState<Record<CriterionKey, string>>({
    punctuality: CRITERIA_CONFIG[0].presets[0],
    cleanliness: CRITERIA_CONFIG[1].presets[0],
    academics: CRITERIA_CONFIG[2].presets[0],
    discipline: CRITERIA_CONFIG[3].presets[0],
    breakfastMeal: CRITERIA_CONFIG[4].presets[0],
    health: CRITERIA_CONFIG[5].presets[0],
    visitors: CRITERIA_CONFIG[6].presets[0],
    specialEvents: CRITERIA_CONFIG[7].presets[0],
    security: CRITERIA_CONFIG[8].presets[0],
    sportGames: CRITERIA_CONFIG[9].presets[0],
  });

  const [attendanceRows, setAttendanceRows] = useState<ClassAttendanceRow[]>([]);
  const [todComments, setTodComments] = useState<string>("");
  const [headmasterComments, setHeadmasterComments] = useState<string>("");
  const [todSignature, setTodSignature] = useState<string>("");
  const [headmasterSignature, setHeadmasterSignature] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Settings Modal
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Initialize or load report when data arrives
  useEffect(() => {
    if (!data) return;

    if (data.report) {
      // Existing report
      const rep = data.report;
      setTeacherId(rep.teacherId ?? null);
      setTeacherName(rep.teacherName || "");
      setHeadmasterName(rep.headmasterName || data.settings.headmasterName);
      setCouncilName(rep.councilName || data.settings.councilName);
      setSchoolName(rep.schoolName || data.settings.schoolName);
      setMotto(rep.motto || data.settings.motto);

      try {
        const parsedAnswers = JSON.parse(rep.answers || "{}");
        setAnswers((prev) => ({ ...prev, ...parsedAnswers }));
      } catch {
        // ignore
      }

      try {
        const parsedAtt = JSON.parse(rep.attendanceRows || "[]");
        if (Array.isArray(parsedAtt) && parsedAtt.length > 0) {
          setAttendanceRows(parsedAtt);
        } else {
          setAttendanceRows(data.defaultAttendanceRows);
        }
      } catch {
        setAttendanceRows(data.defaultAttendanceRows);
      }

      setTodComments(rep.todComment || "");
      setHeadmasterComments(rep.headComment || "");
      setTodSignature(rep.todSignature || generateInitials(rep.teacherName));
      setHeadmasterSignature(rep.headSignature || generateInitials(rep.headmasterName || data.settings.headmasterName));
    } else {
      // New report draft
      const defTeacherName = data.myTeacher?.name || user?.name || "";
      const defTeacherId = data.myTeacher?.id ?? null;
      setTeacherId(defTeacherId);
      setTeacherName(defTeacherName);
      setHeadmasterName(data.settings.headmasterName);
      setCouncilName(data.settings.councilName);
      setSchoolName(data.settings.schoolName);
      setMotto(data.settings.motto);

      setAttendanceRows(data.defaultAttendanceRows);
      setTodComments(TOD_COMMENT_TEMPLATES[0].replace("{RATE}", "100.0").replace("{ABSENTS}", "0"));
      setHeadmasterComments(HEADMASTER_COMMENT_TEMPLATES[0].replace("{RATE}", "100.0").replace("{ABSENTS}", "0"));
      setTodSignature(generateInitials(defTeacherName));
      setHeadmasterSignature(generateInitials(data.settings.headmasterName));
    }
  }, [data, user]);

  // ---------------- AUTO-CALCULATING ATTENDANCE ----------------
  // When an input (absB, absG, sickB, sickG, permB, permG) changes for a class:
  function updateAttendanceCell(
    idx: number,
    field: "absB" | "absG" | "sickB" | "sickG" | "permB" | "permG",
    rawVal: string,
  ) {
    const num = Math.max(0, parseInt(rawVal, 10) || 0);

    setAttendanceRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[idx] };

      row[field] = num;

      // Recalculate Totals
      row.absT = row.absB + row.absG;
      row.sickT = row.sickB + row.sickG;
      row.permT = row.permB + row.permG;

      // Recalculate Presents: Registered - (Absents + Sick + Permitted)
      row.presB = Math.max(0, row.regB - (row.absB + row.sickB + row.permB));
      row.presG = Math.max(0, row.regG - (row.absG + row.sickG + row.permG));
      row.presT = row.presB + row.presG;

      row.total = row.regT;

      copy[idx] = row;
      return copy;
    });
  }

  // Calculate Table Summary Totals
  const summaryTotals = useMemo(() => {
    let regB = 0;
    let regG = 0;
    let regT = 0;
    let presB = 0;
    let presG = 0;
    let presT = 0;
    let absB = 0;
    let absG = 0;
    let absT = 0;
    let sickB = 0;
    let sickG = 0;
    let sickT = 0;
    let permB = 0;
    let permG = 0;
    let permT = 0;
    let grandTotal = 0;

    for (const r of attendanceRows) {
      regB += r.regB;
      regG += r.regG;
      regT += r.regT;
      presB += r.presB;
      presG += r.presG;
      presT += r.presT;
      absB += r.absB;
      absG += r.absG;
      absT += r.absT;
      sickB += r.sickB;
      sickG += r.sickG;
      sickT += r.sickT;
      permB += r.permB;
      permG += r.permG;
      permT += r.permT;
      grandTotal += r.total;
    }

    const rate = regT > 0 ? (presT / regT) * 100 : 0;
    const formattedRate = (Math.round(rate * 10) / 10).toFixed(1);

    return {
      regB,
      regG,
      regT,
      presB,
      presG,
      presT,
      absB,
      absG,
      absT,
      sickB,
      sickG,
      sickT,
      permB,
      permG,
      permT,
      grandTotal,
      rate,
      formattedRate,
    };
  }, [attendanceRows]);

  // Apply comment preset with auto-calculated values
  function applyTodCommentPreset(template: string) {
    const text = template
      .replace(/{RATE}/g, summaryTotals.formattedRate)
      .replace(/{ABSENTS}/g, String(summaryTotals.absT));
    setTodComments(text);
  }

  function applyHeadCommentPreset(template: string) {
    const text = template
      .replace(/{RATE}/g, summaryTotals.formattedRate)
      .replace(/{ABSENTS}/g, String(summaryTotals.absT));
    setHeadmasterComments(text);
  }

  // Teacher selection change
  function handleTeacherChange(val: string) {
    const id = Number(val);
    if (!id) {
      setTeacherId(null);
      return;
    }
    const t = data?.allTeachers.find((tch) => tch.id === id);
    if (t) {
      setTeacherId(t.id);
      setTeacherName(t.name);
      setTodSignature(generateInitials(t.name));
    }
  }

  // ---------------- SAVE REPORT ----------------
  async function handleSaveReport() {
    if (!teacherName.trim()) {
      alert("Please select or enter Teacher On Duty name.");
      return;
    }

    setSaving(true);
    setSaveSuccessMsg(null);
    try {
      await postJSON("/api/tod", {
        date: selectedDate,
        teacherId,
        teacherName: teacherName.trim(),
        headmasterName: headmasterName.trim(),
        councilName: councilName.trim(),
        schoolName: schoolName.trim(),
        motto: motto.trim(),
        answers,
        attendanceRows,
        attendanceRate: summaryTotals.rate,
        todComments,
        headmasterComments,
        todSignature,
        headmasterSignature,
      });

      setSaveSuccessMsg("✅ Teacher On Duty Report saved successfully!");
      todFetch.refresh();
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save TOD report.");
    } finally {
      setSaving(false);
    }
  }

  // ---------------- PRINT EXACT OFFICIAL REPORT (A4 PORTRAIT) ----------------
  function handlePrintReport() {
    const s = {
      council: councilName || "ROMBO DISTRICT COUNCIL",
      school: schoolName || "MANGI WINGIA SECONDARY SCHOOL",
      motto: motto || "Honor All Build Together",
      date: selectedDate,
      teacher: teacherName || "Rajabu Ibrahim kijida",
      todSig: todSignature || generateInitials(teacherName),
      head: headmasterName || "Saidi Rashid Mpambika",
      headSig: headmasterSignature || generateInitials(headmasterName),
      todComment: todComments || "The school day was generally positive.",
      headComment: headmasterComments || "The TOD report is acknowledged.",
    };

    // Build 1 to 10 criteria list
    const criteriaHtml = CRITERIA_CONFIG.map((c) => {
      const ans = answers[c.key] || c.presets[0];
      return `<div style="display:flex;align-items:baseline;margin-bottom:7px;font-size:11.5px;line-height:1.35;">
        <div style="font-weight:900;width:190px;flex-shrink:0;letter-spacing:0.3px;color:#000;">
          ${c.num}. ${c.title}
        </div>
        <div style="flex:1;border-bottom:1px dotted #000;padding-bottom:1px;font-family:'Segoe UI',Arial,sans-serif;color:#111;">
          ${ans}
        </div>
      </div>`;
    }).join("");

    // Build Attendance Table Rows
    const attendanceTableRows = attendanceRows
      .map(
        (r) => `<tr>
          <td style="border:1.5px solid #000;padding:4px 6px;font-weight:800;font-size:11px;">${r.className}</td>
          <td style="border:1px solid #000;text-align:center;padding:4px 3px;">${r.regB}</td>
          <td style="border:1px solid #000;text-align:center;padding:4px 3px;">${r.regG}</td>
          <td style="border:1.5px solid #000;text-align:center;padding:4px 3px;font-weight:800;">${r.regT}</td>
          <td style="border:1px solid #000;text-align:center;padding:4px 3px;">${r.presB}</td>
          <td style="border:1px solid #000;text-align:center;padding:4px 3px;">${r.presG}</td>
          <td style="border:1.5px solid #000;text-align:center;padding:4px 3px;font-weight:800;">${r.presT}</td>
          <td style="border:1px solid #000;text-align:center;padding:4px 3px;">${r.absB}</td>
          <td style="border:1px solid #000;text-align:center;padding:4px 3px;">${r.absG}</td>
          <td style="border:1.5px solid #000;text-align:center;padding:4px 3px;font-weight:800;">${r.absT}</td>
          <td style="border:1px solid #000;text-align:center;padding:4px 3px;">${r.sickB}</td>
          <td style="border:1px solid #000;text-align:center;padding:4px 3px;">${r.sickG}</td>
          <td style="border:1.5px solid #000;text-align:center;padding:4px 3px;font-weight:800;">${r.sickT}</td>
          <td style="border:1px solid #000;text-align:center;padding:4px 3px;">${r.permB}</td>
          <td style="border:1px solid #000;text-align:center;padding:4px 3px;">${r.permG}</td>
          <td style="border:1.5px solid #000;text-align:center;padding:4px 3px;font-weight:800;">${r.permT}</td>
          <td style="border:1.5px solid #000;text-align:center;padding:4px 6px;font-weight:900;">${r.total}</td>
        </tr>`,
      )
      .join("");

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Teacher's Duty Report - ${s.date}</title>
      <style>
        @page { size: A4 portrait; margin: 10mm 12mm 8mm 12mm; }
        * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        body { font-family: 'Times New Roman', Times, serif, Arial; color: #000; margin: 0; padding: 0; font-size: 11px; }
        .logo { text-align: center; margin-bottom: 2px; }
        .logo div { display: inline-flex; width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid #000; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; }
        .hdr { text-align: center; margin-bottom: 12px; }
        .hdr h2 { margin: 0; font-size: 14px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; }
        .hdr h1 { margin: 2px 0; font-size: 16px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
        .hdr h3 { margin: 2px 0; font-size: 14px; font-weight: 900; letter-spacing: 1px; text-decoration: underline; text-transform: uppercase; }
        .tod-line { display: flex; justify-content: space-between; font-size: 12px; font-weight: 900; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; }
        .criteria-box { margin-bottom: 12px; }
        .att-title { text-align: center; font-weight: 900; font-size: 12.5px; letter-spacing: 0.5px; margin: 10px 0 4px; text-decoration: underline; text-transform: uppercase; }
        table.att { width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 10.5px; margin-bottom: 10px; }
        table.att th { border: 1.5px solid #000; text-align: center; padding: 3px 2px; font-weight: 900; font-size: 10px; }
        table.att td { font-size: 11px; }
        .rate-box { border: 2px solid #000; padding: 6px 10px; font-size: 12.5px; font-weight: 900; margin-bottom: 12px; letter-spacing: 0.5px; }
        .cmt-title { font-weight: 900; font-size: 12px; margin-bottom: 3px; text-transform: uppercase; }
        .cmt-text { font-size: 11px; line-height: 1.45; border-bottom: 1px dotted #000; padding-bottom: 2px; margin-bottom: 8px; font-family: 'Segoe UI', Arial, sans-serif; }
        .sig-row { display: flex; justify-content: space-between; align-items: flex-end; font-size: 11.5px; font-weight: 900; margin-bottom: 14px; }
        .sig-name { border-bottom: 1px dotted #000; padding: 0 8px; font-weight: 900; }
        .sig-line { width: 220px; border-bottom: 1.5px solid #000; display: inline-flex; justify-content: center; align-items: flex-end; height: 20px; font-family: 'Brush Script MT', 'Dancing Script', 'Segoe Script', cursive, serif; font-size: 16px; font-weight: 600; font-style: italic; color: #1e3a8a; }
        .footer-motto { text-align: center; font-size: 9.5px; font-style: italic; color: #334155; margin-top: 14px; border-top: 1px solid #cbd5e1; padding-top: 5px; }
      </style>
    </head><body>
      <div class="logo">
        <div>🎓</div>
      </div>
      <div class="hdr">
        <h2>${s.council}</h2>
        <h1>${s.school}</h1>
        <h3>TEACHER'S DUTY REPORT</h3>
      </div>

      <div class="tod-line">
        <div>TEACHER ON DUTY: <u>${s.teacher}</u></div>
        <div>DATE: <u>${s.date}</u></div>
      </div>

      <div class="criteria-box">
        ${criteriaHtml}
      </div>

      <div class="att-title">
        STUDENTS ATTENDANCE ON ${s.date}
      </div>

      <table class="att">
        <thead>
          <tr>
            <th rowspan="2" style="width:75px;">CLASS</th>
            <th colspan="3">REGISTERED</th>
            <th colspan="3">PRESENTS</th>
            <th colspan="3">ABSENTS</th>
            <th colspan="3">SICK</th>
            <th colspan="3">PERMITTED</th>
            <th rowspan="2" style="width:48px;">TOTAL</th>
          </tr>
          <tr>
            <th style="width:26px;">B</th><th style="width:26px;">G</th><th style="width:28px;">T</th>
            <th style="width:26px;">B</th><th style="width:26px;">G</th><th style="width:28px;">T</th>
            <th style="width:26px;">B</th><th style="width:26px;">G</th><th style="width:28px;">T</th>
            <th style="width:26px;">B</th><th style="width:26px;">G</th><th style="width:28px;">T</th>
            <th style="width:26px;">B</th><th style="width:26px;">G</th><th style="width:28px;">T</th>
          </tr>
        </thead>
        <tbody>
          ${attendanceTableRows}
          <tr style="font-weight:900;background:#fff;">
            <td style="border:2px solid #000;padding:4px 6px;text-align:left;font-weight:900;">TOTAL</td>
            <td style="border:1.5px solid #000;text-align:center;padding:4px 2px;">${summaryTotals.regB}</td>
            <td style="border:1.5px solid #000;text-align:center;padding:4px 2px;">${summaryTotals.regG}</td>
            <td style="border:2px solid #000;text-align:center;padding:4px 2px;font-weight:900;">${summaryTotals.regT}</td>

            <td style="border:1.5px solid #000;text-align:center;padding:4px 2px;">${summaryTotals.presB}</td>
            <td style="border:1.5px solid #000;text-align:center;padding:4px 2px;">${summaryTotals.presG}</td>
            <td style="border:2px solid #000;text-align:center;padding:4px 2px;font-weight:900;">${summaryTotals.presT}</td>

            <td style="border:1.5px solid #000;text-align:center;padding:4px 2px;">${summaryTotals.absB}</td>
            <td style="border:1.5px solid #000;text-align:center;padding:4px 2px;">${summaryTotals.absG}</td>
            <td style="border:2px solid #000;text-align:center;padding:4px 2px;font-weight:900;">${summaryTotals.absT}</td>

            <td style="border:1.5px solid #000;text-align:center;padding:4px 2px;">${summaryTotals.sickB}</td>
            <td style="border:1.5px solid #000;text-align:center;padding:4px 2px;">${summaryTotals.sickG}</td>
            <td style="border:2px solid #000;text-align:center;padding:4px 2px;font-weight:900;">${summaryTotals.sickT}</td>

            <td style="border:1.5px solid #000;text-align:center;padding:4px 2px;">${summaryTotals.permB}</td>
            <td style="border:1.5px solid #000;text-align:center;padding:4px 2px;">${summaryTotals.permG}</td>
            <td style="border:2px solid #000;text-align:center;padding:4px 2px;font-weight:900;">${summaryTotals.permT}</td>

            <td style="border:2px solid #000;text-align:center;padding:4px 4px;font-weight:900;">${summaryTotals.grandTotal}</td>
          </tr>
        </tbody>
      </table>

      <div class="rate-box">
        PERCENTAGE OF ATTENDANCE: PRESENT / TOTAL × 100 = ${summaryTotals.formattedRate}%
      </div>

      <div class="cmt-title">T.O.D'S COMMENT(S):</div>
      <div class="cmt-text">${s.todComment}</div>
      <div class="sig-row">
        <div>NAME: <span class="sig-name">${s.teacher}</span></div>
        <div>SIGNATURE: <span class="sig-line">${s.todSig}</span></div>
      </div>

      <div class="cmt-title">HEADMASTER'S COMMENT(S):</div>
      <div class="cmt-text">${s.headComment}</div>
      <div class="sig-row">
        <div>NAME: <span class="sig-name">${s.head}</span></div>
        <div>SIGNATURE: <span class="sig-line">${s.headSig}</span></div>
      </div>

      <div class="footer-motto">
        ${s.motto}
      </div>
    </body></html>`;

    printViaIframe(fullHtml);
  }

  const roleBadge = user?.role === "member" ? staffRoleLabel(user.staffRole) : "🛡️ Admin";

  return (
    <AppShell permission="tod.view">
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          icon="🔰"
          title="Teacher On Duty (T.O.D.) Report"
          subtitle="Daily supervision of school routines, student attendance, discipline and security"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
              {roleBadge}
            </span>
            <button
              onClick={() => setSettingsOpen(true)}
              className={cls(btnGhost, "text-xs font-bold")}
            >
              ⚙️ School Header Settings
            </button>
            <button
              onClick={handlePrintReport}
              className={cls(btnPrimary, "text-xs font-bold flex items-center gap-1.5")}
            >
              <span>🖨️</span>
              <span>Print / Save PDF</span>
            </button>
          </div>
        </PageHeader>

        {/* Success Alert */}
        {saveSuccessMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800">
            {saveSuccessMsg}
          </div>
        )}

        {/* Top Control Card (Date, Teacher, Head of School) */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Duty Date (Tarehe)
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={cls(inputCls, "text-xs font-bold")}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Teacher On Duty (Select Teacher)
              </label>
              <select
                value={teacherId ? String(teacherId) : ""}
                onChange={(e) => handleTeacherChange(e.target.value)}
                className={cls(inputCls, "text-xs font-bold")}
              >
                <option value="">-- Choose Assigned Teacher --</option>
                {(data?.allTeachers ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subject || "Teacher"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                T.O.D. Signature Initials
              </label>
              <input
                type="text"
                value={todSignature}
                onChange={(e) => setTodSignature(e.target.value)}
                placeholder="e.g. R. I. Kijida"
                className={cls(inputCls, "text-xs font-mono font-bold text-indigo-700")}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Head of School Signature Initials
              </label>
              <input
                type="text"
                value={headmasterSignature}
                onChange={(e) => setHeadmasterSignature(e.target.value)}
                placeholder="e.g. S. R. Mpambika"
                className={cls(inputCls, "text-xs font-mono font-bold text-slate-700")}
              />
            </div>
          </div>
        </section>

        {/* Loading */}
        {todFetch.loading && !data ? (
          <Loader label="Loading Teacher On Duty report..." />
        ) : (
          <>
            {/* ============================================================== */}
            {/* SECTION 1: 10 DUTY CRITERIA (WITH PRESETS & CUSTOM INPUT)      */}
            {/* ============================================================== */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-slate-900 px-5 py-3 text-white">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>📋</span>
                  <span>10 Daily Duty Criteria (Vigezo 10 vya Usimamizi wa Kila Siku)</span>
                </div>
                <span className="text-[11px] text-slate-300">
                  Select a ready-made preset or type custom remarks
                </span>
              </div>

              <div className="p-5 space-y-3.5">
                {CRITERIA_CONFIG.map((c) => (
                  <div
                    key={c.key}
                    className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-12 items-center"
                  >
                    <div className="sm:col-span-3">
                      <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-[10px] text-white font-bold">
                          {c.num}
                        </span>
                        <span>{c.title}</span>
                      </span>
                    </div>

                    <div className="sm:col-span-4">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setAnswers((prev) => ({ ...prev, [c.key]: e.target.value }));
                          }
                        }}
                        className={cls(inputCls, "text-xs bg-white text-slate-700")}
                      >
                        <option value="">-- Choose quick preset --</option>
                        {c.presets.map((p, pIdx) => (
                          <option key={pIdx} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={answers[c.key] || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [c.key]: e.target.value }))
                        }
                        className={cls(inputCls, "text-xs font-medium text-slate-900 bg-white")}
                        placeholder={`Remark for ${c.title}...`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ============================================================== */}
            {/* SECTION 2: STUDENTS ATTENDANCE TABLE (AUTO-CALCULATING)        */}
            {/* ============================================================== */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3 text-white">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>📊</span>
                  <span>STUDENTS ATTENDANCE ON {selectedDate}</span>
                </div>
                <div className="text-xs text-slate-300">
                  Registered is prefilled. Enter <b>Absents</b> (or Sick / Permitted) and <b>Presents will auto-calculate!</b>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th rowSpan={2} className="border border-slate-800 px-3 py-2 text-left font-black w-28">
                          CLASS
                        </th>
                        <th colSpan={3} className="border border-slate-800 px-2 py-1 text-center font-bold bg-slate-800 text-slate-200">
                          REGISTERED
                        </th>
                        <th colSpan={3} className="border border-slate-800 px-2 py-1 text-center font-bold bg-emerald-950 text-emerald-200">
                          PRESENTS (Auto)
                        </th>
                        <th colSpan={3} className="border border-slate-800 px-2 py-1 text-center font-bold bg-rose-950 text-rose-200">
                          ABSENTS
                        </th>
                        <th colSpan={3} className="border border-slate-800 px-2 py-1 text-center font-bold bg-amber-950 text-amber-200">
                          SICK
                        </th>
                        <th colSpan={3} className="border border-slate-800 px-2 py-1 text-center font-bold bg-sky-950 text-sky-200">
                          PERMITTED
                        </th>
                        <th rowSpan={2} className="border border-slate-800 px-3 py-2 text-center font-black w-16">
                          TOTAL
                        </th>
                      </tr>
                      <tr className="bg-slate-800 text-slate-300 text-[10px] font-bold">
                        <th className="border border-slate-700 px-1.5 py-1">B</th>
                        <th className="border border-slate-700 px-1.5 py-1">G</th>
                        <th className="border border-slate-700 px-2 py-1 bg-slate-700 font-extrabold text-white">T</th>

                        <th className="border border-slate-700 px-1.5 py-1">B</th>
                        <th className="border border-slate-700 px-1.5 py-1">G</th>
                        <th className="border border-slate-700 px-2 py-1 bg-emerald-900 font-extrabold text-white">T</th>

                        <th className="border border-slate-700 px-1.5 py-1">B</th>
                        <th className="border border-slate-700 px-1.5 py-1">G</th>
                        <th className="border border-slate-700 px-2 py-1 bg-rose-900 font-extrabold text-white">T</th>

                        <th className="border border-slate-700 px-1.5 py-1">B</th>
                        <th className="border border-slate-700 px-1.5 py-1">G</th>
                        <th className="border border-slate-700 px-2 py-1 bg-amber-900 font-extrabold text-white">T</th>

                        <th className="border border-slate-700 px-1.5 py-1">B</th>
                        <th className="border border-slate-700 px-1.5 py-1">G</th>
                        <th className="border border-slate-700 px-2 py-1 bg-sky-900 font-extrabold text-white">T</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceRows.map((r, i) => (
                        <tr key={r.classId} className="hover:bg-slate-50">
                          <td className="border-r border-slate-200 px-3 py-2 font-extrabold text-slate-800 bg-slate-50/50">
                            {r.className}
                          </td>

                          {/* REGISTERED (Pre-populated from Database) */}
                          <td className="px-1.5 py-1 text-center font-medium text-slate-600 bg-slate-50/20">{r.regB}</td>
                          <td className="px-1.5 py-1 text-center font-medium text-slate-600 bg-slate-50/20">{r.regG}</td>
                          <td className="px-2 py-1 text-center font-black text-slate-900 bg-slate-100/60 border-r border-slate-200">{r.regT}</td>

                          {/* PRESENTS (Auto Calculated!) */}
                          <td className="px-1.5 py-1 text-center font-bold text-emerald-700 bg-emerald-50/30">{r.presB}</td>
                          <td className="px-1.5 py-1 text-center font-bold text-emerald-700 bg-emerald-50/30">{r.presG}</td>
                          <td className="px-2 py-1 text-center font-black text-emerald-800 bg-emerald-100/60 border-r border-slate-200">{r.presT}</td>

                          {/* ABSENTS (Editable inputs) */}
                          <td className="px-1 py-1 text-center bg-rose-50/20">
                            <input
                              type="number"
                              min={0}
                              max={r.regB}
                              value={r.absB}
                              onChange={(e) => updateAttendanceCell(i, "absB", e.target.value)}
                              className="w-11 text-center rounded border border-rose-200 bg-white py-0.5 text-xs font-bold text-rose-700"
                            />
                          </td>
                          <td className="px-1 py-1 text-center bg-rose-50/20">
                            <input
                              type="number"
                              min={0}
                              max={r.regG}
                              value={r.absG}
                              onChange={(e) => updateAttendanceCell(i, "absG", e.target.value)}
                              className="w-11 text-center rounded border border-rose-200 bg-white py-0.5 text-xs font-bold text-rose-700"
                            />
                          </td>
                          <td className="px-2 py-1 text-center font-black text-rose-800 bg-rose-100/60 border-r border-slate-200">{r.absT}</td>

                          {/* SICK (Editable inputs) */}
                          <td className="px-1 py-1 text-center bg-amber-50/20">
                            <input
                              type="number"
                              min={0}
                              max={r.regB}
                              value={r.sickB}
                              onChange={(e) => updateAttendanceCell(i, "sickB", e.target.value)}
                              className="w-10 text-center rounded border border-amber-200 bg-white py-0.5 text-xs font-bold text-amber-700"
                            />
                          </td>
                          <td className="px-1 py-1 text-center bg-amber-50/20">
                            <input
                              type="number"
                              min={0}
                              max={r.regG}
                              value={r.sickG}
                              onChange={(e) => updateAttendanceCell(i, "sickG", e.target.value)}
                              className="w-10 text-center rounded border border-amber-200 bg-white py-0.5 text-xs font-bold text-amber-700"
                            />
                          </td>
                          <td className="px-2 py-1 text-center font-black text-amber-800 bg-amber-100/60 border-r border-slate-200">{r.sickT}</td>

                          {/* PERMITTED (Editable inputs) */}
                          <td className="px-1 py-1 text-center bg-sky-50/20">
                            <input
                              type="number"
                              min={0}
                              max={r.regB}
                              value={r.permB}
                              onChange={(e) => updateAttendanceCell(i, "permB", e.target.value)}
                              className="w-10 text-center rounded border border-sky-200 bg-white py-0.5 text-xs font-bold text-sky-700"
                            />
                          </td>
                          <td className="px-1 py-1 text-center bg-sky-50/20">
                            <input
                              type="number"
                              min={0}
                              max={r.regG}
                              value={r.permG}
                              onChange={(e) => updateAttendanceCell(i, "permG", e.target.value)}
                              className="w-10 text-center rounded border border-sky-200 bg-white py-0.5 text-xs font-bold text-sky-700"
                            />
                          </td>
                          <td className="px-2 py-1 text-center font-black text-sky-800 bg-sky-100/60 border-r border-slate-200">{r.permT}</td>

                          {/* TOTAL */}
                          <td className="px-3 py-1 text-center font-black text-slate-900 bg-slate-50">{r.total}</td>
                        </tr>
                      ))}

                      {/* SUMMARY TOTAL ROW */}
                      <tr className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                        <td className="px-3 py-2 text-left font-black text-xs uppercase bg-slate-200 border-r border-slate-300">
                          TOTAL
                        </td>
                        <td className="px-1.5 py-2 text-center font-bold text-slate-700">{summaryTotals.regB}</td>
                        <td className="px-1.5 py-2 text-center font-bold text-slate-700">{summaryTotals.regG}</td>
                        <td className="px-2 py-2 text-center font-black text-slate-950 bg-slate-200 border-r border-slate-300">{summaryTotals.regT}</td>

                        <td className="px-1.5 py-2 text-center font-bold text-emerald-800">{summaryTotals.presB}</td>
                        <td className="px-1.5 py-2 text-center font-bold text-emerald-800">{summaryTotals.presG}</td>
                        <td className="px-2 py-2 text-center font-black text-emerald-950 bg-emerald-200 border-r border-slate-300">{summaryTotals.presT}</td>

                        <td className="px-1.5 py-2 text-center font-bold text-rose-800">{summaryTotals.absB}</td>
                        <td className="px-1.5 py-2 text-center font-bold text-rose-800">{summaryTotals.absG}</td>
                        <td className="px-2 py-2 text-center font-black text-rose-950 bg-rose-200 border-r border-slate-300">{summaryTotals.absT}</td>

                        <td className="px-1.5 py-2 text-center font-bold text-amber-800">{summaryTotals.sickB}</td>
                        <td className="px-1.5 py-2 text-center font-bold text-amber-800">{summaryTotals.sickG}</td>
                        <td className="px-2 py-2 text-center font-black text-amber-950 bg-amber-200 border-r border-slate-300">{summaryTotals.sickT}</td>

                        <td className="px-1.5 py-2 text-center font-bold text-sky-800">{summaryTotals.permB}</td>
                        <td className="px-1.5 py-2 text-center font-bold text-sky-800">{summaryTotals.permG}</td>
                        <td className="px-2 py-2 text-center font-black text-sky-950 bg-sky-200 border-r border-slate-300">{summaryTotals.permT}</td>

                        <td className="px-3 py-2 text-center font-black text-xs text-slate-950 bg-slate-200">{summaryTotals.grandTotal}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Percentage Attendance Banner */}
                <div className="rounded-xl border-2 border-slate-900 bg-white p-3.5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                    PERCENTAGE OF ATTENDANCE: PRESENT / TOTAL × 100 ={" "}
                    <span className="text-indigo-700 text-base font-black">
                      {summaryTotals.formattedRate}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      Presents: {summaryTotals.presT}
                    </span>
                    <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                      Absents: {summaryTotals.absT}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================== */}
            {/* SECTION 3: COMMENTS AND SIGNATURES                             */}
            {/* ============================================================== */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-5">
              {/* TOD Comment */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-black text-xs text-slate-900 uppercase tracking-wider">
                    T.O.D&apos;S COMMENT(S)
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) applyTodCommentPreset(e.target.value);
                    }}
                    className={cls(inputCls, "text-xs w-72 bg-white")}
                  >
                    <option value="">-- Choose TOD Comment Preset --</option>
                    {TOD_COMMENT_TEMPLATES.map((t, idx) => (
                      <option key={idx} value={t}>
                        Template {idx + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={3}
                  value={todComments}
                  onChange={(e) => setTodComments(e.target.value)}
                  placeholder="Enter Teacher on duty observations and evaluation..."
                  className={inputCls}
                />
              </div>

              {/* Headmaster Comment */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-black text-xs text-slate-900 uppercase tracking-wider">
                    HEADMASTER&apos;S COMMENT(S)
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) applyHeadCommentPreset(e.target.value);
                    }}
                    className={cls(inputCls, "text-xs w-72 bg-white")}
                  >
                    <option value="">-- Choose Headmaster Preset --</option>
                    {HEADMASTER_COMMENT_TEMPLATES.map((t, idx) => (
                      <option key={idx} value={t}>
                        Template {idx + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={headmasterComments}
                  onChange={(e) => setHeadmasterComments(e.target.value)}
                  placeholder="Head of school acknowledgement and directives..."
                  className={inputCls}
                />
              </div>

              {/* Signatures Preview */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 pt-3 border-t border-slate-100">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Teacher on duty signature
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{teacherName || "—"}</p>
                      <p className="text-[10px] text-slate-500">Teacher On Duty</p>
                    </div>
                    <div className="font-serif italic font-bold text-base text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-200">
                      {todSignature || "—"}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Head of School signature
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{headmasterName || "—"}</p>
                      <p className="text-[10px] text-slate-500">Head of School</p>
                    </div>
                    <div className="font-serif italic font-bold text-base text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200">
                      {headmasterSignature || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Report is saved for <b>{selectedDate}</b>. You can print anytime as official PDF.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveReport}
                    disabled={saving}
                    className={cls(btnPrimary, "text-xs font-bold")}
                  >
                    {saving ? "Saving..." : "💾 Save TOD Report"}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className={cls(btnGhost, "text-xs font-bold flex items-center gap-1.5")}
                  >
                    <span>🖨️</span>
                    <span>Print Official Report</span>
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Modal: School Header Settings */}
        {settingsOpen && (
          <Modal
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            title="⚙️ School Letterhead & Motto Settings"
          >
            <div className="space-y-3.5">
              <Field label="Council / District Name" required>
                <input
                  type="text"
                  value={councilName}
                  onChange={(e) => setCouncilName(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="School Name" required>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Head of School Name" required>
                <input
                  type="text"
                  value={headmasterName}
                  onChange={(e) => {
                    setHeadmasterName(e.target.value);
                    setHeadmasterSignature(generateInitials(e.target.value));
                  }}
                  className={inputCls}
                />
              </Field>

              <Field label="School Motto / Bottom Tagline">
                <input
                  type="text"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. MANGI WINGIA SECONDARY SCHOOL: Honor All Build Together"
                />
              </Field>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className={btnPrimary}
                >
                  Done
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
