// ========================================
// All permissions a member can be assigned
// ========================================
export const ALL_PERMISSIONS = [
  // Dashboard
  { key: "dashboard", label: "View Dashboard", group: "Dashboard", icon: "📊" },

  // Students
  { key: "students.view", label: "View Students", group: "Students", icon: "👨‍🎓" },
  { key: "students.create", label: "Add / Admit Students", group: "Students", icon: "👨‍🎓" },
  { key: "students.edit", label: "Edit Students", group: "Students", icon: "👨‍🎓" },
  { key: "students.delete", label: "Delete Students", group: "Students", icon: "👨‍🎓" },

  // Teachers (member-level — view only)
  { key: "teachers.view", label: "View Teachers", group: "Teachers", icon: "👨‍🏫" },

  // Classes
  { key: "classes.view", label: "View Classes", group: "Classes", icon: "🏫" },
  { key: "classes.manage", label: "Manage Classes", group: "Classes", icon: "🏫" },

  // Subjects
  { key: "subjects.view", label: "View Subjects", group: "Subjects", icon: "📚" },
  { key: "subjects.manage", label: "Manage Subjects", group: "Subjects", icon: "📚" },

  // Attendance
  { key: "attendance.view", label: "View Attendance", group: "Attendance", icon: "✅" },
  { key: "attendance.manage", label: "Mark / Edit Attendance", group: "Attendance", icon: "✅" },

  // Examinations
  { key: "exams.view", label: "View Examinations", group: "Examinations", icon: "📋" },
  { key: "exams.manage", label: "Manage Examinations", group: "Examinations", icon: "📋" },
  { key: "exams.results", label: "Publish Results", group: "Examinations", icon: "📋" },

  // Grades / Scores
  { key: "grades.view", label: "View Scores", group: "Scores", icon: "📝" },
  { key: "grades.submit", label: "Submit Scores", group: "Scores", icon: "📝" },
  { key: "grades.track", label: "Score Tracking", group: "Scores", icon: "📝" },
  { key: "grades.report", label: "Submission Report", group: "Scores", icon: "📝" },

  // Fees
  { key: "fees.view", label: "View Fees", group: "Fees", icon: "💰" },
  { key: "fees.manage", label: "Manage Fees & Payments", group: "Fees", icon: "💰" },

  // Timetable
  { key: "timetable.view", label: "View Timetable", group: "Timetable", icon: "📅" },
  { key: "timetable.manage", label: "Manage Timetable", group: "Timetable", icon: "📅" },

  // Assignments
  { key: "assignments.view", label: "View Assignments", group: "Assignments", icon: "📄" },
  { key: "assignments.manage", label: "Manage Assignments", group: "Assignments", icon: "📄" },

  // Lesson Plan
  { key: "lessonplan.view", label: "View Lesson Plans", group: "Lesson Plans", icon: "📖" },
  { key: "lessonplan.manage", label: "Manage Lesson Plans", group: "Lesson Plans", icon: "📖" },

  // Subject Log Book
  { key: "logbook.view", label: "View Subject Log Book", group: "Log Book", icon: "📓" },
  { key: "logbook.manage", label: "Manage Log Entries", group: "Log Book", icon: "📓" },

  // TOD Report
  { key: "tod.view", label: "View TOD Reports", group: "Teacher On Duty", icon: "🔰" },
  { key: "tod.manage", label: "Manage TOD Reports", group: "Teacher On Duty", icon: "🔰" },

  // Messages
  { key: "messages.view", label: "View Messages", group: "Messages", icon: "💬" },
  { key: "messages.send", label: "Send Messages", group: "Messages", icon: "💬" },

  // Change Password (all members get this by default)
  { key: "profile.edit", label: "Change Password", group: "Account", icon: "🔑" },
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
// Role presets — quick-assign for admin
// ========================================
export const ROLE_PRESETS = {
  academic_master: {
    label: "📘 Academic Master",
    description: "Full academic control",
    permissions: [
      "dashboard", "students.view", "students.create", "students.edit",
      "classes.view", "classes.manage", "subjects.view", "subjects.manage",
      "attendance.view", "attendance.manage",
      "exams.view", "exams.manage", "exams.results",
      "grades.view", "grades.submit", "grades.track", "grades.report",
      "timetable.view", "timetable.manage",
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
    label: "🏫 Class Teacher",
    description: "Manage own class",
    permissions: [
      "dashboard", "students.view", "classes.view", "subjects.view",
      "attendance.view", "attendance.manage",
      "grades.view", "grades.submit", "grades.track", "grades.report",
      "assignments.view", "assignments.manage",
      "tod.view", "tod.manage",
      "messages.view", "messages.send",
      "profile.edit",
    ],
  },
  teacher: {
    label: "👨‍🏫 Subject Teacher",
    description: "Submit scores & assignments",
    permissions: [
      "dashboard", "students.view", "classes.view", "subjects.view",
      "grades.view", "grades.submit", "grades.track",
      "assignments.view", "assignments.manage",
      "tod.view", "tod.manage",
      "messages.view", "messages.send",
      "profile.edit",
    ],
  },
} as const;

// ========================================
// ADMIN sidebar — only admin sees these
// ========================================
export const ADMIN_SIDEBAR = [
  { href: "/admin", label: "Overview", icon: "📊", group: "MAIN" },
  { href: "/admin/activity", label: "Activity Control", icon: "🔔", group: "USER CONTROL", badge: "NEW" },
  { href: "/admin/sessions", label: "Live Sessions", icon: "👥", group: "USER CONTROL" },
  { href: "/admin/audit", label: "Audit Trail", icon: "📋", group: "USER CONTROL" },
  { href: "/admin/teachers", label: "Manage Teachers", icon: "👨‍🏫", group: "STAFF MANAGEMENT" },
  { href: "/admin/parents", label: "Manage Parents", icon: "👪", group: "STAFF MANAGEMENT" },
  { href: "/admin/admissions", label: "Approve Admissions", icon: "✅", group: "ACADEMIC" },
  { href: "/admin/monitor", label: "Monitor Dashboards", icon: "📡", group: "ACADEMIC" },
  { href: "/admin/settings", label: "System Settings", icon: "⚙️", group: "ADMINISTRATION" },
  { href: "/admin/profile", label: "Admin Profile", icon: "👤", group: "ADMINISTRATION" },
  { href: "/admin/assignments", label: "Assignments", icon: "🎯", group: "ADMINISTRATION" },
] as const;

// ========================================
// MEMBER sidebar — filtered by permissions
// ========================================
export const MEMBER_SIDEBAR = [
  { href: "/", label: "Dashboard", icon: "📊", perm: "dashboard", group: "MAIN" },
  { href: "/students", label: "Students", icon: "👨‍🎓", perm: "students.view", group: "STUDENT MANAGEMENT" },
  { href: "/classes", label: "Classes", icon: "🏫", perm: "classes.view", group: "STUDENT MANAGEMENT" },
  { href: "/subjects", label: "Subjects", icon: "📚", perm: "subjects.view", group: "ACADEMIC" },
  { href: "/attendance", label: "Attendance", icon: "✅", perm: "attendance.view", group: "ACADEMIC" },
  { href: "/exams", label: "Examinations", icon: "📋", perm: "exams.view", group: "ACADEMIC" },
  { href: "/grades", label: "Submit Scores", icon: "📝", perm: "grades.view", group: "ACADEMIC" },
  { href: "/grades/tracking", label: "Score Tracking", icon: "📊", perm: "grades.track", group: "ACADEMIC" },
  { href: "/timetable", label: "Timetable", icon: "📅", perm: "timetable.view", group: "ACADEMIC" },
  { href: "/assignments", label: "Assignments", icon: "📄", perm: "assignments.view", group: "MY CLASS" },
  { href: "/lesson-plans", label: "Lesson Plans", icon: "📖", perm: "lessonplan.view", group: "ACADEMIC" },
  { href: "/logbook", label: "Subject Log Book", icon: "📓", perm: "logbook.view", group: "ACADEMIC" },
  { href: "/tod", label: "Teacher On Duty", icon: "🔰", perm: "tod.view", group: "REPORTS" },
  { href: "/grades/report", label: "Submission Report", icon: "📈", perm: "grades.report", group: "REPORTS" },
  { href: "/fees", label: "Fees", icon: "💰", perm: "fees.view", group: "FINANCE" },
  { href: "/messages", label: "Messages", icon: "💬", perm: "messages.view", group: "COMMUNICATION" },
  { href: "/profile", label: "Change Password", icon: "🔑", perm: "profile.edit", group: "ACCOUNT" },
] as const;
