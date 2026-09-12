// ========================================
// All permissions a member can be assigned
// ========================================
export const ALL_PERMISSIONS = [
  // Dashboard
  { key: "dashboard", label: "View Dashboard", group: "Dashboard", icon: "ðŸ“Š" },

  // Students
  { key: "students.view", label: "View Students", group: "Students", icon: "ðŸ‘¨â€ðŸŽ“" },
  { key: "students.create", label: "Add / Admit Students", group: "Students", icon: "ðŸ‘¨â€ðŸŽ“" },
  { key: "students.edit", label: "Edit Students", group: "Students", icon: "ðŸ‘¨â€ðŸŽ“" },
  { key: "students.delete", label: "Delete Students", group: "Students", icon: "ðŸ‘¨â€ðŸŽ“" },

  // Teachers (member-level â€” view only)
  { key: "teachers.view", label: "View Teachers", group: "Teachers", icon: "ðŸ‘¨â€ðŸ«" },

  // Classes
  { key: "classes.view", label: "View Classes", group: "Classes", icon: "ðŸ«" },
  { key: "classes.manage", label: "Manage Classes", group: "Classes", icon: "ðŸ«" },

  // Subjects
  { key: "subjects.view", label: "View Subjects", group: "Subjects", icon: "ðŸ“š" },
  { key: "subjects.manage", label: "Manage Subjects", group: "Subjects", icon: "ðŸ“š" },

  // Attendance
  { key: "attendance.view", label: "View Attendance", group: "Attendance", icon: "âœ…" },
  { key: "attendance.manage", label: "Mark / Edit Attendance", group: "Attendance", icon: "âœ…" },
  { key: "attendance.trackall", label: "Attendance Tracking Centre (All Classes)", group: "Attendance", icon: "ðŸ—“ï¸" },

  // Examinations
  { key: "exams.view", label: "View Examinations", group: "Examinations", icon: "ðŸ“‹" },
  { key: "exams.manage", label: "Manage Examinations", group: "Examinations", icon: "ðŸ“‹" },
  { key: "exams.results", label: "Publish Results", group: "Examinations", icon: "ðŸ“‹" },

  // Grades / Scores
  { key: "grades.view", label: "View Scores", group: "Scores", icon: "ðŸ“" },
  { key: "grades.submit", label: "Submit Scores", group: "Scores", icon: "ðŸ“" },
  { key: "grades.track", label: "Score Tracking", group: "Scores", icon: "ðŸ“" },
  { key: "grades.report", label: "Submission Report", group: "Scores", icon: "ðŸ“" },

  // Fees
  { key: "fees.view", label: "View Fees", group: "Fees", icon: "ðŸ’°" },
  { key: "fees.manage", label: "Manage Fees & Payments", group: "Fees", icon: "ðŸ’°" },

  // Timetable
  { key: "timetable.view", label: "View Timetable", group: "Timetable", icon: "ðŸ“…" },
  { key: "timetable.manage", label: "Manage Timetable", group: "Timetable", icon: "ðŸ“…" },

  // Assignments
  { key: "assignments.view", label: "View Assignments", group: "Assignments", icon: "ðŸ“„" },
  { key: "assignments.manage", label: "Manage Assignments", group: "Assignments", icon: "ðŸ“„" },

  // Lesson Plan
  { key: "lessonplan.view", label: "View Lesson Plans", group: "Lesson Plans", icon: "ðŸ“–" },
  { key: "lessonplan.manage", label: "Manage Lesson Plans", group: "Lesson Plans", icon: "ðŸ“–" },

  // Subject Log Book
  { key: "logbook.view", label: "View Subject Log Book", group: "Log Book", icon: "ðŸ““" },
  { key: "logbook.manage", label: "Manage Log Entries", group: "Log Book", icon: "ðŸ““" },

  // TOD Report
  { key: "tod.view", label: "View TOD Reports", group: "Teacher On Duty", icon: "ðŸ”°" },
  { key: "tod.manage", label: "Manage TOD Reports", group: "Teacher On Duty", icon: "ðŸ”°" },

  // Messages
  { key: "messages.view", label: "View Messages", group: "Messages", icon: "ðŸ’¬" },
  { key: "messages.send", label: "Send Messages", group: "Messages", icon: "ðŸ’¬" },

  // Studentâ€“Subject Mapping
  { key: "students.map", label: "Map Students to Subjects", group: "Students", icon: "ðŸ‘¥" },

  // Academic Year Progression & Promotion
  { key: "year.manage", label: "Year Progression & Promotion", group: "Year Management", icon: "âž”" },

  // Change Password (all members get this by default)
  { key: "profile.edit", label: "Change Password", group: "Account", icon: "ðŸ”‘" },
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number]["key"];

