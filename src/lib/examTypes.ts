/**
 * EXAM TYPE — single source of truth.
 *
 * The school uses ONLY two exam types:
 *   SE → School Examination        (mid-term, terminal, final, NECTA-style papers)
 *   CA → Continuously Assessment   (tests, quizzes, assignments, projects)
 *
 * Every dropdown, badge and API validation must use this file so the two
 * choices can never drift apart between the Examinations panel and
 * Submit Scores.
 */

export type ExamTypeOption = {
  value: ExamType;
  label: string;
  short: string;
  hint: string;
  tone: "indigo" | "amber";
};

export const EXAM_TYPES: ExamTypeOption[] = [
  {
    value: "SE",
    label: "School Examination (SE)",
    short: "SE",
    hint: "Official school examinations — mid-term, terminal and final papers.",
    tone: "indigo" as const,
  },
  {
    value: "CA",
    label: "Continuously Assessment (CAs)",
    short: "CA",
    hint: "Continuous assessment — tests, quizzes, assignments and projects.",
    tone: "amber" as const,
  },
];

export type ExamType = "SE" | "CA";

/** Values accepted by the API and stored in the database. */
export const EXAM_TYPE_VALUES: ExamType[] = EXAM_TYPES.map((t) => t.value);

/** Legacy values that existed before this rule — mapped forward on read/edit. */
const LEGACY_TO_SE = ["MOCK", "NECTA", "OTHER", "midterm", "final", "FINAL", "Midterm", "Final"];
const LEGACY_TO_CA = ["assignment", "quiz", "project", "Assignment", "Quiz", "Project"];

export function isExamType(value: unknown): value is ExamType {
  return value === "SE" || value === "CA";
}

/** Converts any legacy/old exam type into the closest of the two allowed types. */
export function normalizeExamType(value: string | null | undefined): ExamType {
  if (isExamType(value)) return value;
  if (value && LEGACY_TO_CA.includes(value)) return "CA";
  return "SE";
}

/** Full label, e.g. "School Examination (SE)". Unknown values fall back to themselves. */
export function examTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return EXAM_TYPES.find((t) => t.value === value)?.label ?? value;
}

/** Short badge text, e.g. "SE". */
export function examTypeShort(value: string | null | undefined): string {
  if (!value) return "—";
  return EXAM_TYPES.find((t) => t.value === value)?.short ?? value;
}

/** Badge tone for <Badge tone={...}> from @/components/ui. */
export function examTypeTone(value: string | null | undefined): "indigo" | "amber" | "slate" {
  return EXAM_TYPES.find((t) => t.value === value)?.tone ?? "slate";
}
