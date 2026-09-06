// All available permissions in the system
export const ALL_PERMISSIONS = [
  // Dashboard
  { key: "dashboard", label: "View Dashboard", group: "Dashboard", icon: "📊" },
  // Students
  { key: "students.view", label: "View Students", group: "Students", icon: "👨‍🎓" },
  { key: "students.create", label: "Add Students", group: "Students", icon: "👨‍🎓" },
  { key: "students.edit", label: "Edit Students", group: "Students", icon: "👨‍🎓" },
  { key: "students.delete", label: "Delete Students", group: "Students", icon: "👨‍🎓" },
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
  { key: "attendance.manage", label: "Mark/Edit Attendance", group: "Attendance", icon: "✅" },
  // Grades
  { key: "grades.view", label: "View Grades", group: "Grades", icon: "📝" },
  { key: "grades.manage", label: "Enter/Edit Grades", group: "Grades", icon: "📝" },
  { key: "grades.delete", label: "Delete Grades", group: "Grades", icon: "📝" },
  // Fees
  { key: "fees.view", label: "View Fees", group: "Fees", icon: "💰" },
  { key: "fees.create", label: "Add Fees", group: "Fees", icon: "💰" },
  { key: "fees.pay", label: "Record Payments", group: "Fees", icon: "💰" },
  { key: "fees.edit", label: "Edit Fees", group: "Fees", icon: "💰" },
  { key: "fees.delete", label: "Delete Fees", group: "Fees", icon: "💰" },
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number]["key"];

export function getPermissionGroups() {
  const groups: Record<string, typeof ALL_PERMISSIONS[number][]> = {};
  for (const p of ALL_PERMISSIONS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  }
  return groups;
}

// Which sidebar links need which permission to show
export const SIDEBAR_PERMS: Record<string, PermissionKey> = {
  "/": "dashboard",
  "/students": "students.view",
  "/teachers": "teachers.view",
  "/classes": "classes.view",
  "/subjects": "subjects.view",
  "/attendance": "attendance.view",
  "/grades": "grades.view",
  "/fees": "fees.view",
};
