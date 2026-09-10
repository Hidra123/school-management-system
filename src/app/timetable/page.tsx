"use client";

import { Fragment, useMemo, useState } from "react";
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
import { cls, delJSON, putJSON, useFetch } from "@/lib/utils";

type ClassItem = { id: number; name: string; section: string; capacity: number };
type SubjectItem = { id: number; name: string; code: string; teacherId: number | null };
type TeacherItem = { id: number; name: string; subject: string; phone: string; email: string };
type TimetableSlot = {
  id: number;
  dayOfWeek: number; // 1 to 5
  period: number; // 1 to 9
  classId: number;
  subjectId: number | null;
  teacherId: number | null;
  customLabel: string | null;
  room: string | null;
  academicYear: string;
  subjectName: string | null;
  subjectCode: string | null;
  teacherName: string | null;
  className: string | null;
  classSection: string | null;
};
type TimetableSettings = {
  id: number;
  councilName: string;
  schoolName: string;
  academicYear: string;
  title: string;
  breakTime: string;
  lunchTime: string;
  assemblyTime: string;
  extraCurriculumTime: string;
  mondayExtra: string;
  tuesdayExtra: string;
  wednesdayExtra: string;
  thursdayExtra: string;
  fridayExtra: string;
  notes: string;
};
type TimetableResponse = {
  settings: TimetableSettings;
  slots: TimetableSlot[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  teachers: TeacherItem[];
  isManager: boolean;
  teacherId: number | null;
  teacherName: string | null;
  assignedClassIds: number[];
};

const DAYS = [
  { id: 1, name: "Monday", short: "MON" },
  { id: 2, name: "Tuesday", short: "TUE" },
  { id: 3, name: "Wednesday", short: "WED" },
  { id: 4, name: "Thursday", short: "THU" },
  { id: 5, name: "Friday", short: "FRI" },
] as const;

const PERIODS = [
  { num: 1, time: "08:00 - 08:40" },
  { num: 2, time: "08:40 - 09:20" },
  { num: 3, time: "09:20 - 10:00" },
  { num: 4, time: "10:00 - 10:40" },
  { num: 5, time: "11:00 - 11:40" },
  { num: 6, time: "11:40 - 12:20" },
  { num: 7, time: "12:20 - 13:00" },
  { num: 8, time: "13:30 - 14:10" },
  { num: 9, time: "14:10 - 14:50" },
] as const;

function getExtraForDay(settings: TimetableSettings, dayOfWeek: number) {
  switch (dayOfWeek) {
    case 1:
      return settings.mondayExtra || "Sport & Game";
    case 2:
      return settings.tuesdayExtra || "Subject Clubs";
    case 3:
      return settings.wednesdayExtra || "Debate";
    case 4:
      return settings.thursdayExtra || "Self Study";
    case 5:
      return settings.fridayExtra || "General Cleanliness";
    default:
      return "Extra Curriculum";
  }
}

/** Subject badge styling for timetable grids */
function getSlotDisplay(slot: TimetableSlot | undefined) {
  if (!slot) return { label: "—", sub: "", tone: "empty", isSpecial: false };
  if (slot.customLabel) {
    const isSpecial = ["RELIGIO", "MEWAKA", "PS", "SPORTS", "DEBATE"].includes(
      slot.customLabel.toUpperCase(),
    );
    return {
      label: slot.customLabel,
      sub: slot.customLabel === "PS" ? "Private Studies" : "",
      tone: isSpecial ? "special" : "normal",
      isSpecial,
    };
  }
  // Prefer the real subject code (e.g. "GEO-013", "MATH-041"); fall back to a
  // name-derived short code; never invent a fake "SUBJ" label — when a slot
  // truly has no subject yet, leave it blank and just show the teacher.
  const code = slot.subjectCode
    ? slot.subjectCode.toUpperCase()
    : (slot.subjectName?.slice(0, 6).toUpperCase() ?? "");
  return {
    label: code || "·",
    sub: slot.teacherName || slot.subjectName || "",
    tone: code ? "subject" : "empty",
    isSpecial: false,
  };
}

// -------------------------------------------------------------
// PRINT HELPERS: Dedicated Iframe Printing (100% reliable)
// -------------------------------------------------------------
function printViaIframe(htmlContent: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }
  doc.open();
  doc.write(htmlContent);
  doc.close();
  const win = iframe.contentWindow;
  if (win) {
    win.focus();
    win.print();
  }
  setTimeout(() => document.body.removeChild(iframe), 3000);
}