export function getPermissionGroups() {
  const groups: Record<string, (typeof ALL_PERMISSIONS)[number][]> = {};
  for (const p of ALL_PERMISSIONS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  }
  return groups;
}

// ========================================
// Role presets â€” quick-assign for admin
// ========================================
export const ROLE_PRESETS = {
  academic_master: {
    label: "ðŸ“˜ Academic Master",
    description: "Full academic control",
    permissions: [
      "dashboard", "students.view", "students.create", "students.edit", "students.map",
      "classes.view", "classes.manage", "subjects.view", "subjects.manage",
      "attendance.view", "attendance.manage", "attendance.trackall",
      "exams.view", "exams.manage", "exams.results",
      "grades.view", "grades.submit", "grades.track", "grades.report",
      "timetable.view", "timetable.manage",
      "year.manage",
      "lessonplan.view", "lessonplan.manage",
      "logbook.view", "logbook.manage",
      "tod.view", "tod.manage",
      "assignments.view", "assignments.manage",
      "fees.view",
      "messages.view", "messages.send",
      "profile.edit",
    ],
  },
  class_teacher: {
    label: "ðŸ« Class Teacher",
    description: "Manage own class",
    permissions: [
      "dashboard", "students.view", "classes.view", "subjects.view",
      "attendance.view", "attendance.manage",
      "grades.view", "grades.submit", "grades.track", "grades.report",
      "timetable.view",
      "lessonplan.view",
      "logbook.view",
      "assignments.view", "assignments.manage",
      "tod.view", "tod.manage",
      "messages.view", "messages.send",
      "profile.edit",
    ],
  },
  teacher: {
    label: "ðŸ‘¨â€ðŸ« Subject Teacher",
    description: "Submit scores & assignments",
    permissions: [
      "dashboard", "students.view", "classes.view", "subjects.view",
      "grades.view", "grades.submit", "grades.track",
      "timetable.view",
      "lessonplan.view",
      "logbook.view",
      "assignments.view", "assignments.manage",
      "tod.view", "tod.manage",
      "messages.view", "messages.send",
      "profile.edit",
    ],
  },
} as const;

/** Human label for a member's staffRole key, used for role badges in the UI. */
export function staffRoleLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key in ROLE_PRESETS) return ROLE_PRESETS[key as keyof typeof ROLE_PRESETS].label;
  const EXTRA: Record<string, string> = {
    accountant: "ðŸ’° Accountant",
    sports: "âš½ Sports Manager",
    lab: "ðŸ”¬ Lab Technician",
    librarian: "ðŸ“š Librarian",
  };
  return EXTRA[key] ?? null;
}

