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
import { cls, delJSON, postJSON, putJSON, useFetch } from "@/lib/utils";

type ClassItem = { id: number; name: string; section: string; capacity: number; studentCount?: number };
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

/** Subject display with fallback logic that NEVER outputs raw "SUBJ" */
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
  // Prefer exact subject code (e.g. KISW-021, MATH-041, GEO-013), or subjectName, or teacher default
  const code =
    slot.subjectCode ||
    (slot.subjectName ? slot.subjectName.slice(0, 8).toUpperCase() : "");
  return {
    label: code || (slot.teacherName ? "CLASS" : "—"),
    sub: slot.teacherName || slot.subjectName || "",
    tone: "subject",
    isSpecial: false,
  };
}

/** Format Roman numeral or class name for print display (e.g. "I", "II", "IVA", "IV B") */
function formatClassPrint(name: string, section?: string | null) {
  let roman = name
    .replace(/^Form\s*1\b/i, "I")
    .replace(/^Form\s*2\b/i, "II")
    .replace(/^Form\s*3\b/i, "III")
    .replace(/^Form\s*4\b/i, "IV")
    .replace(/^Form\s*5\b/i, "V")
    .replace(/^Form\s*6\b/i, "VI");

  const cleanSec = section && section.trim() && section !== "—" && section !== "A & B" ? section.trim() : "";
  if (cleanSec) {
    return `${roman} ${cleanSec}`;
  }
  return roman;
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

  // Tabs:
  // For Manager: general | class | teacher
  // For Teacher: my | class
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

  // Class Row modal (Add stream e.g. Form 4 B, Form 1 A)
  const [addClassModalOpen, setAddClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({ name: "Form 4", section: "B", capacity: 40 });
  const [savingClass, setSavingClass] = useState(false);
  const [classMsg, setClassMsg] = useState<string | null>(null);

  // Manage Classes Modal
  const [manageClassesOpen, setManageClassesOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<{ id: number; name: string; section: string } | null>(null);

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

  // Map teacher's slots: `${dayOfWeek}-${period}` -> slot
  const mySlotsMap = useMemo(() => {
    const targetId =
      isManager && effectiveTab === "teacher"
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

  // Add Class/Stream Row (e.g. Form 4 B)
  async function handleAddClassRow(e: React.FormEvent) {
    e.preventDefault();
    setSavingClass(true);
    setClassMsg(null);
    try {
      await postJSON("/api/timetable/class", {
        name: classForm.name,
        section: classForm.section,
        capacity: classForm.capacity,
        academicYear: data?.settings.academicYear || "2026",
      });
      setAddClassModalOpen(false);
      timetableFetch.refresh();
    } catch (err) {
      setClassMsg(err instanceof Error ? err.message : "Failed to add class stream.");
    } finally {
      setSavingClass(false);
    }
  }

  // Update Class Section/Stream
  async function handleUpdateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!editingClass) return;
    try {
      await putJSON("/api/timetable/class", editingClass);
      setEditingClass(null);
      timetableFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update class.");
    }
  }

  // Remove Class from Timetable
  async function handleDeleteClass(classId: number, className: string) {
    if (!window.confirm(`Clear timetable for ${className}? If this class has no enrolled students, it will be removed.`)) return;
    try {
      await delJSON(`/api/timetable/class?id=${classId}`);
      timetableFetch.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove class.");
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
      customLabel: idNum ? "" : editSlot.customLabel,
    });
  }

  // -------------------------------------------------------------
  // PRINT: Master General Teaching Timetable (Shows code & teacher name)
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
            const bg = disp.isSpecial ? "background:#f1f5f9;" : "";
            return `<td style="border:1px solid #000;text-align:center;padding:2px 1px;vertical-align:middle;${bg}">
              <div style="font-weight:900;font-size:8.5px;line-height:1.1;color:#000;">${disp.label}</div>
              ${disp.sub ? `<div style="font-size:7px;color:#334155;line-height:1;margin-top:2px;font-family:Arial,sans-serif;">${disp.sub}</div>` : ""}
            </td>`;
          })
          .join("");

        // Periods 5 to 7
        const p5_7 = [5, 6, 7]
          .map((p) => {
            const slot = slotMap.get(`${day.id}-${p}-${c.id}`);
            const disp = getSlotDisplay(slot);
            const bg = disp.isSpecial ? "background:#f1f5f9;" : "";
            return `<td style="border:1px solid #000;text-align:center;padding:2px 1px;vertical-align:middle;${bg}">
              <div style="font-weight:900;font-size:8.5px;line-height:1.1;color:#000;">${disp.label}</div>
              ${disp.sub ? `<div style="font-size:7px;color:#334155;line-height:1;margin-top:2px;font-family:Arial,sans-serif;">${disp.sub}</div>` : ""}
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
              return `<td style="border:1px solid #000;text-align:center;padding:2px 1px;vertical-align:middle;">
                <div style="font-weight:900;font-size:8.5px;line-height:1.1;color:#000;">${disp.label}</div>
                ${disp.sub ? `<div style="font-size:7px;color:#334155;line-height:1;margin-top:2px;font-family:Arial,sans-serif;">${disp.sub}</div>` : ""}
              </td>`;
            })
            .join("");
        }

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
            ? `<td rowspan="${clList.length}" style="border:1px solid #000;text-align:center;vertical-align:middle;font-size:9px;font-weight:800;padding:4px 2px;background:#fff;">
                ${getExtraForDay(s, day.id)}
              </td>`
            : "";

        const dayCell =
          cIdx === 0
            ? `<td rowspan="${clList.length}" style="border:1px solid #000;text-align:center;vertical-align:middle;font-weight:900;font-size:9px;writing-mode:vertical-rl;transform:rotate(180deg);background:#fff;letter-spacing:1.5px;padding:6px 2px;">
                ${day.name.toUpperCase()}
              </td>`
            : "";

        const classLabel = formatClassPrint(c.name, c.section);

        return `<tr>
          ${dayCell}
          <td style="border:1px solid #000;text-align:center;padding:4px 2px;font-size:9px;font-weight:900;background:#f8fafc;">${classLabel}</td>
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
        @page { size: A4 landscape; margin: 6mm 5mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif, Arial; color: #000; margin: 0; padding: 0; }
        .hdr { text-align: center; margin-bottom: 6px; }
        .hdr h2 { margin: 0; font-size: 13px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; }
        .hdr h1 { margin: 2px 0; font-size: 15px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
        .hdr h3 { margin: 1px 0; font-size: 12px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
        table.tt { width: 100%; border-collapse: collapse; border: 2px solid #000; }
        table.tt th { border: 1px solid #000; text-align: center; padding: 3px 1px; font-size: 8px; font-weight: 900; vertical-align: middle; }
        table.tt td { border: 1px solid #000; }
        .notes { margin-top: 6px; font-size: 8px; line-height: 1.35; font-weight: 700; }
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
            <th rowspan="2" style="width:22px;">DAYS</th>
            <th rowspan="2" style="width:32px;">CLASS</th>
            <th>1</th><th>2</th><th>3</th><th>4</th>
            <th rowspan="2" style="width:28px;font-size:7.5px;">${s.breakTime}</th>
            <th>5</th><th>6</th><th>7</th>
            <th rowspan="2" style="width:28px;font-size:7.5px;">${s.lunchTime}</th>
            <th>8</th><th>9</th>
            <th rowspan="2" style="width:24px;font-size:7.5px;">${s.assemblyTime}</th>
            <th rowspan="2" style="width:80px;font-size:8px;">Extra<br/>Curriculum<br/><span style="font-size:7px;">${s.extraCurriculumTime}</span></th>
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
        const slot = data.slots.find(
          (sl) => sl.teacherId === targetTeacherId && sl.dayOfWeek === day.id && sl.period === p.num,
        );
        if (!slot) {
          return `<td style="border:1px solid #cbd5e1;text-align:center;padding:6px;color:#94a3b8;font-size:9px;background:#f8fafc;">—</td>`;
        }
        return `<td style="border:1px solid #334155;text-align:center;padding:6px 4px;background:#eef2ff;">
          <div style="font-weight:900;font-size:11px;color:#1e1b4b;">${slot.className} ${slot.classSection ? `(${slot.classSection})` : ""}</div>
          <div style="font-size:9px;font-weight:700;color:#4338ca;">${slot.subjectCode || slot.subjectName || "Subject"}</div>
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
        <tbody>${rowsHtml}</tbody>
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
        <PageHeader icon="📅" title="Timetable" subtitle="General teaching schedule, class streams, and teacher workloads">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
              {roleBadge}
            </span>
            {isManager && (
              <>
                <button
                  onClick={() => setAddClassModalOpen(true)}
                  className={cls(btnPrimary, "text-xs font-bold")}
                >
                  ➕ Add Class / Stream Row
                </button>
                <button
                  onClick={() => setManageClassesOpen(true)}
                  className={cls(btnGhost, "text-xs font-bold text-slate-700")}
                >
                  🏫 Manage Class Rows
                </button>
                <button
                  onClick={openSettings}
                  className={cls(btnGhost, "text-xs font-bold text-slate-700")}
                >
                  ⚙️ Settings
                </button>
              </>
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

                {/* Day filter & tools */}
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
                                  <div>{c.name}</div>
                                  {c.section && (
                                    <span className="inline-block mt-0.5 rounded bg-violet-100 px-1.5 py-0.2 text-[9px] font-extrabold text-violet-700">
                                      {c.section}
                                    </span>
                                  )}
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
                                      <div className="font-extrabold text-xs text-indigo-950">{disp.label}</div>
                                      {disp.sub && <div className="text-[9.5px] font-medium text-slate-500 truncate max-w-[85px] mx-auto mt-0.5">{disp.sub}</div>}
                                    </td>
                                  );
                                })}

                                {/* BREAK TIME */}
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
                                      <div className="font-extrabold text-xs text-indigo-950">{disp.label}</div>
                                      {disp.sub && <div className="text-[9.5px] font-medium text-slate-500 truncate max-w-[85px] mx-auto mt-0.5">{disp.sub}</div>}
                                    </td>
                                  );
                                })}

                                {/* LUNCH TIME */}
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
                                        <div className="font-extrabold text-xs text-indigo-950">{disp.label}</div>
                                        {disp.sub && <div className="text-[9.5px] font-medium text-slate-500 truncate max-w-[85px] mx-auto mt-0.5">{disp.sub}</div>}
                                      </td>
                                    );
                                  })
                                )}

                                {/* ASSEMBLY */}
                                {isFirst && (
                                  <td
                                    rowSpan={classCount}
                                    className="border border-slate-200 bg-indigo-50 text-indigo-800 text-center text-[10px] font-black uppercase align-middle"
                                  >
                                    ASSEMBLY
                                  </td>
                                )}

                                {/* EXTRA CURRICULUM */}
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
                              {PERIODS.map((p) => (
                                <th key={p.num} className="border border-slate-200 px-2 py-2 text-center">
                                  <span className="block font-black text-xs text-slate-900">{p.num}</span>
                                  <span className="text-[9px] font-normal text-slate-500">{p.time}</span>
                                </th>
                              ))}
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
                                {PERIODS.map((p) => {
                                  const slot = slotMap.get(`${day.id}-${p.num}-${targetClass.id}`);
                                  const disp = getSlotDisplay(slot);

                                  return (
                                    <td
                                      key={p.num}
                                      onClick={() => isManager && handleSlotClick(day.id, p.num, targetClass.id)}
                                      className={cls(
                                        "border border-slate-200 px-2 py-2 text-center transition",
                                        isManager && "cursor-pointer hover:bg-violet-50",
                                        disp.isSpecial ? "bg-slate-100" : "",
                                      )}
                                      title={slot ? `${slot.subjectName || slot.customLabel} (${slot.teacherName || ""})` : ""}
                                    >
                                      <div className="font-extrabold text-slate-900 text-sm">{disp.label}</div>
                                      {slot?.teacherName && (
                                        <div className="text-[10px] text-violet-700 font-medium truncate max-w-[90px] mx-auto mt-0.5">
                                          {slot.teacherName}
                                        </div>
                                      )}
                                      {slot?.room && (
                                        <div className="text-[9px] text-slate-400">{slot.room}</div>
                                      )}
                                    </td>
                                  );
                                })}
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
                              {PERIODS.map((p) => (
                                <th key={p.num} className="border border-slate-200 px-2 py-2 text-center">
                                  <span className="block font-black text-xs text-slate-900">{p.num}</span>
                                  <span className="text-[9px] font-normal text-slate-500">{p.time}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {DAYS.map((day) => (
                              <tr key={day.id} className="hover:bg-slate-50">
                                <td className="border border-slate-200 bg-slate-50 px-3 py-3 font-extrabold text-slate-800">
                                  {day.name}
                                </td>
                                {PERIODS.map((p) => {
                                  const slot = data.slots.find(
                                    (sl) =>
                                      sl.teacherId === Number(currentTeacherId) &&
                                      sl.dayOfWeek === day.id &&
                                      sl.period === p.num,
                                  );

                                  if (!slot) {
                                    return (
                                      <td
                                        key={p.num}
                                        className="border border-slate-200 px-2 py-2 text-center bg-slate-50/40 text-slate-400"
                                      >
                                        <span className="text-[10px] italic">Free</span>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td
                                      key={p.num}
                                      className="border border-slate-200 px-2 py-2 text-center bg-indigo-50/60"
                                    >
                                      <div className="font-black text-indigo-950 text-sm">
                                        {slot.className} {slot.classSection ? `(${slot.classSection})` : ""}
                                      </div>
                                      <div className="font-bold text-indigo-700 text-[10px] mt-0.5">
                                        {slot.subjectCode || slot.subjectName || "Subject"}
                                      </div>
                                      {slot.room && (
                                        <div className="text-[9px] text-slate-500">{slot.room}</div>
                                      )}
                                    </td>
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
        {/* MODAL: ADD CLASS / STREAM ROW TO TIMETABLE (Academic)     */}
        {/* ========================================================= */}
        {addClassModalOpen && (
          <Modal
            open={addClassModalOpen}
            onClose={() => setAddClassModalOpen(false)}
            title="➕ Add Class or Stream Row (e.g. Form 4 A, Form 4 B)"
          >
            <form onSubmit={handleAddClassRow} className="space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-900 leading-relaxed">
                💡 Unaweza kuongeza mkondo/stream kwa darasa lolote (k.m. <b>Form 4 A</b> au <b>Form 4 B</b>, <b>Form 1 A</b> au <b>Form 1 B</b>).
                Mfumo utatengeneza kiotomatiki safu ya darasa hilo kwenye ratiba kuu kwa vipindi 1 hadi 9 kwa wiki nzima!
              </div>

              {classMsg && (
                <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                  {classMsg}
                </div>
              )}

              <Field label="Class Name (Darasa)" required>
                <input
                  type="text"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="e.g. Form 1, Form 2, Form 3, Form 4"
                  className={inputCls}
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {["Form 1", "Form 2", "Form 3", "Form 4"].map((cn) => (
                    <button
                      key={cn}
                      type="button"
                      onClick={() => setClassForm({ ...classForm, name: cn })}
                      className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700"
                    >
                      {cn}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Stream / Section (Mkondo)" required>
                <input
                  type="text"
                  value={classForm.section}
                  onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                  placeholder="e.g. A, B, C, Science, Arts"
                  className={inputCls}
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {["A", "B", "C", "A & B", "Science", "Arts"].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setClassForm({ ...classForm, section: sec })}
                      className="rounded-lg bg-violet-50 hover:bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700 border border-violet-200"
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Student Capacity (Optional)">
                <input
                  type="number"
                  min={1}
                  value={classForm.capacity}
                  onChange={(e) => setClassForm({ ...classForm, capacity: Number(e.target.value) || 40 })}
                  className={inputCls}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddClassModalOpen(false)}
                  className={btnGhost}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClass}
                  className={btnPrimary}
                >
                  {savingClass ? "Adding..." : "➕ Create & Add to Timetable"}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ========================================================= */}
        {/* MODAL: MANAGE TIMETABLE CLASSES / STREAMS                 */}
        {/* ========================================================= */}
        {manageClassesOpen && (
          <Modal
            open={manageClassesOpen}
            onClose={() => { setManageClassesOpen(false); setEditingClass(null); }}
            title="🏫 Manage Timetable Classes & Stream Rows"
            wide
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Orodha ya madarasa na mikondo yote iliyopo kwenye ratiba. Unaweza kubadilisha mkondo (k.m. kuweka A au B) au kufuta safu ya darasa kwenye ratiba.
              </p>

              {editingClass ? (
                <form onSubmit={handleUpdateClass} className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
                  <p className="font-extrabold text-xs text-violet-900 uppercase">
                    ✏️ Edit Class Row: {editingClass.name}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Class Name" required>
                      <input
                        type="text"
                        value={editingClass.name}
                        onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                        className={inputCls}
                        required
                      />
                    </Field>
                    <Field label="Stream / Section" required>
                      <input
                        type="text"
                        value={editingClass.section}
                        onChange={(e) => setEditingClass({ ...editingClass, section: e.target.value })}
                        placeholder="e.g. A, B"
                        className={inputCls}
                        required
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingClass(null)} className={btnGhost}>
                      Cancel
                    </button>
                    <button type="submit" className={btnPrimary}>
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">Class Name</th>
                      <th className="px-3 py-2 text-left font-bold">Stream / Section</th>
                      <th className="px-3 py-2 text-center font-bold">Print Format</th>
                      <th className="px-3 py-2 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.classes.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-bold text-slate-800">{c.name}</td>
                        <td className="px-3 py-2.5">
                          {c.section ? (
                            <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">
                              {c.section}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No section</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                          {formatClassPrint(c.name, c.section)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingClass({ id: c.id, name: c.name, section: c.section })}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClass(c.id, c.name)}
                              className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                            >
                              🗑️ Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => { setManageClassesOpen(false); setAddClassModalOpen(true); }}
                  className={cls(btnPrimary, "text-xs font-bold")}
                >
                  ➕ Add New Class / Stream Row
                </button>
                <button
                  type="button"
                  onClick={() => setManageClassesOpen(false)}
                  className={btnGhost}
                >
                  Close
                </button>
              </div>
            </div>
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
