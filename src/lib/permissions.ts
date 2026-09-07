// Permission groups and their permissions
export const PERMISSION_GROUPS = {
  dashboard: {
    label: "Dashboard",
    permissions: ["dashboard.view"],
  },
  students: {
    label: "Students",
    permissions: ["students.view", "students.create", "students.edit", "students.delete"],
  },
  teachers: {
    label: "Teachers",
    permissions: ["teachers.view"],
  },
  classes: {
    label: "Classes",
    permissions: ["classes.view", "classes.create"],
  },
  subjects: {
    label: "Subjects",
    permissions: ["subjects.view", "subjects.create"],
  },
  attendance: {
    label: "Attendance",
    permissions: ["attendance.view", "attendance.create", "attendance.edit"],
  },
  examinations: {
    label: "Examinations",
    permissions: ["examinations.view", "examinations.create", "examinations.edit"],
  },
  scores: {
    label: "Scores",
    permissions: ["scores.view", "scores.create", "scores.edit", "scores.delete"],
  },
  fees: {
    label: "Fees",
    permissions: ["fees.view", "fees.create"],
  },
  timetable: {
    label: "Timetable",
    permissions: ["timetable.view", "timetable.create"],
  },
  assignments: {
    label: "Assignments",
    permissions: ["assignments.view", "assignments.create"],
  },
  lesson_plans: {
    label: "Lesson Plans",
    permissions: ["lesson_plans.view", "lesson_plans.create"],
  },
  log_book: {
    label: "Log Book",
    permissions: ["log_book.view", "log_book.create"],
  },
  teacher_on_duty: {
    label: "Teacher On Duty",
    permissions: ["teacher_on_duty.view", "teacher_on_duty.create"],
  },
  messages: {
    label: "Messages",
    permissions: ["messages.view", "messages.create"],
  },
  account: {
    label: "Account",
    permissions: ["account.change_password"],
  },
} as const;

// All permissions
export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flatMap(
  (group) => group.permissions
);

// Role presets
export const ROLE_PRESETS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS,
  "Academic Master": [
    // Dashboard
    "dashboard.view",
    // Students
    "students.view", "students.create", "students.edit", "students.delete",
    // Teachers
    "teachers.view",
    // Classes
    "classes.view", "classes.create",
    // Subjects
    "subjects.view", "subjects.create",
    // Attendance
    "attendance.view", "attendance.create", "attendance.edit",
    // Examinations
    "examinations.view", "examinations.create", "examinations.edit",
    // Scores
    "scores.view", "scores.create", "scores.edit", "scores.delete",
    // Fees
    "fees.view",
    // Timetable
    "timetable.view", "timetable.create",
    // Assignments
    "assignments.view",
    // Lesson Plans
    "lesson_plans.view",
    // Log Book
    "log_book.view",
    // Teacher On Duty
    "teacher_on_duty.view",
    // Messages
    "messages.view", "messages.create",
    // Account
    "account.change_password",
  ],
  "Class Teacher": [
    // Dashboard
    "dashboard.view",
    // Students
    "students.view",
    // Classes
    "classes.view",
    // Subjects
    "subjects.view",
    // Attendance
    "attendance.view", "attendance.create", "attendance.edit",
    // Examinations
    "examinations.view",
    // Scores
    "scores.view", "scores.create", "scores.edit",
    // Fees
    "fees.view",
    // Timetable
    "timetable.view",
    // Assignments
    "assignments.view",
    // Lesson Plans
    "lesson_plans.view", "lesson_plans.create",
    // Log Book
    "log_book.view", "log_book.create",
    // Teacher On Duty
    "teacher_on_duty.view", "teacher_on_duty.create",
    // Messages
    "messages.view", "messages.create",
    // Account
    "account.change_password",
  ],
  "Subject Teacher": [
    // Dashboard
    "dashboard.view",
    // Students
    "students.view",
    // Classes
    "classes.view",
    // Subjects
    "subjects.view",
    // Attendance
    "attendance.view", "attendance.create",
    // Examinations
    "examinations.view",
    // Scores
    "scores.view", "scores.create", "scores.edit",
    // Timetable
    "timetable.view",
    // Assignments
    "assignments.view",
    // Lesson Plans
    "lesson_plans.view", "lesson_plans.create",
    // Log Book
    "log_book.view", "log_book.create",
    // Messages
    "messages.view", "messages.create",
    // Account
    "account.change_password",
  ],
  Accountant: [
    // Dashboard
    "dashboard.view",
    // Fees
    "fees.view", "fees.create",
    // Messages
    "messages.view", "messages.create",
    // Account
    "account.change_password",
  ],
  "Sports Manager": [
    // Dashboard
    "dashboard.view",
    // Messages
    "messages.view", "messages.create",
    // Account
    "account.change_password",
  ],
  "Lab Technician": [
    // Dashboard
    "dashboard.view",
    // Messages
    "messages.view", "messages.create",
    // Account
    "account.change_password",
  ],
  Librarian: [
    // Dashboard
    "dashboard.view",
    // Messages
    "messages.view", "messages.create",
    // Account
    "account.change_password",
  ],
};

