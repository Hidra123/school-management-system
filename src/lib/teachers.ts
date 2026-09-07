import { teachers, users } from "@/db/schema";

/** Columns returned for a teacher joined with their login account. */
export function teacherSelect() {
  return {
    id: teachers.id,
    userId: teachers.userId,
    name: teachers.name,
    email: teachers.email,
    phone: teachers.phone,
    subject: teachers.subject,
    qualification: teachers.qualification,
    hireDate: teachers.hireDate,
    createdAt: teachers.createdAt,
    username: users.username,
    rawPassword: users.rawPassword,
    mustChangePassword: users.mustChangePassword,
    accountActive: users.active,
  };
}
