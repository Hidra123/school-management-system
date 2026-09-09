// NECTA (Tanzania) O-Level style exam grading helpers — shared between the
// class-wide "Publish Results" report and the individual student report card.

export type Grade = "A" | "B" | "C" | "D" | "F";

/** Score (0-100) → letter grade. Standard O-Level secondary boundaries. */
export function scoreToGrade(score: number): Grade {
  if (score >= 75) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  if (score >= 30) return "D";
  return "F";
}

/** Letter grade → NECTA grade point (lower is better; used for Division calc). */
export function gradeToPoint(grade: Grade): number {
  return { A: 1, B: 2, C: 3, D: 4, F: 5 }[grade];
}

export function scoreToPoint(score: number): number {
  return gradeToPoint(scoreToGrade(score));
}

/** Human remark for a single subject score. */
export function gradeRemark(grade: Grade): string {
  return { A: "EXCELLENT", B: "VERY GOOD", C: "SATISFACTORY", D: "SATISFACTORY", F: "FAIL" }[grade];
}

export type Division = "I" | "II" | "III" | "IV" | "0";

/**
 * Total points across a student's subjects → Division (NECTA CSEE-style
 * boundaries, which are calibrated for a "best 7 subjects" scheme). Division
 * "0" means the student failed outright.
 *
 * The raw NECTA boundaries (I: 7-17, II: 18-21, III: 22-25, IV: 26-33, 0: 34+)
 * assume exactly 7 subjects. Since a school using this system may enter any
 * number of subjects for a given exam (e.g. only 4 core subjects for one
 * exam, 10 for another), we scale the student's average point-per-subject up
 * to a 7-subject equivalent before applying the boundaries. This keeps the
 * classification meaningful regardless of how many subjects were recorded —
 * e.g. a student who scored an F in every one of only 4 subjects entered
 * must land in Division 0, not a passing division, which a naive raw-sum
 * comparison against fixed boundaries would incorrectly produce.
 */
export function pointsToDivision(totalPoints: number, subjectCount: number): Division {
  if (subjectCount === 0) return "0";
  const scaledPoints = (totalPoints / subjectCount) * 7;
  if (scaledPoints <= 17) return "I";
  if (scaledPoints <= 21) return "II";
  if (scaledPoints <= 25) return "III";
  if (scaledPoints <= 33) return "IV";
  return "0";
}

/** Rounds a subject-level (class-wide) GPA to the nearest letter grade + label, used for the "Competency" column. */
export function gpaToCompetency(gpa: number): { grade: Grade; label: string } {
  const rounded = Math.min(5, Math.max(1, Math.round(gpa)));
  const map: Record<number, { grade: Grade; label: string }> = {
    1: { grade: "A", label: "Excellent" },
    2: { grade: "B", label: "Very Good" },
    3: { grade: "C", label: "Good" },
    4: { grade: "D", label: "Satisfactory" },
    5: { grade: "F", label: "Fail" },
  };
  return map[rounded];
}

/**
 * Subjects Tanzanian secondary schools mandate as "core" — students who fail
 * these are flagged for mandatory academic intervention regardless of their
 * overall division. Matched case-insensitively against the subject name.
 */
export const CORE_SUBJECT_KEYWORDS = ["kiswahili", "historia"];

export function isCoreSubject(subjectName: string): boolean {
  const n = subjectName.toLowerCase();
  return CORE_SUBJECT_KEYWORDS.some((k) => n.includes(k));
}

export function behaviorScaleLabel(letter: string): string {
  return (
    { A: "EXCELLENT", B: "VERY GOOD", C: "GOOD", D: "NEEDS IMPROVEMENT", F: "FAIL" }[letter] ?? letter
  );
}

export const DEFAULT_BEHAVIOR_CRITERIA = [
  "Communication Skills",
  "Teamwork & Collaboration",
  "Problem Solving Skills",
  "Adaptability & Flexibility",
  "Time Management",
  "Leadership Skills",
  "Emotional Intelligence",
  "Work Ethic",
  "Cultural Competence",
];