// Assignment role types
export const ASSIGNMENT_ROLES = [
  "Academic Master",
  "Class Teacher",
  "Subject Teacher",
  "Accountant",
  "Sports Manager",
  "Lab Technician",
  "Librarian",
] as const;

// Admin sidebar items (all admin-only pages)
export const ADMIN_SIDEBAR = [
  {
    group: "MAIN",
    items: [
      { label: "Dashboard", href: "/admin", icon: "📊", permission: "dashboard.view" },
    ],
  },
  {
    group: "STAFF MANAGEMENT",
    items: [
      { label: "Manage Classes", href: "/admin/classes", icon: "🏫", permission: "classes.view" },
      { label: "Manage Subjects", href: "/admin/subjects", icon: "📚", permission: "subjects.view" },
      { label: "Manage Teachers", href: "/admin/teachers", icon: "👨‍🏫", permission: "teachers.view" },
      { label: "Assignments", href: "/admin/assignments", icon: "🎯", permission: "assignments.view" },
      { label: "Approve Admissions", href: "/admin/admissions", icon: "✅", permission: "students.create" },
      { label: "Monitor Dashboards", href: "/admin/monitor", icon: "📡", permission: "dashboard.view" },
    ],
  },
  {
    group: "PARENTS",
    items: [
      { label: "Manage Parents", href: "/admin/parents", icon: "👪", permission: "students.view" },
      { label: "Parent Assignments", href: "/admin/parent-assignments", icon: "🎯", permission: "assignments.view" },
    ],
  },
  {
    group: "USER CONTROL",
    items: [
      { label: "Activity Control", href: "/admin/activity", icon: "🔔", permission: "dashboard.view" },
      { label: "Live Sessions", href: "/admin/sessions", icon: "👥", permission: "dashboard.view" },
      { label: "Audit Trail", href: "/admin/audit", icon: "📋", permission: "dashboard.view" },
    ],
  },
  {
    group: "ADMINISTRATION",
    items: [
      { label: "System Settings", href: "/admin/settings", icon: "⚙️", permission: "dashboard.view" },
      { label: "Admin Profile", href: "/admin/profile", icon: "👤", permission: "account.change_password" },
    ],
  },
];

// Member sidebar items (filtered by permissions)
export const MEMBER_SIDEBAR = [
  {
    group: "MAIN",
    items: [
      { label: "Dashboard", href: "/", icon: "📊", permission: "dashboard.view" },
    ],
  },
  {
    group: "STUDENT MANAGEMENT",
    items: [
      { label: "Students", href: "/students", icon: "👨‍🎓", permission: "students.view" },
      { label: "Classes", href: "/classes", icon: "🏫", permission: "classes.view" },
    ],
  },
  {
    group: "ACADEMIC",
    items: [
      { label: "Subjects", href: "/subjects", icon: "📚", permission: "subjects.view" },
      { label: "Attendance", href: "/attendance", icon: "✅", permission: "attendance.view" },
      { label: "Examinations", href: "/exams", icon: "📋", permission: "examinations.view" },
      { label: "Submit Scores", href: "/grades", icon: "📝", permission: "scores.create" },
      { label: "Score Tracking", href: "/grades/tracking", icon: "📊", permission: "scores.view" },
      { label: "Timetable", href: "/timetable", icon: "📅", permission: "timetable.view" },
      { label: "Lesson Plans", href: "/lesson-plans", icon: "📖", permission: "lesson_plans.view" },
      { label: "Subject Log Book", href: "/logbook", icon: "📓", permission: "log_book.view" },
    ],
  },
  {
    group: "MY CLASS",
    items: [
      { label: "Assignments", href: "/assignments", icon: "📄", permission: "assignments.view" },
    ],
  },
  {
    group: "REPORTS",
    items: [
      { label: "Teacher On Duty", href: "/tod", icon: "🔰", permission: "teacher_on_duty.view" },
      { label: "Submission Report", href: "/grades/report", icon: "📈", permission: "scores.view" },
    ],
  },
  {
    group: "FINANCE",
    items: [
      { label: "Fees", href: "/fees", icon: "💰", permission: "fees.view" },
    ],
  },
  {
    group: "COMMUNICATION",
    items: [
      { label: "Messages", href: "/messages", icon: "💬", permission: "messages.view" },
    ],
  },
  {
    group: "ACCOUNT",
    items: [
      { label: "Change Password", href: "/profile", icon: "🔑", permission: "account.change_password" },
    ],
  },
];

// Check if user has any permission from a list
export function hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
  return permissions.some((p) => userPermissions.includes(p));
}

// Filter sidebar items based on permissions
export function filterSidebarItems(items: typeof MEMBER_SIDEBAR, userPermissions: string[]) {
  return items.map((group) => ({
    group: group.group,
    items: group.items.filter((item) => userPermissions.includes(item.permission)),
  })).filter((group) => group.items.length > 0);
}