// ========================================
// ADMIN sidebar â€” only admin sees these
// ========================================
export const ADMIN_SIDEBAR = [
  // MAIN
  { href: "/admin", label: "Dashboard", icon: "ðŸ“Š", group: "MAIN" },
  // STAFF MANAGEMENT
  { href: "/admin/teachers", label: "Manage Teachers", icon: "ðŸ‘¨â€ðŸ«", group: "STAFF MANAGEMENT" },
  { href: "/admin/admissions", label: "Approve Admissions", icon: "âœ…", group: "STAFF MANAGEMENT" },
  { href: "/admin/monitor", label: "Monitor Dashboards", icon: "ðŸ“¡", group: "STAFF MANAGEMENT" },
  // ASSIGNMENTS â€” teacher-facing feature controls
  { href: "/admin/assignments", label: "Assignments", icon: "ðŸŽ¯", group: "ASSIGNMENTS" },
  { href: "/admin/classes", label: "Manage Classes", icon: "ðŸ«", group: "ASSIGNMENTS" },
  { href: "/admin/subjects", label: "Manage Subjects", icon: "ðŸ“š", group: "ASSIGNMENTS" },
  { href: "/attendance-tracking", label: "Attendance Tracking", icon: "ðŸ—“ï¸", group: "ASSIGNMENTS" },
  { href: "/map-students", label: "Map Students", icon: "ðŸ‘¥", group: "ASSIGNMENTS" },
  { href: "/year-progression", label: "Year Progression", icon: "âž”", group: "ASSIGNMENTS" },
  { href: "/tod", label: "TOD Report", icon: "ðŸ”°", group: "ASSIGNMENTS" },
  // PARENTS
  { href: "/admin/parents", label: "Manage Parents", icon: "ðŸ‘ª", group: "PARENTS" },
  // USER CONTROL
  { href: "/admin/activity", label: "Activity Control", icon: "ðŸ””", group: "USER CONTROL", badge: "NEW" },
  { href: "/admin/sessions", label: "Live Sessions", icon: "ðŸ‘¥", group: "USER CONTROL" },
  { href: "/admin/audit", label: "Audit Trail", icon: "ðŸ“‹", group: "USER CONTROL" },
  // ADMINISTRATION
  { href: "/admin/settings", label: "System Settings", icon: "âš™ï¸", group: "ADMINISTRATION" },
  { href: "/admin/profile", label: "Admin Profile", icon: "ðŸ‘¤", group: "ADMINISTRATION" },
] as const;

// ========================================
// MEMBER sidebar â€” filtered by permissions
// ========================================
export const MEMBER_SIDEBAR = [
  { href: "/", label: "Dashboard", icon: "ðŸ“Š", perm: "dashboard", group: "MAIN" },
  { href: "/students", label: "Students", icon: "ðŸ‘¨â€ðŸŽ“", perm: "students.view", group: "STUDENT MANAGEMENT" },
  { href: "/classes", label: "Classes", icon: "ðŸ«", perm: "classes.view", group: "STUDENT MANAGEMENT" },
  { href: "/map-students", label: "Map Students", icon: "ðŸ‘¥", perm: "students.map", group: "STUDENT MANAGEMENT" },
  { href: "/year-progression", label: "Year Progression", icon: "âž”", perm: "year.manage", group: "YEAR MANAGEMENT" },
  { href: "/subjects", label: "Subjects", icon: "ðŸ“š", perm: "subjects.view", group: "ACADEMIC" },
  { href: "/attendance", label: "Attendance", icon: "âœ…", perm: "attendance.view", group: "ACADEMIC" },
  { href: "/attendance-tracking", label: "Attendance Tracking", icon: "ðŸ—“ï¸", perm: "attendance.trackall", group: "MONITORING" },
  { href: "/exams", label: "Examinations", icon: "ðŸ“‹", perm: "exams.view", group: "ACADEMIC" },
  { href: "/grades", label: "Submit Scores", icon: "ðŸ“", perm: "grades.view", group: "ACADEMIC" },
  { href: "/grades/tracking", label: "Score Tracking", icon: "ðŸ“Š", perm: "grades.track", group: "ACADEMIC" },
  { href: "/timetable", label: "Timetable", icon: "ðŸ“…", perm: "timetable.view", group: "ACADEMIC" },
  { href: "/assignments", label: "Assignments", icon: "ðŸ“„", perm: "assignments.view", group: "MY CLASS" },
  { href: "/lesson-plans", label: "Lesson Plans", icon: "ðŸ“–", perm: "lessonplan.view", group: "ACADEMIC" },
  { href: "/logbook", label: "Subject Log Book", icon: "ðŸ““", perm: "logbook.view", group: "ACADEMIC" },
  { href: "/tod", label: "Teacher On Duty", icon: "ðŸ”°", perm: "tod.view", group: "REPORTS" },
  { href: "/grades/report", label: "Submission Report", icon: "ðŸ“ˆ", perm: "grades.report", group: "REPORTS" },
  { href: "/fees", label: "Fees", icon: "ðŸ’°", perm: "fees.view", group: "FINANCE" },
  { href: "/messages", label: "Messages", icon: "ðŸ’¬", perm: "messages.view", group: "COMMUNICATION" },
  { href: "/profile", label: "Change Password", icon: "ðŸ”‘", perm: "profile.edit", group: "ACCOUNT" },
] as const;
