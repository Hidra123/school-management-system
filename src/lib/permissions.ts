// All available permissions in the system
export const ALL_PERMISSIONS = [
  // Dashboard
  { key: "dashboard", label: "View Dashboard", group: "Dashboard", icon: "📊" },

  // Students
  { key: "students.view", label: "View Students", group: "Students", icon: "👨‍🎓" },
  { key: "students.create", label: "Add / Admit Students", group: "Students", icon: "👨‍🎓" },
  { key: "students.edit", label: "Edit Students", group: "Students", icon: "👨‍🎓" },
  { key: "students.delete", label: "Delete Students", group: "Students", icon: "👨‍🎓" },
  { key: "students.approve", label: "Approve Admissions", group: "Students", icon: "👨‍🎓" },
  { key: "students.map", label: "Map Students to Classes", group: "Students", icon: "👨‍🎓" },

  // Teachers
  { key: "teachers.view", label: "View Teachers", group: "Teachers", icon: "👨‍🏫" },
  { key: "teachers.create", label: "Add Teachers", group: "Teachers", icon: "👨‍🏫" },
  { key: "teachers.edit", label: "Edit Teachers", group: "Teachers", icon: "👨‍🏫" },
  { key: "teachers.delete", label: "Delete Teachers", group: "Teachers", icon: "👨‍🏫" },

  // Classes
  { key: "classes.view", label: "View Classes", group: "Classes", icon: "🏫" },
  { key: "classes.create", label: "Add Classes", group: "Classes", icon: "🏫" },
  { key: "classes.edit", label: "Edit Classes", group: "Classes", icon: "🏫" },
  { key: "classes.delete", label: "Delete Classes", group: "Classes", icon: "🏫" },

  // Subjects
  { key: "subjects.view", label: "View Subjects", group: "Subjects", icon: "📚" },
  { key: "subjects.create", label: "Add Subjects", group: "Subjects", icon: "📚" },
  { key: "subjects.edit", label: "Edit Subjects", group: "Subjects", icon: "📚" },
  { key: "subjects.delete", label: "Delete Subjects", group: "Subjects", icon: "📚" },

  // Attendance
  { key: "attendance.view", label: "View Attendance", group: "Attendance", icon: "✅" },
  { key: "attendance.manage", label: "Mark / Edit Attendance", group: "Attendance", icon: "✅" },
  { key: "attendance.track", label: "Attendance Tracking & Reports", group: "Attendance", icon: "✅" },

  // Examinations
  { key: "exams.view", label: "View Examinations", group: "Examinations", icon: "📋" },
  { key: "exams.manage", label: "Create / Edit Examinations", group: "Examinations", icon: "📋" },
  { key: "exams.results", label: "Publish Exam Results", group: "Examinations", icon: "📋" },
  { key: "exams.routine", label: "Exam Routine / Schedule", group: "Examinations", icon: "📋" },

  // Grades / Scores
  { key: "grades.view", label: "View Grades / Scores", group: "Grades & Scores", icon: "📝" },
  { key: "grades.submit", label: "Submit Scores", group: "Grades & Scores", icon: "📝" },
  { key: "grades.track", label: "Score Tracking", group: "Grades & Scores", icon: "📝" },
  { key: "grades.delete", label: "Delete Grades", group: "Grades & Scores", icon: "📝" },
  { key: "grades.report", label: "Submission Report", group: "Grades & Scores", icon: "📝" },

  // Fees
  { key: "fees.view", label: "View Fees", group: "Fees", icon: "💰" },
  { key: "fees.create", label: "Add Fees", group: "Fees", icon: "💰" },
  { key: "fees.pay", label: "Record Payments", group: "Fees", icon: "💰" },
  { key: "fees.edit", label: "Edit Fees", group: "Fees", icon: "💰" },
  { key: "fees.delete", label: "Delete Fees", group: "Fees", icon: "💰" },

  // Timetable
  { key: "timetable.view", label: "View Timetable", group: "Timetable", icon: "📅" },
  { key: "timetable.manage", label: "Create / Edit Timetable", group: "Timetable", icon: "📅" },

  // Assignments
  { key: "assignments.view", label: "View Assignments", group: "Assignments", icon: "📄" },
  { key: "assignments.manage", label: "Create / Edit Assignments", group: "Assignments", icon: "📄" },

  // Lesson Plan
  { key: "lessonplan.view", label: "View Lesson Plans", group: "Lesson Plans", icon: "📖" },
  { key: "lessonplan.manage", label: "Create / Edit Lesson Plans", group: "Lesson Plans", icon: "📖" },

  // Subject Log Book
  { key: "logbook.view", label: "View Subject Log Book", group: "Subject Log Book", icon: "📓" },
  { key: "logbook.manage", label: "Create / Edit Log Entries", group: "Subject Log Book", icon: "📓" },

  // TOD Report (Teacher On Duty)
  { key: "tod.view", label: "View TOD Reports", group: "Teacher On Duty", icon: "🔰" },
  { key: "tod.manage", label: "Create / Edit TOD Reports", group: "Teacher On Duty", icon: "🔰" },

  // Messages
  { key: "messages.view", label: "View Messages", group: "Messages", icon: "💬" },
  { key: "messages.send", label: "Send Messages", group: "Messages", icon: "💬" },

  // Year Progression
  { key: "year.view", label: "View Year Progression", group: "Year Management", icon: "🔄" },
  { key: "year.manage", label: "Promote / Progress Students", group: "Year Management", icon: "🔄" },

  // Parents
  { key: "parents.view", label: "View Parents", group: "Parents", icon: "👪" },
  { key: "parents.manage", label: "Manage Parents", group: "Parents", icon: "👪" },

  // Activity & Monitoring
  { key: "activity.view", label: "View Activity Logs", group: "Monitoring", icon: "📡" },
  { key: "activity.sessions", label: "View Live Sessions", group: "Monitoring", icon: "📡" },
  { key: "activity.audit", label: "View Audit Trail", group: "Monitoring", icon: "📡" },
  { key: "activity.monitor", label: "Monitor Dashboards", group: "Monitoring", icon: "📡" },

  // System Settings
  { key: "settings.view", label: "View System Settings", group: "System", icon: "⚙️" },
  { key: "settings.edit", label: "Edit System Settings", group: "System", icon: "⚙️" },
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

// Role presets — quick-assign templates for admin
export const ROLE_PRESETS = {
  academic_master: {
    label: "📘 Academic Master",
    description: "Full academic control — subjects, exams, scores, timetable, attendance",
    permissions: [
      "dashboard", "students.view", "students.create", "students.edit", "students.approve", "students.map",
      "classes.view", "classes.create", "classes.edit",
      "subjects.view", "subjects.create", "subjects.edit", "subjects.delete",
      "attendance.view", "attendance.manage", "attendance.track",
      "exams.view", "exams.manage", "exams.results", "exams.routine",
      "grades.view", "grades.submit", "grades.track", "grades.report",
      "timetable.view", "timetable.manage",
      "lessonplan.view", "lessonplan.manage",
      "logbook.view", "logbook.manage",
      "tod.view", "tod.manage",
      "assignments.view", "assignments.manage",
      "year.view", "year.manage",
      "messages.view", "messages.send",
    ],
  },
  class_teacher: {
    label: "🏫 Class Teacher",
    description: "Manage own class — attendance, scores, assignments, reports",
    permissions: [
      "dashboard",
      "students.view",
      "classes.view",
      "subjects.view",
      "attendance.view", "attendance.manage",
      "grades.view", "grades.submit", "grades.track", "grades.report",
      "assignments.view", "assignments.manage",
      "tod.view", "tod.manage",
      "messages.view", "messages.send",
    ],
  },
  teacher: {
    label: "👨‍🏫 Subject Teacher",
    description: "Submit scores, track grades, view assignments",
    permissions: [
      "dashboard",
      "students.view",
      "classes.view",
      "subjects.view",
      "grades.view", "grades.submit", "grades.track",
      "assignments.view", "assignments.manage",
      "tod.view", "tod.manage",
      "messages.view", "messages.send",
    ],
  },
} as const;

// Sidebar link definitions
export const SIDEBAR_LINKS = [
  { href: "/", label: "Dashboard", icon: "📊", perm: "dashboard", group: "MAIN" },
  { href: "/students", label: "Students", icon: "👨‍🎓", perm: "students.view", group: "STUDENT MANAGEMENT" },
  { href: "/teachers", label: "Teachers", icon: "👨‍🏫", perm: "teachers.view", group: "STAFF MANAGEMENT" },
  { href: "/classes", label: "Classes", icon: "🏫", perm: "classes.view", group: "STUDENT MANAGEMENT" },
  { href: "/subjects", label: "Subjects", icon: "📚", perm: "subjects.view", group: "ACADEMIC" },
  { href: "/attendance", label: "Attendance", icon: "✅", perm: "attendance.view", group: "ACADEMIC" },
  { href: "/exams", label: "Examinations", icon: "📋", perm: "exams.view", group: "ACADEMIC" },
  { href: "/grades", label: "Scores & Grades", icon: "📝", perm: "grades.view", group: "ACADEMIC" },
  { href: "/timetable", label: "Timetable", icon: "📅", perm: "timetable.view", group: "ACADEMIC" },
  { href: "/assignments", label: "Assignments", icon: "📄", perm: "assignments.view", group: "ACADEMIC" },
  { href: "/lesson-plans", label: "Lesson Plans", icon: "📖", perm: "lessonplan.view", group: "ACADEMIC" },
  { href: "/logbook", label: "Subject Log Book", icon: "📓", perm: "logbook.view", group: "ACADEMIC" },
  { href: "/tod", label: "Teacher On Duty", icon: "🔰", perm: "tod.view", group: "REPORTS" },
  { href: "/fees", label: "Fees", icon: "💰", perm: "fees.view", group: "FINANCE" },
  { href: "/messages", label: "Messages", icon: "💬", perm: "messages.view", group: "COMMUNICATION" },
  { href: "/parents", label: "Parents", icon: "👪", perm: "parents.view", group: "STAFF MANAGEMENT" },
  { href: "/year-progression", label: "Year Progression", icon: "🔄", perm: "year.view", group: "YEAR MANAGEMENT" },
  { href: "/activity", label: "Activity & Monitoring", icon: "📡", perm: "activity.view", group: "MONITORING" },
] as const;