export default function TimetablePage() {
  const { user } = useAuth();
  const timetableFetch = useFetch<TimetableResponse>("/api/timetable");
  const data = timetableFetch.data;

  const isManager =
    user?.role === "admin" ||
    user?.staffRole === "academic_master" ||
    data?.isManager === true;

  // Tabs
  // For Manager (Academic Master / Admin): General Timetable | Class Timetable | Teacher Timetable
  // For Teacher / Class Teacher: My Timetable | Class Timetable
  const [activeTab, setActiveTab] = useState<string>("auto");

  const effectiveTab = useMemo(() => {
    if (activeTab !== "auto") return activeTab;
    return isManager ? "general" : "my";
  }, [activeTab, isManager]);

  // Selected filters
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [dayFilter, setDayFilter] = useState<string>("all");

  // Modals
  const [editSlot, setEditSlot] = useState<{
    dayOfWeek: number;
    period: number;
    classId: number;
    subjectId: number | null;
    teacherId: number | null;
    customLabel: string;
    room: string;
    slotId?: number;
  } | null>(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [slotMsg, setSlotMsg] = useState<string | null>(null);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<TimetableSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Auto-init class filter when classes load
  const availableClasses = useMemo(() => {
    if (!data) return [];
    if (isManager) return data.classes;
    if (data.assignedClassIds && data.assignedClassIds.length > 0) {
      return data.classes.filter((c) => data.assignedClassIds.includes(c.id));
    }
    return data.classes;
  }, [data, isManager]);

  const defaultClassId = useMemo(
    () => (availableClasses[0]?.id ? String(availableClasses[0].id) : ""),
    [availableClasses],
  );

  const currentClassId = selectedClassId || defaultClassId;

  // Auto-init teacher filter
  const currentTeacherId = useMemo(() => {
    if (selectedTeacherId) return selectedTeacherId;
    if (data?.teacherId) return String(data.teacherId);
    return data?.teachers[0]?.id ? String(data.teachers[0].id) : "";
  }, [selectedTeacherId, data]);

  // Map of slot by composite key: `${dayOfWeek}-${period}-${classId}`
  const slotMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    for (const slot of data?.slots ?? []) {
      map.set(`${slot.dayOfWeek}-${slot.period}-${slot.classId}`, slot);
    }
    return map;
  }, [data?.slots]);

  // Map teacher's slots: `${dayOfWeek}-${period}` -> slot[]
  const mySlotsMap = useMemo(() => {
    const targetId = isManager && effectiveTab === "teacher"
      ? Number(currentTeacherId)
      : data?.teacherId;
    const map = new Map<string, TimetableSlot>();
    if (!targetId) return map;
    for (const slot of data?.slots ?? []) {
      if (slot.teacherId === targetId) {
        map.set(`${slot.dayOfWeek}-${slot.period}`, slot);
      }
    }
    return map;
  }, [data?.slots, data?.teacherId, isManager, effectiveTab, currentTeacherId]);

  // Workload statistics for the teacher
  const teacherStats = useMemo(() => {
    let periodsCount = 0;
    const classSet = new Set<number>();
    const subjectSet = new Set<number>();
    mySlotsMap.forEach((slot) => {
      periodsCount++;
      if (slot.classId) classSet.add(slot.classId);
      if (slot.subjectId) subjectSet.add(slot.subjectId);
    });
    const totalPossibleSlots = 5 * 9; // 45
    return {
      periodsCount,
      classesCount: classSet.size,
      subjectsCount: subjectSet.size,
      freePeriods: Math.max(0, totalPossibleSlots - periodsCount),
    };
  }, [mySlotsMap]);

  // Open Edit Slot Modal
  function handleSlotClick(dayOfWeek: number, period: number, classId: number) {
    if (!isManager) return;
    const existing = slotMap.get(`${dayOfWeek}-${period}-${classId}`);
    setSlotMsg(null);
    setEditSlot({
      dayOfWeek,
      period,
      classId,
      subjectId: existing?.subjectId ?? null,
      teacherId: existing?.teacherId ?? null,
      customLabel: existing?.customLabel ?? "",
      room: existing?.room ?? "",
      slotId: existing?.id,
    });
  }

  // Save Slot
  async function handleSaveSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!editSlot) return;
    setSavingSlot(true);
    setSlotMsg(null);
    try {
      await putJSON("/api/timetable/slot", {
        dayOfWeek: editSlot.dayOfWeek,
        period: editSlot.period,
        classId: editSlot.classId,
        subjectId: editSlot.subjectId || null,
        teacherId: editSlot.teacherId || null,
        customLabel: editSlot.customLabel || null,
        room: editSlot.room || null,
        academicYear: data?.settings.academicYear || "2026",
      });
      setEditSlot(null);
      timetableFetch.refresh();
    } catch (err) {
      setSlotMsg(err instanceof Error ? err.message : "Failed to save slot.");
    } finally {
      setSavingSlot(false);
    }
  }

  // Clear Slot
  async function handleClearSlot() {
    if (!editSlot) return;
    setSavingSlot(true);
    try {
      if (editSlot.slotId) {
        await delJSON(`/api/timetable/slot?id=${editSlot.slotId}`);
      } else {
        await delJSON(
          `/api/timetable/slot?dayOfWeek=${editSlot.dayOfWeek}&period=${editSlot.period}&classId=${editSlot.classId}&academicYear=${data?.settings.academicYear || "2026"}`,
        );
      }
      setEditSlot(null);
      timetableFetch.refresh();
    } catch (err) {
      setSlotMsg(err instanceof Error ? err.message : "Failed to clear slot.");
    } finally {
      setSavingSlot(false);
    }
  }

  // Open Settings Modal
  function openSettings() {
    if (!data?.settings) return;
    setSettingsForm({ ...data.settings });
    setSettingsModalOpen(true);
  }

  // Save Settings
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      await putJSON("/api/timetable/settings", settingsForm);
      setSettingsModalOpen(false);
      timetableFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  // Quick subject select auto-selects teacher
  function onSubjectChange(subId: string) {
    if (!editSlot) return;
    const idNum = subId ? Number(subId) : null;
    const matchedSubject = data?.subjects.find((s) => s.id === idNum);
    setEditSlot({
      ...editSlot,
      subjectId: idNum,
      teacherId: matchedSubject?.teacherId ?? editSlot.teacherId,
      customLabel: idNum ? "" : editSlot.customLabel, // clear custom label if subject picked
    });
  }

  // -------------------------------------------------------------
  // PRINT: Master General Teaching Timetable (Exact match to image 2)
  // -------------------------------------------------------------
  function handlePrintGeneral() {
    if (!data) return;
    const s = data.settings;
    const clList = data.classes;

    const daysRowsHtml = DAYS.map((day) => {
      const dayClasses = clList.map((c, cIdx) => {
        // Periods 1 to 4
        const p1_4 = [1, 2, 3, 4]
          .map((p) => {
            const slot = slotMap.get(`${day.id}-${p}-${c.id}`);
            const disp = getSlotDisplay(slot);
            const bg = disp.isSpecial ? "background:#f1f5f9;font-weight:800;" : "";
            return `<td style="border:1px solid #000;text-align:center;padding:4px 2px;font-size:9px;font-weight:700;${bg}">
              ${disp.label}
            </td>`;
          })
          .join("");

        // Periods 5 to 7
        const p5_7 = [5, 6, 7]
          .map((p) => {
            const slot = slotMap.get(`${day.id}-${p}-${c.id}`);
            const disp = getSlotDisplay(slot);
            const bg = disp.isSpecial ? "background:#f1f5f9;font-weight:800;" : "";
            return `<td style="border:1px solid #000;text-align:center;padding:4px 2px;font-size:9px;font-weight:700;${bg}">
              ${disp.label}
            </td>`;
          })
          .join("");

        // Periods 8 & 9 (Special handling for Wed: RELIGIO and Fri: MEWAKA)
        let p8_9 = "";
        if (day.id === 3 && cIdx === 0) {
          p8_9 = `<td colspan="2" rowspan="${clList.length}" style="border:1px solid #000;text-align:center;font-weight:900;font-size:12px;background:#fff;letter-spacing:1px;vertical-align:middle;">
            RELIGIO
          </td>`;
        } else if (day.id === 5 && cIdx === 0) {
          p8_9 = `<td colspan="2" rowspan="${clList.length}" style="border:1px solid #000;text-align:center;font-weight:900;font-size:12px;background:#fff;letter-spacing:1px;vertical-align:middle;">
            MEWAKA
          </td>`;
        } else if (day.id !== 3 && day.id !== 5) {
          p8_9 = [8, 9]
            .map((p) => {
              const slot = slotMap.get(`${day.id}-${p}-${c.id}`);
              const disp = getSlotDisplay(slot);
              return `<td style="border:1px solid #000;text-align:center;padding:4px 2px;font-size:9px;font-weight:700;">
                ${disp.label}
              </td>`;
            })
            .join("");
        }

        // Spanning cells for Break, Lunch, Assembly, Extra Curriculum on first class row
        const breakCell =
          cIdx === 0
            ? `<td rowspan="${clList.length}" style="border:1px solid #000;text-align:center;vertical-align:middle;font-weight:900;font-size:9px;writing-mode:vertical-rl;transform:rotate(180deg);background:#fff;letter-spacing:1px;padding:4px 2px;">
                BREAK TIME
              </td>`
            : "";
        const lunchCell =
          cIdx === 0
            ? `<td rowspan="${clList.length}" style="border:1px solid #000;text-align:center;vertical-align:middle;font-weight:900;font-size:9px;writing-mode:vertical-rl;transform:rotate(180deg);background:#fff;letter-spacing:1px;padding:4px 2px;">
                LUNCH TIME
              </td>`
            : "";
        const assemblyCell =
          cIdx === 0
            ? `<td rowspan="${clList.length}" style="border:1px solid #000;text-align:center;vertical-align:middle;font-weight:900;font-size:9px;writing-mode:vertical-rl;transform:rotate(180deg);background:#fff;letter-spacing:1px;padding:4px 2px;">
                ASSEMBLY
              </td>`
            : "";
        const extraCell =
          cIdx === 0
            ? `<td rowspan="${clList.length}" style="border:1px solid #000;text-align:center;vertical-align:middle;font-size:9.5px;font-weight:800;padding:4px 4px;background:#fff;">
                ${getExtraForDay(s, day.id)}
              </td>`
            : "";

        const dayCell =
          cIdx === 0
            ? `<td rowspan="${clList.length}" style="border:1px solid #000;text-align:center;vertical-align:middle;font-weight:900;font-size:9.5px;writing-mode:vertical-rl;transform:rotate(180deg);background:#fff;letter-spacing:1.5px;padding:6px 2px;">
                ${day.name.toUpperCase()}
              </td>`
            : "";

        // Roman numeral style class label or standard name
        const classLabel = c.name.replace("Form ", "").replace(" 1", "I").replace(" 2", "II").replace(" 3", "III").replace(" 4", "IV");

        return `<tr>
          ${dayCell}
          <td style="border:1px solid #000;text-align:center;padding:4px 2px;font-size:9px;font-weight:800;">${classLabel}</td>
          ${p1_4}
          ${breakCell}
          ${p5_7}
          ${lunchCell}
          ${p8_9}
          ${assemblyCell}
          ${extraCell}
        </tr>`;
      }).join("");
      return dayClasses;
    }).join("");

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${s.title}</title>
      <style>
        @page { size: A4 landscape; margin: 8mm 6mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif, Arial; color: #000; margin: 0; padding: 0; }
        .hdr { text-align: center; margin-bottom: 8px; }
        .hdr h2 { margin: 0; font-size: 14px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; }
        .hdr h1 { margin: 3px 0; font-size: 16px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
        .hdr h3 { margin: 2px 0; font-size: 13px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
        table.tt { width: 100%; border-collapse: collapse; border: 2px solid #000; }
        table.tt th { border: 1px solid #000; text-align: center; padding: 3px 1px; font-size: 8px; font-weight: 900; vertical-align: middle; }
        table.tt td { border: 1px solid #000; height: 18px; }
        .notes { margin-top: 8px; font-size: 8.5px; line-height: 1.35; font-weight: 700; }
      </style>
    </head><body>
      <div class="hdr">
        <h2>${s.councilName}</h2>
        <h1>${s.schoolName}</h1>
        <h3>${s.title}</h3>
      </div>
      <table class="tt">
        <thead>
          <tr style="background:#fff;">
            <th rowspan="2" style="width:24px;">DAYS</th>
            <th rowspan="2" style="width:26px;">CLASS</th>
            <th>1</th><th>2</th><th>3</th><th>4</th>
            <th rowspan="2" style="width:28px;font-size:7.5px;">${s.breakTime}</th>
            <th>5</th><th>6</th><th>7</th>
            <th rowspan="2" style="width:28px;font-size:7.5px;">${s.lunchTime}</th>
            <th>8</th><th>9</th>
            <th rowspan="2" style="width:26px;font-size:7.5px;">${s.assemblyTime}</th>
            <th rowspan="2" style="width:78px;font-size:8px;">Extra<br/>Curriculum<br/><span style="font-size:7px;">${s.extraCurriculumTime}</span></th>
          </tr>
          <tr style="background:#fff;font-size:7px;">
            <th>08:00 - 08:40</th><th>08:40 - 09:20</th><th>09:20 - 10:00</th><th>10:00 - 10:40</th>
            <th>11:00 - 11:40</th><th>11:40 - 12:20</th><th>12:20 - 13:00</th>
            <th>13:30 - 14:10</th><th>14:10 - 14:50</th>
          </tr>
        </thead>
        <tbody>
          ${daysRowsHtml}
        </tbody>
      </table>
      <div class="notes">
        ${s.notes}
      </div>
    </body></html>`;

    printViaIframe(fullHtml);
  }

  // -------------------------------------------------------------
  // PRINT: Single Class Timetable (Sorted from main timetable)
  // -------------------------------------------------------------
  function handlePrintClass(targetClassId: number) {
    if (!data) return;
    const s = data.settings;
    const targetClass = data.classes.find((c) => c.id === targetClassId);
    if (!targetClass) return;

    const rowsHtml = DAYS.map((day) => {
      const pCells = PERIODS.map((p) => {
        const slot = slotMap.get(`${day.id}-${p.num}-${targetClass.id}`);
        const disp = getSlotDisplay(slot);
        return `<td style="border:1px solid #334155;text-align:center;padding:6px 3px;">
          <div style="font-weight:900;font-size:11px;color:#0f172a;">${disp.label}</div>
          <div style="font-size:8.5px;color:#475569;margin-top:2px;">${slot?.teacherName || slot?.subjectName || ""}</div>
          ${slot?.room ? `<div style="font-size:7.5px;color:#64748b;">${slot.room}</div>` : ""}
        </td>`;
      }).join("");

      return `<tr>
        <td style="border:1px solid #334155;font-weight:900;font-size:11px;background:#f8fafc;padding:6px 8px;">${day.name}</td>
        ${pCells}
        <td style="border:1px solid #334155;text-align:center;padding:6px;font-size:9.5px;font-weight:700;background:#f8fafc;">${getExtraForDay(s, day.id)}</td>
      </tr>`;
    }).join("");

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Class Timetable - ${targetClass.name}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; }
        .hdr { text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; margin-bottom: 12px; }
        .hdr h2 { margin: 0; font-size: 13px; font-weight: 800; color: #475569; letter-spacing: 1px; }
        .hdr h1 { margin: 2px 0; font-size: 20px; font-weight: 900; color: #0f172a; }
        .hdr h3 { margin: 2px 0; font-size: 14px; font-weight: 800; color: #4f46e5; }
        table { width: 100%; border-collapse: collapse; border: 2px solid #334155; font-size: 10px; }
        th { border: 1px solid #334155; background: #1e293b; color: #fff; padding: 6px 4px; font-size: 9px; font-weight: 800; }
        td { border: 1px solid #334155; }
        .sig { display: flex; justify-content: space-between; margin-top: 30px; font-size: 10px; }
        .sig div { border-top: 2px solid #94a3b8; width: 28%; padding-top: 6px; }
      </style>
    </head><body>
      <div class="hdr">
        <h2>${s.councilName}</h2>
        <h1>${s.schoolName}</h1>
        <h3>CLASS TIMETABLE — ${targetClass.name.toUpperCase()}${targetClass.section ? " (" + targetClass.section + ")" : ""} · ${s.academicYear}</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:90px;">DAY</th>
            ${PERIODS.map((p) => `<th>Period ${p.num}<br/><span style="font-size:7.5px;font-weight:400;">${p.time}</span></th>`).join("")}
            <th style="width:110px;">EXTRA<br/><span style="font-size:7.5px;font-weight:400;">15:00 - 16:30</span></th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="margin-top:10px;font-size:9px;color:#475569;font-weight:600;">
        Break Time: ${s.breakTime} · Lunch Time: ${s.lunchTime} · Assembly: ${s.assemblyTime}
      </div>
      <div class="sig">
        <div><strong>Academic Master:</strong> ___________________</div>
        <div><strong>Class Teacher:</strong> ___________________</div>
        <div><strong>Head of School:</strong> ___________________</div>
      </div>
    </body></html>`;

    printViaIframe(fullHtml);
  }

  // -------------------------------------------------------------
  // PRINT: Teacher Timetable (Personalized)
  // -------------------------------------------------------------
  function handlePrintTeacher(targetTeacherId: number, targetTeacherName: string) {
    if (!data) return;
    const s = data.settings;

    const rowsHtml = DAYS.map((day) => {
      const pCells = PERIODS.map((p) => {
        // Find if this teacher teaches in this period
        const slot = data.slots.find(
          (sl) => sl.teacherId === targetTeacherId && sl.dayOfWeek === day.id && sl.period === p.num,
        );
        if (!slot) {
          return `<td style="border:1px solid #cbd5e1;text-align:center;padding:6px;color:#94a3b8;font-size:9px;background:#f8fafc;">—</td>`;
        }
        return `<td style="border:1px solid #334155;text-align:center;padding:6px 4px;background:#eef2ff;">
          <div style="font-weight:900;font-size:11px;color:#1e1b4b;">${slot.className || "Class"}</div>
          <div style="font-size:9px;font-weight:700;color:#4338ca;">${slot.subjectName || slot.subjectCode || "Subject"}</div>
          ${slot.room ? `<div style="font-size:7.5px;color:#64748b;">${slot.room}</div>` : ""}
        </td>`;
      }).join("");

      return `<tr>
        <td style="border:1px solid #334155;font-weight:900;font-size:11px;background:#f8fafc;padding:6px 8px;">${day.name}</td>
        ${pCells}
      </tr>`;
    }).join("");

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Teacher Timetable - ${targetTeacherName}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; }
        .hdr { text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; margin-bottom: 14px; }
        .hdr h2 { margin: 0; font-size: 13px; font-weight: 800; color: #475569; letter-spacing: 1px; }
        .hdr h1 { margin: 2px 0; font-size: 20px; font-weight: 900; color: #0f172a; }
        .hdr h3 { margin: 2px 0; font-size: 14px; font-weight: 800; color: #4f46e5; }
        table { width: 100%; border-collapse: collapse; border: 2px solid #334155; font-size: 10px; }
        th { border: 1px solid #334155; background: #1e293b; color: #fff; padding: 6px 4px; font-size: 9px; font-weight: 800; }
        td { border: 1px solid #334155; }
        .sig { display: flex; justify-content: space-between; margin-top: 30px; font-size: 10px; }
        .sig div { border-top: 2px solid #94a3b8; width: 30%; padding-top: 6px; }
      </style>
    </head><body>
      <div class="hdr">
        <h2>${s.councilName}</h2>
        <h1>${s.schoolName}</h1>
        <h3>TEACHER TIMETABLE — ${targetTeacherName.toUpperCase()} · ${s.academicYear}</h3>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:90px;">DAY</th>
            ${PERIODS.map((p) => `<th>Period ${p.num}<br/><span style="font-size:7.5px;font-weight:400;">${p.time}</span></th>`).join("")}
          </tr>
        </thead>
        <tbody>${rowsHtml}<tr className="bg-emerald-50/70">
                                  <td className="border border-slate-200 bg-slate-50 px-3 py-2 font-extrabold uppercase text-slate-700 text-[10px]">Extra Curriculum</td>
                                  <td colSpan={PERIODS.length + 4} className="border border-slate-200 px-3 py-2 text-center font-bold text-emerald-800 text-[10px]">
                                    ⚽ {data.settings.extraCurriculumTime} · ☕ {data.settings.breakTime} · 🍱 {data.settings.lunchTime} · 🔔 {data.settings.assemblyTime}
                                  </td>
                                </tr>
                              </tbody>
      </table>
      <div class="sig">
        <div><strong>Teacher:</strong> ${targetTeacherName}</div>
        <div><strong>Academic Master:</strong> ___________________</div>
        <div><strong>Head of School:</strong> ___________________</div>
      </div>
    </body></html>`;

    printViaIframe(fullHtml);
  }

  const roleBadge = user?.role === "member" ? staffRoleLabel(user.staffRole) : "🛡️ Admin";

  return (
    <AppShell permission="timetable.view">
      <div className="space-y-5">
        <PageHeader icon="📅" title="Timetable" subtitle="General teaching schedule, class timetables, and teacher workloads">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
              {roleBadge}
            </span>
            {isManager && (
              <button
                onClick={openSettings}
                className={cls(btnGhost, "text-xs font-bold text-slate-700")}
              >
                ⚙️ Timetable Settings
              </button>
            )}
          </div>
        </PageHeader>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-2">
            {isManager ? (
              <>
                <button
                  onClick={() => setActiveTab("general")}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                    effectiveTab === "general"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  🌐 General Timetable
                </button>
                <button
                  onClick={() => setActiveTab("class")}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                    effectiveTab === "class"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  🏫 Class Timetable
                </button>
                <button
                  onClick={() => setActiveTab("teacher")}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                    effectiveTab === "teacher"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  👨‍🏫 By Teacher
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab("my")}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                    effectiveTab === "my"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  👤 My Timetable
                </button>
                <button
                  onClick={() => setActiveTab("class")}
                  className={cls(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition",
                    effectiveTab === "class"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  🏫 My Assigned Classes
                </button>
              </>
            )}
          </div>

          {/* Quick print action according to the tab */}
          <div className="flex items-center gap-2">
            {effectiveTab === "general" && isManager && (
              <button
                onClick={handlePrintGeneral}
                className={cls(btnPrimary, "text-xs font-bold")}
              >
                🖨️ Print General Timetable
              </button>
            )}
            {effectiveTab === "class" && currentClassId && (
              <button
                onClick={() => handlePrintClass(Number(currentClassId))}
                className={cls(btnPrimary, "text-xs font-bold")}
              >
                🖨️ Print Class Timetable
              </button>
            )}
            {(effectiveTab === "my" || effectiveTab === "teacher") && (
              <button
                onClick={() =>
                  handlePrintTeacher(
                    Number(currentTeacherId),
                    data?.teachers.find((t) => t.id === Number(currentTeacherId))?.name ||
                      data?.teacherName ||
                      user?.name ||
                      "Teacher",
                  )
                }
                className={cls(btnPrimary, "text-xs font-bold")}
              >
                🖨️ Print Teacher Timetable
              </button>
            )}
          </div>
        </div>

        {/* LOADING / ERROR STATE */}
        {timetableFetch.loading && !data ? (
          <Loader label="Loading timetable..." />
        ) : timetableFetch.error ? (
          <EmptyState icon="⚠️" title="Could not load timetable" message={timetableFetch.error} />
        ) : !data ? null : (
          <>
            {/* ========================================================= */}
            {/* TAB 1: GENERAL TIMETABLE (Academic Master / Admin only)   */}
            {/* ========================================================= */}
            {effectiveTab === "general" && isManager && (
              <div className="space-y-4">
                {/* School Letterhead Banner */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm text-center">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                    {data.settings.councilName}
                  </p>
                  <h1 className="mt-1 text-xl font-black uppercase text-slate-900 sm:text-2xl">
                    {data.settings.schoolName}
                  </h1>
                  <h2 className="mt-0.5 text-sm font-extrabold text-violet-700 uppercase">
                    {data.settings.title}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500">
                    <span>☕ Break: <b>{data.settings.breakTime}</b></span>
                    <span>🍱 Lunch: <b>{data.settings.lunchTime}</b></span>
                    <span>🔔 Assembly: <b>{data.settings.assemblyTime}</b></span>
                    <span>⚽ Extra Curriculum: <b>{data.settings.extraCurriculumTime}</b></span>
                  </div>
                </div>

                {/* Day filter */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Filter Day:</span>
                    <button
                      onClick={() => setDayFilter("all")}
                      className={cls(
                        "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                        dayFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                      )}
                    >
                      All Days
                    </button>
                    {DAYS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDayFilter(String(d.id))}
                        className={cls(
                          "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                          dayFilter === String(d.id)
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                        )}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-slate-400">
                    💡 Click on any period slot to edit its subject, teacher, or special label.
                  </p>
                </div>

                {/* Full Grid Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="border border-slate-800 px-3 py-2.5 text-center text-[10px] font-extrabold uppercase">
                            Day
                          </th>
                          <th className="border border-slate-800 px-3 py-2.5 text-center text-[10px] font-extrabold uppercase">
                            Class
                          </th>
                          {PERIODS.slice(0, 4).map((p) => (
                            <th key={p.num} className="border border-slate-800 px-2 py-2 text-center">
                              <span className="block font-black text-xs">{p.num}</span>
                              <span className="text-[9px] font-normal text-slate-300">{p.time}</span>
                            </th>
                          ))}
                          <th className="border border-slate-800 px-2 py-2 text-center text-[9px] font-bold bg-amber-950/60 text-amber-200">
                            BREAK<br />{data.settings.breakTime}
                          </th>
                          {PERIODS.slice(4, 7).map((p) => (
                            <th key={p.num} className="border border-slate-800 px-2 py-2 text-center">
                              <span className="block font-black text-xs">{p.num}</span>
                              <span className="text-[9px] font-normal text-slate-300">{p.time}</span>
                            </th>
                          ))}
                          <th className="border border-slate-800 px-2 py-2 text-center text-[9px] font-bold bg-rose-950/60 text-rose-200">
                            LUNCH<br />{data.settings.lunchTime}
                          </th>
                          {PERIODS.slice(7, 9).map((p) => (
                            <th key={p.num} className="border border-slate-800 px-2 py-2 text-center">
                              <span className="block font-black text-xs">{p.num}</span>
                              <span className="text-[9px] font-normal text-slate-300">{p.time}</span>
                            </th>
                          ))}
                          <th className="border border-slate-800 px-2 py-2 text-center text-[9px] font-bold bg-indigo-950/60 text-indigo-200">
                            ASSEMBLY<br />{data.settings.assemblyTime}
                          </th>
                          <th className="border border-slate-800 px-3 py-2 text-center text-[9px] font-bold bg-emerald-950/60 text-emerald-200">
                            EXTRA CURRICULUM<br />{data.settings.extraCurriculumTime}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.filter((d) => dayFilter === "all" || dayFilter === String(d.id)).map((day) => (
                          data.classes.map((c, cIdx) => {
                            const isFirst = cIdx === 0;
                            const classCount = data.classes.length;

                            return (
                              <tr key={`${day.id}-${c.id}`} className={cIdx % 2 ? "bg-slate-50/50" : "bg-white"}>
                                {isFirst && (
                                  <td
                                    rowSpan={classCount}
                                    className="border border-slate-200 bg-slate-100 text-center font-black text-xs text-slate-800 align-middle uppercase"
                                  >
                                    {day.name}
                                  </td>
                                )}
                                <td className="border border-slate-200 px-2.5 py-2 font-extrabold text-slate-800 text-center bg-slate-50">
                                  {c.name}
                                </td>

                                {/* Periods 1 to 4 */}
                                {[1, 2, 3, 4].map((p) => {
                                  const slot = slotMap.get(`${day.id}-${p}-${c.id}`);
                                  const disp = getSlotDisplay(slot);
                                  return (
                                    <td
                                      key={p}
                                      onClick={() => handleSlotClick(day.id, p, c.id)}
                                      className={cls(
                                        "border border-slate-200 px-2 py-1.5 text-center cursor-pointer transition hover:bg-violet-50 group",
                                        disp.isSpecial ? "bg-slate-100 font-extrabold text-slate-700" : "font-bold text-slate-900",
                                      )}
                                      title={slot ? `${slot.subjectName || slot.customLabel} (${slot.teacherName || "No teacher"})` : "Click to edit slot"}
                                    >
                                      <div className="font-bold">{disp.label}</div>
                                      {disp.sub && <div className="text-[9px] font-normal text-slate-400 truncate max-w-[80px] mx-auto">{disp.sub}</div>}
                                    </td>
                                  );
                                })}

                                {/* BREAK TIME (spans all classes of day) */}
                                {isFirst && (
                                  <td
                                    rowSpan={classCount}
                                    className="border border-slate-200 bg-amber-50 text-amber-800 text-center text-[10px] font-black uppercase align-middle"
                                  >
                                    BREAK
                                  </td>
                                )}

                                {/* Periods 5 to 7 */}
                                {[5, 6, 7].map((p) => {
                                  const slot = slotMap.get(`${day.id}-${p}-${c.id}`);
                                  const disp = getSlotDisplay(slot);
                                  return (
                                    <td
                                      key={p}
                                      onClick={() => handleSlotClick(day.id, p, c.id)}
                                      className={cls(
                                        "border border-slate-200 px-2 py-1.5 text-center cursor-pointer transition hover:bg-violet-50",
                                        disp.isSpecial ? "bg-slate-100 font-extrabold text-slate-700" : "font-bold text-slate-900",
                                      )}
                                      title={slot ? `${slot.subjectName || slot.customLabel} (${slot.teacherName || "No teacher"})` : "Click to edit slot"}
                                    >
                                      <div className="font-bold">{disp.label}</div>
                                      {disp.sub && <div className="text-[9px] font-normal text-slate-400 truncate max-w-[80px] mx-auto">{disp.sub}</div>}
                                    </td>
                                  );
                                })}

                                {/* LUNCH TIME (spans all classes of day) */}
                                {isFirst && (
                                  <td
                                    rowSpan={classCount}
                                    className="border border-slate-200 bg-rose-50 text-rose-800 text-center text-[10px] font-black uppercase align-middle"
                                  >
                                    LUNCH
                                  </td>
                                )}

                                {/* Periods 8 and 9 (Special blocks on Wed: RELIGIO, Fri: MEWAKA) */}
                                {day.id === 3 ? (
                                  isFirst ? (
                                    <td
                                      colSpan={2}
                                      rowSpan={classCount}
                                      className="border border-slate-200 bg-indigo-50 text-indigo-900 text-center font-black text-sm uppercase align-middle tracking-wider"
                                    >
                                      RELIGIO
                                    </td>
                                  ) : null
                                ) : day.id === 5 ? (
                                  isFirst ? (
                                    <td
                                      colSpan={2}
                                      rowSpan={classCount}
                                      className="border border-slate-200 bg-indigo-50 text-indigo-900 text-center font-black text-sm uppercase align-middle tracking-wider"
                                    >
                                      MEWAKA
                                    </td>
                                  ) : null
                                ) : (
                                  [8, 9].map((p) => {
                                    const slot = slotMap.get(`${day.id}-${p}-${c.id}`);
                                    const disp = getSlotDisplay(slot);
                                    return (
                                      <td
                                        key={p}
                                        onClick={() => handleSlotClick(day.id, p, c.id)}
                                        className={cls(
                                          "border border-slate-200 px-2 py-1.5 text-center cursor-pointer transition hover:bg-violet-50",
                                          disp.isSpecial ? "bg-slate-100 font-extrabold text-slate-700" : "font-bold text-slate-900",
                                        )}
                                        title={slot ? `${slot.subjectName || slot.customLabel} (${slot.teacherName || "No teacher"})` : "Click to edit slot"}
                                      >
                                        <div className="font-bold">{disp.label}</div>
                                        {disp.sub && <div className="text-[9px] font-normal text-slate-400 truncate max-w-[80px] mx-auto">{disp.sub}</div>}
                                      </td>
                                    );
                                  })
                                )}

                                {/* ASSEMBLY (spans all classes) */}
                                {isFirst && (
                                  <td
                                    rowSpan={classCount}
                                    className="border border-slate-200 bg-indigo-50 text-indigo-800 text-center text-[10px] font-black uppercase align-middle"
                                  >
                                    ASSEMBLY
                                  </td>
                                )}

                                {/* EXTRA CURRICULUM (spans all classes) */}
                                {isFirst && (
                                  <td
                                    rowSpan={classCount}
                                    className="border border-slate-200 bg-emerald-50 text-emerald-900 text-center font-extrabold text-xs align-middle px-3"
                                  >
                                    {getExtraForDay(data.settings, day.id)}
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Notes Footer */}
                  <div className="border-t border-slate-200 bg-slate-50 p-4 text-[11px] font-medium text-slate-600 leading-relaxed">
                    {data.settings.notes}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: CLASS TIMETABLE (Filtered / Sorted from main)      */}
            {/* ========================================================= */}
            {effectiveTab === "class" && (
              <div className="space-y-4">
                {/* Selector */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Select Class:</label>
                    <select
                      value={currentClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className={cls(inputCls, "w-48 font-bold")}
                    >
                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section ? `(${c.section})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-slate-500">
                    Extracted directly from the General Teaching Timetable ({data.settings.academicYear})
                  </div>
                </div>

                {/* Class Schedule Card */}
                {(() => {
                  const targetClass = data.classes.find((c) => c.id === Number(currentClassId));
                  if (!targetClass) {
                    return <EmptyState icon="🏫" title="No class selected" message="Select a class to view its timetable." />;
                  }

                  return (
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3.5 text-white">
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wider">
                            Class Timetable — {targetClass.name} {targetClass.section ? `(${targetClass.section})` : ""}
                          </p>
                          <p className="text-xs text-slate-300">
                            {data.settings.schoolName} · Academic Year {data.settings.academicYear}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePrintClass(targetClass.id)}
                          className={cls(btnPrimary, "text-xs font-bold")}
                        >
                          🖨️ Print Class Timetable
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="border border-slate-200 px-3 py-2.5 text-left font-extrabold uppercase text-[11px] w-28">
                                Day
                              </th>
                              {PERIODS.slice(0, 4).map((p) => (
                                <th key={p.num} className="border border-slate-200 px-2 py-2 text-center">
                                  <span className="block font-black text-xs text-slate-900">{p.num}</span>
                                  <span className="text-[9px] font-normal text-slate-500">{p.time}</span>
                                </th>
                              ))}
                              <th className="border border-slate-200 bg-amber-50 px-1 py-2 text-center"><span className="block font-black text-[9px] text-amber-800" style={{ writingMode: "vertical-rl" }}>BREAK</span><span className="text-[8px] font-normal text-amber-600">{data.settings.breakTime}</span></th>
                              {PERIODS.slice(4, 7).map((p) => (
                                <th key={p.num} className="border border-slate-200 px-2 py-2 text-center">
                                  <span className="block font-black text-xs text-slate-900">{p.num}</span>
                                  <span className="text-[9px] font-normal text-slate-500">{p.time}</span>
                                </th>
                              ))}
                              <th className="border border-slate-200 bg-rose-50 px-1 py-2 text-center"><span className="block font-black text-[9px] text-rose-800" style={{ writingMode: "vertical-rl" }}>LUNCH</span><span className="text-[8px] font-normal text-rose-600">{data.settings.lunchTime}</span></th>
                              {PERIODS.slice(7, 9).map((p) => (
                                <th key={p.num} className="border border-slate-200 px-2 py-2 text-center">
                                  <span className="block font-black text-xs text-slate-900">{p.num}</span>
                                  <span className="text-[9px] font-normal text-slate-500">{p.time}</span>
                                </th>
                              ))}
                              <th className="border border-slate-200 bg-violet-50 px-1 py-2 text-center"><span className="block font-black text-[9px] text-violet-800" style={{ writingMode: "vertical-rl" }}>ASSEMBLY</span><span className="text-[8px] font-normal text-violet-600">{data.settings.assemblyTime}</span></th>
                              <th className="border border-slate-200 px-3 py-2 text-center font-extrabold text-[11px] text-slate-700 w-36">
                                Extra Curriculum
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {DAYS.map((day) => (
                              <tr key={day.id} className="hover:bg-slate-50">
                                <td className="border border-slate-200 bg-slate-50 px-3 py-3 font-extrabold text-slate-800">
                                  {day.name}
                                </td>
                                {([1, 2, 3, 4] as const).map((n) => {
                                  const p = PERIODS[n - 1];
                                  const slot = slotMap.get(`${day.id}-${n}-${targetClass.id}`);
                                  const disp = getSlotDisplay(slot);
                                  return (
                                    <td key={n} onClick={() => isManager && handleSlotClick(day.id, n, targetClass.id)} className={cls("border border-slate-200 px-2 py-2 text-center transition", isManager && "cursor-pointer hover:bg-violet-50", disp.isSpecial ? "bg-slate-100" : "")} title={slot ? `${slot.subjectName || slot.customLabel} (${slot.teacherName || ""})` : ""}>
                                      <div className="font-extrabold text-slate-900 text-sm">{disp.label}</div>
                                      {slot?.teacherName && <div className="text-[10px] text-violet-700 font-medium truncate max-w-[90px] mx-auto mt-0.5">{slot.teacherName}</div>}
                                      {slot?.room && <div className="text-[9px] text-slate-400">{slot.room}</div>}
                                    </td>
                                  );
                                })}
                                <td className="border border-slate-200 bg-amber-50 px-1 py-2 text-center align-middle"><span className="text-[8px] font-black text-amber-800 uppercase tracking-wider" style={{ writingMode: "vertical-rl" }}>Break</span></td>
                                {([5, 6, 7] as const).map((n) => {
                                  const slot = slotMap.get(`${day.id}-${n}-${targetClass.id}`);
                                  const disp = getSlotDisplay(slot);
                                  return (
                                    <td key={n} onClick={() => isManager && handleSlotClick(day.id, n, targetClass.id)} className={cls("border border-slate-200 px-2 py-2 text-center transition", isManager && "cursor-pointer hover:bg-violet-50", disp.isSpecial ? "bg-slate-100" : "")} title={slot ? `${slot.subjectName || slot.customLabel} (${slot.teacherName || ""})` : ""}>
                                      <div className="font-extrabold text-slate-900 text-sm">{disp.label}</div>
                                      {slot?.teacherName && <div className="text-[10px] text-violet-700 font-medium truncate max-w-[90px] mx-auto mt-0.5">{slot.teacherName}</div>}
                                      {slot?.room && <div className="text-[9px] text-slate-400">{slot.room}</div>}
                                    </td>
                                  );
                                })}
                                <td className="border border-slate-200 bg-rose-50 px-1 py-2 text-center align-middle"><span className="text-[8px] font-black text-rose-800 uppercase tracking-wider" style={{ writingMode: "vertical-rl" }}>Lunch</span></td>
                                {([8, 9] as const).map((n) => {
                                  const slot = slotMap.get(`${day.id}-${n}-${targetClass.id}`);
                                  const disp = getSlotDisplay(slot);
                                  return (
                                    <td key={n} onClick={() => isManager && handleSlotClick(day.id, n, targetClass.id)} className={cls("border border-slate-200 px-2 py-2 text-center transition", isManager && "cursor-pointer hover:bg-violet-50", disp.isSpecial ? "bg-slate-100" : "")} title={slot ? `${slot.subjectName || slot.customLabel} (${slot.teacherName || ""})` : ""}>
                                      <div className="font-extrabold text-slate-900 text-sm">{disp.label}</div>
                                      {slot?.teacherName && <div className="text-[10px] text-violet-700 font-medium truncate max-w-[90px] mx-auto mt-0.5">{slot.teacherName}</div>}
                                      {slot?.room && <div className="text-[9px] text-slate-400">{slot.room}</div>}
                                    </td>
                                  );
                                })}
                                <td className="border border-slate-200 bg-violet-50 px-1 py-2 text-center align-middle"><span className="text-[8px] font-black text-violet-800 uppercase tracking-wider" style={{ writingMode: "vertical-rl" }}>Assembly</span></td>
                                <td className="border border-slate-200 bg-slate-50 px-3 py-2 text-center font-bold text-xs text-emerald-800">
                                  {getExtraForDay(data.settings, day.id)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="border-t border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 flex flex-wrap gap-4 justify-between">
                        <span>☕ Break: <b>{data.settings.breakTime}</b> · 🍱 Lunch: <b>{data.settings.lunchTime}</b></span>
                        {isManager && <span className="text-violet-600 font-bold">💡 Academic Master Mode: Click any cell to re-assign.</span>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: TEACHER TIMETABLE / MY TIMETABLE                   */}
            {/* ========================================================= */}
            {(effectiveTab === "my" || effectiveTab === "teacher") && (
              <div className="space-y-4">
                {/* Manager can pick any teacher */}
                {isManager && (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Select Teacher:</label>
                      <select
                        value={currentTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className={cls(inputCls, "w-64 font-bold")}
                      >
                        {data.teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.subject || "Teacher"})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-xs text-slate-500">
                      Personalized teaching schedule for individual staff member
                    </div>
                  </div>
                )}

                {/* Workload Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard
                    icon="📚"
                    label="Teaching Periods"
                    value={`${teacherStats.periodsCount} / 45`}
                    tone="indigo"
                    sub="per week"
                  />
                  <StatCard
                    icon="🏫"
                    label="Classes Taught"
                    value={teacherStats.classesCount}
                    tone="emerald"
                    sub="assigned classes"
                  />
                  <StatCard
                    icon="📖"
                    label="Subjects"
                    value={teacherStats.subjectsCount}
                    tone="blue"
                  />
                  <StatCard
                    icon="☕"
                    label="Free Periods"
                    value={teacherStats.freePeriods}
                    tone="amber"
                    sub="preparation periods"
                  />
                </div>

                {/* Teacher's Schedule Table */}
                {(() => {
                  const targetTeacher = data.teachers.find(
                    (t) => t.id === Number(currentTeacherId),
                  ) || { name: data.teacherName || user?.name || "Teacher", id: Number(currentTeacherId) };

                  return (
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3.5 text-white">
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wider">
                            Weekly Teaching Schedule — {targetTeacher.name}
                          </p>
                          <p className="text-xs text-slate-300">
                            {data.settings.schoolName} · Total: {teacherStats.periodsCount} teaching periods
                          </p>
                        </div>
                        <button
                          onClick={() => handlePrintTeacher(Number(currentTeacherId), targetTeacher.name)}
                          className={cls(btnPrimary, "text-xs font-bold")}
                        >
                          🖨️ Print My Schedule
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="border border-slate-200 px-3 py-2.5 text-left font-extrabold uppercase text-[11px] w-28">
                                Day
                              </th>
                              {PERIODS.slice(0, 4).map((p) => (
                                <th key={p.num} className="border border-slate-200 px-2 py-2 text-center">
                                  <span className="block font-black text-xs text-slate-900">{p.num}</span>
                                  <span className="text-[9px] font-normal text-slate-500">{p.time}</span>
                                </th>
                              ))}
                              <th className="border border-slate-200 bg-amber-50 px-1 py-2 text-center"><span className="block font-black text-[9px] text-amber-800" style={{ writingMode: "vertical-rl" }}>BREAK</span><span className="text-[8px] font-normal text-amber-600">{data.settings.breakTime}</span></th>
                              {PERIODS.slice(4, 7).map((p) => (
                                <th key={p.num} className="border border-slate-200 px-2 py-2 text-center">
                                  <span className="block font-black text-xs text-slate-900">{p.num}</span>
                                  <span className="text-[9px] font-normal text-slate-500">{p.time}</span>
                                </th>
                              ))}
                              <th className="border border-slate-200 bg-rose-50 px-1 py-2 text-center"><span className="block font-black text-[9px] text-rose-800" style={{ writingMode: "vertical-rl" }}>LUNCH</span><span className="text-[8px] font-normal text-rose-600">{data.settings.lunchTime}</span></th>
                              {PERIODS.slice(7, 9).map((p) => (
                                <th key={p.num} className="border border-slate-200 px-2 py-2 text-center">
                                  <span className="block font-black text-xs text-slate-900">{p.num}</span>
                                  <span className="text-[9px] font-normal text-slate-500">{p.time}</span>
                                </th>
                              ))}
                              <th className="border border-slate-200 bg-violet-50 px-1 py-2 text-center"><span className="block font-black text-[9px] text-violet-800" style={{ writingMode: "vertical-rl" }}>ASSEMBLY</span><span className="text-[8px] font-normal text-violet-600">{data.settings.assemblyTime}</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {DAYS.map((day) => (
                              <tr key={day.id} className="hover:bg-slate-50">
                                <td className="border border-slate-200 bg-slate-50 px-3 py-3 font-extrabold text-slate-800">
                                  {day.name}
                                </td>
{PERIODS.map((p) => {
                                  // Look up this teacher's assignment in this slot
                                  const slot = data.slots.find(
                                    (sl) =>
                                      sl.teacherId === Number(currentTeacherId) &&
                                      sl.dayOfWeek === day.id &&
                                      sl.period === p.num,
                                  );

                                  // Institutional shared blocks (RELIGIO, MEWAKA, PS…) — they are seeded
                                  // per class with a custom label and no teacher, so show them when one
                                  // of the teacher's classes has such a slot at this day/period.
                                  const special = !slot
                                    ? data.slots.find(
                                        (sl) => sl.dayOfWeek === day.id && sl.period === p.num && (sl.customLabel !== null && sl.customLabel !== ""),
                                      )
                                    : undefined;

                                  const body = (
                                    <>
                                      {p.num === 5 && (
                                        <td className="border border-slate-200 bg-amber-50 px-1 py-2 text-center align-middle"><span className="text-[8px] font-black uppercase tracking-wider text-amber-800" style={{ writingMode: "vertical-rl" }}>Break</span></td>
                                      )}
                                      {p.num === 8 && (
                                        <td className="border border-slate-200 bg-rose-50 px-1 py-2 text-center align-middle"><span className="text-[8px] font-black uppercase tracking-wider text-rose-800" style={{ writingMode: "vertical-rl" }}>Lunch</span></td>
                                      )}
                                    </>
                                  );
                                  void body;

                                  if (!slot && !special) {
                                    return (
                                      <Fragment key={p.num}>
                                        {(p.num === 5 || p.num === 8) && (
                                          <td className={cls("border border-slate-200 px-1 py-2 text-center align-middle", p.num === 5 ? "bg-amber-50" : "bg-rose-50")}>
                                            <span className={cls("text-[8px] font-black uppercase tracking-wider", p.num === 5 ? "text-amber-800" : "text-rose-800")} style={{ writingMode: "vertical-rl" }}>{p.num === 5 ? "Break" : "Lunch"}</span>
                                          </td>
                                        )}
                                        <td className="border border-slate-200 px-2 py-2 text-center bg-slate-50/40 text-slate-400">
                                          <span className="text-[10px] italic">Free</span>
                                        </td>
                                        {p.num === 9 && (
                                          <td className="border border-slate-200 bg-violet-50 px-1 py-2 text-center align-middle"><span className="text-[8px] font-black uppercase tracking-wider text-violet-800" style={{ writingMode: "vertical-rl" }}>Assembly</span></td>
                                        )}
                                      </Fragment>
                                    );
                                  }
                                  if (!slot && special) {
                                    return (
                                      <Fragment key={p.num}>
                                        {(p.num === 5 || p.num === 8) && (
                                          <td className={cls("border border-slate-200 px-1 py-2 text-center align-middle", p.num === 5 ? "bg-amber-50" : "bg-rose-50")}>
                                            <span className={cls("text-[8px] font-black uppercase tracking-wider", p.num === 5 ? "text-amber-800" : "text-rose-800")} style={{ writingMode: "vertical-rl" }}>{p.num === 5 ? "Break" : "Lunch"}</span>
                                          </td>
                                        )}
                                        <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center">
                                          <div className="font-black text-slate-700 text-sm">{special.customLabel}</div>
                                          <div className="text-[9px] text-slate-400">{special.customLabel === "PS" ? "Private Studies" : "Shared block"}</div>
                                        </td>
                                        {p.num === 9 && (
                                          <td className="border border-slate-200 bg-violet-50 px-1 py-2 text-center align-middle"><span className="text-[8px] font-black uppercase tracking-wider text-violet-800" style={{ writingMode: "vertical-rl" }}>Assembly</span></td>
                                        )}
                                      </Fragment>
                                    );
                                  }

                                  return (
                                    <Fragment key={p.num}>
                                      {(p.num === 5 || p.num === 8) && (
                                        <td className={cls("border border-slate-200 px-1 py-2 text-center align-middle", p.num === 5 ? "bg-amber-50" : "bg-rose-50")}>
                                          <span className={cls("text-[8px] font-black uppercase tracking-wider", p.num === 5 ? "text-amber-800" : "text-rose-800")} style={{ writingMode: "vertical-rl" }}>{p.num === 5 ? "Break" : "Lunch"}</span>
                                        </td>
                                      )}
                                      <td className="border border-slate-200 px-2 py-2 text-center bg-indigo-50/60">
                                        <div className="font-black text-indigo-950 text-sm">{slot!.className}</div>
                                        <div className="font-bold text-indigo-700 text-[10px] mt-0.5">{slot!.subjectName || slot!.subjectCode || "Subject"}</div>
                                        {slot!.room && <div className="text-[9px] text-slate-500">{slot!.room}</div>}
                                      </td>
                                      {p.num === 9 && (
                                        <td className="border border-slate-200 bg-violet-50 px-1 py-2 text-center align-middle"><span className="text-[8px] font-black uppercase tracking-wider text-violet-800" style={{ writingMode: "vertical-rl" }}>Assembly</span></td>
                                      )}
                                    </Fragment>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* MODAL: EDIT SLOT (Academic Master / Admin only)           */}
        {/* ========================================================= */}
        {editSlot && (
          <Modal
            open={!!editSlot}
            onClose={() => setEditSlot(null)}
            title={`Edit Timetable Slot · ${DAYS.find((d) => d.id === editSlot.dayOfWeek)?.name} (Period ${editSlot.period})`}
          >
            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 font-semibold border border-slate-200 flex justify-between">
                <span>Class: <b>{data?.classes.find((c) => c.id === editSlot.classId)?.name}</b></span>
                <span>Period {editSlot.period}: <b>{PERIODS[editSlot.period - 1]?.time}</b></span>
              </div>

              {slotMsg && (
                <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                  {slotMsg}
                </div>
              )}

              <Field label="Subject">
                <select
                  value={editSlot.subjectId ?? ""}
                  onChange={(e) => onSubjectChange(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select Subject (or leave empty) —</option>
                  {data?.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || "No code"})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Teacher Assigned">
                <select
                  value={editSlot.teacherId ?? ""}
                  onChange={(e) =>
                    setEditSlot({
                      ...editSlot,
                      teacherId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className={inputCls}
                >
                  <option value="">— No Teacher Assigned —</option>
                  {data?.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject || "Teacher"})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Custom Label / Special Activity">
                <input
                  type="text"
                  value={editSlot.customLabel}
                  onChange={(e) => setEditSlot({ ...editSlot, customLabel: e.target.value })}
                  placeholder="e.g. PS, RELIGIO, MEWAKA"
                  className={inputCls}
                />
                <p className="text-[11px] text-slate-400 mt-1">Use for special periods like PS, RELIGIO, MEWAKA, or Sports</p>
                <div className="flex gap-1.5 mt-1.5">
                  {["PS", "RELIGIO", "MEWAKA", "SPORTS"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setEditSlot({ ...editSlot, customLabel: tag, subjectId: null, teacherId: null })}
                      className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Room / Location (Optional)">
                <input
                  type="text"
                  value={editSlot.room}
                  onChange={(e) => setEditSlot({ ...editSlot, room: e.target.value })}
                  placeholder="e.g. Lab 1, Room 4"
                  className={inputCls}
                />
              </Field>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClearSlot}
                  disabled={savingSlot}
                  className={btnDanger}
                >
                  🗑️ Clear Slot
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSlot(null)}
                    className={btnGhost}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSlot}
                    className={btnPrimary}
                  >
                    {savingSlot ? "Saving..." : "💾 Save Slot"}
                  </button>
                </div>
              </div>
            </form>
          </Modal>
        )}

        {/* ========================================================= */}
        {/* MODAL: TIMETABLE SETTINGS (Academic Master / Admin only)  */}
        {/* ========================================================= */}
        {settingsModalOpen && settingsForm && (
          <Modal
            open={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            title="⚙️ Timetable Settings & School Letterhead"
          >
            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <Field label="Council / District Name" required>
                <input
                  type="text"
                  value={settingsForm.councilName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, councilName: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <Field label="School Name" required>
                <input
                  type="text"
                  value={settingsForm.schoolName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Academic Year" required>
                  <input
                    type="text"
                    value={settingsForm.academicYear}
                    onChange={(e) => setSettingsForm({ ...settingsForm, academicYear: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Timetable Title" required>
                  <input
                    type="text"
                    value={settingsForm.title}
                    onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Break Time">
                  <input
                    type="text"
                    value={settingsForm.breakTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, breakTime: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Lunch Time">
                  <input
                    type="text"
                    value={settingsForm.lunchTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, lunchTime: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Assembly Time">
                  <input
                    type="text"
                    value={settingsForm.assemblyTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, assemblyTime: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Extra Curriculum Time">
                  <input
                    type="text"
                    value={settingsForm.extraCurriculumTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, extraCurriculumTime: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Extra Curriculum (Days)">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    placeholder="Monday Extra"
                    value={settingsForm.mondayExtra}
                    onChange={(e) => setSettingsForm({ ...settingsForm, mondayExtra: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    placeholder="Tuesday Extra"
                    value={settingsForm.tuesdayExtra}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tuesdayExtra: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    placeholder="Wednesday Extra"
                    value={settingsForm.wednesdayExtra}
                    onChange={(e) => setSettingsForm({ ...settingsForm, wednesdayExtra: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    placeholder="Thursday Extra"
                    value={settingsForm.thursdayExtra}
                    onChange={(e) => setSettingsForm({ ...settingsForm, thursdayExtra: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    placeholder="Friday Extra"
                    value={settingsForm.fridayExtra}
                    onChange={(e) => setSettingsForm({ ...settingsForm, fridayExtra: e.target.value })}
                    className={cls(inputCls, "col-span-2")}
                  />
                </div>
              </Field>

              <Field label="Notes Legend at Bottom">
                <textarea
                  rows={3}
                  value={settingsForm.notes}
                  onChange={(e) => setSettingsForm({ ...settingsForm, notes: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className={btnGhost}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className={btnPrimary}
                >
                  {savingSettings ? "Saving..." : "💾 Save Settings"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
