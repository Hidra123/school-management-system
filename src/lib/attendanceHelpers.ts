// Shared, framework-agnostic helpers for the Attendance module.
// Safe to import from both server (API routes) and client (React pages).

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type AttendanceSession = "morning" | "afternoon";

/** The 3 statuses cycled through by clicking the daily-entry toggle button (P → A → L → P). */
export const CYCLE_STATUSES: AttendanceStatus[] = ["present", "absent", "late"];

export function nextStatus(current: AttendanceStatus): AttendanceStatus {
  const idx = CYCLE_STATUSES.indexOf(current);
  return CYCLE_STATUSES[(idx + 1) % CYCLE_STATUSES.length];
}

export const STATUS_LETTER: Record<AttendanceStatus, string> = {
  present: "P",
  absent: "A",
  late: "L",
  excused: "E",
};

export const STATUS_STYLE: Record<AttendanceStatus, { bg: string; text: string }> = {
  present: { bg: "bg-emerald-500", text: "text-white" },
  absent: { bg: "bg-rose-500", text: "text-white" },
  late: { bg: "bg-amber-500", text: "text-white" },
  excused: { bg: "bg-sky-500", text: "text-white" },
};

/** Number of days in a given month (1-indexed month). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Format a YYYY-MM-DD date string for a given year/month/day. */
export function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Attendance-rate → human status label + tone, used in reports. */
export function rateStatus(rate: number): { label: string; tone: "emerald" | "blue" | "amber" | "rose" } {
  if (rate >= 90) return { label: "Excellent", tone: "emerald" };
  if (rate >= 75) return { label: "Good", tone: "blue" };
  if (rate >= 60) return { label: "Warning", tone: "amber" };
  return { label: "At Risk", tone: "rose" };
}

/** Current year/month as numbers (local time). */
export function currentYearMonth(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
