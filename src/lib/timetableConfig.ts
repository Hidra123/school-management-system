/**
 * TIMETABLE layout — single source of truth shared by the builder UI, the
 * read-only views and the printed reports. Only lesson periods (1..9) are
 * stored in the database; breaks/lunch/assembly/extra are fixed layout rows.
 */

export type TimetableSlot = {
  kind: "lesson" | "break" | "lunch" | "assembly" | "extra";
  /** Lesson period number (only when kind === "lesson"). */
  n?: number;
  label: string;
  start: string;
  end: string;
};

export const DAYS = [
  { num: 1, label: "MONDAY", short: "MON" },
  { num: 2, label: "TUESDAY", short: "TUE" },
  { num: 3, label: "WEDNESDAY", short: "WED" },
  { num: 4, label: "THURSDAY", short: "THU" },
  { num: 5, label: "FRIDAY", short: "FRI" },
] as const;

export const SLOTS: TimetableSlot[] = [
  { kind: "lesson", n: 1, label: "1", start: "08:00", end: "08:40" },
  { kind: "lesson", n: 2, label: "2", start: "08:40", end: "09:20" },
  { kind: "lesson", n: 3, label: "3", start: "09:20", end: "10:00" },
  { kind: "lesson", n: 4, label: "4", start: "10:00", end: "10:40" },
  { kind: "break", label: "BREAK TIME", start: "10:40", end: "11:00" },
  { kind: "lesson", n: 5, label: "5", start: "11:00", end: "11:40" },
  { kind: "lesson", n: 6, label: "6", start: "11:40", end: "12:20" },
  { kind: "lesson", n: 7, label: "7", start: "12:20", end: "13:00" },
  { kind: "lunch", label: "LUNCH TIME", start: "13:00", end: "13:30" },
  { kind: "lesson", n: 8, label: "8", start: "13:30", end: "14:10" },
  { kind: "lesson", n: 9, label: "9", start: "14:10", end: "14:50" },
  { kind: "assembly", label: "ASSEMBLY", start: "14:50", end: "15:00" },
  { kind: "extra", label: "EXTRA CURRICULUM", start: "15:00", end: "16:30" },
];

/** Lesson period numbers stored on entries (1..9). */
export const LESSON_PERIODS: number[] = SLOTS.filter((s) => s.kind === "lesson").map((s) => s.n as number);

/** Weekly extra-curriculum activities (matches the school wall timetable). */
export const EXTRA_ACTIVITIES: Record<number, string> = {
  1: "Sport & Game",
  2: "Subject Clubs",
  3: "Debate",
  4: "Self Study",
  5: "General Cleanliness",
};

/** Display code for a subject — its stored code, or first 4 letters of the name. */
export function subjectCodeOf(name: string, code?: string | null): string {
  if (code && code.trim()) return code.trim().toUpperCase();
  return name.trim().slice(0, 4).toUpperCase();
}

/** Times line for a lesson period, e.g. "08:00 - 08:40" ("" for unknown). */
export function periodTime(n: number): string {
  const slot = SLOTS.find((s) => s.kind === "lesson" && s.n === n);
  return slot ? `${slot.start} - ${slot.end}` : "";
}
