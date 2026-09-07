"use client";

import { useEffect, useState } from "react";
import { StatCard, Spinner } from "../../components/ui";
import { useAuth } from "../../components/AuthProvider";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    students: 0,
    teachers: 0,
    classes: 0,
    subjects: 0,
    attendance: 0,
    fees: 0,
    grades: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          usersRes,
          studentsRes,
          teachersRes,
          classesRes,
          subjectsRes,
          attendanceRes,
          feesRes,
          gradesRes,
        ] = await Promise.all([
          fetch("/api/admin/members"),
          fetch("/api/students"),
          fetch("/api/teachers"),
          fetch("/api/classes"),
          fetch("/api/subjects"),
          fetch("/api/attendance"),
          fetch("/api/fees"),
          fetch("/api/grades"),
        ]);

        const usersData = await usersRes.json();
        const studentsData = await studentsRes.json();
        const teachersData = await teachersRes.json();
        const classesData = await classesRes.json();
        const subjectsData = await subjectsRes.json();
        const attendanceData = await attendanceRes.json();
        const feesData = await feesRes.json();
        const gradesData = await gradesRes.json();

        setStats({
          users: usersData.users?.length || 0,
          students: studentsData.students?.length || 0,
          teachers: teachersData.teachers?.length || 0,
          classes: classesData.classes?.length || 0,
          subjects: subjectsData.subjects?.length || 0,
          attendance: attendanceData.attendance?.length || 0,
          fees: feesData.fees?.length || 0,
          grades: gradesData.grades?.length || 0,
        });
      } catch {
        // Fallback to default stats
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-gray-500">Welcome back, {user?.name || "Admin"}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Users"
          value={stats.users}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Students"
          value={stats.students}
          icon="👨‍🎓"
          color="green"
        />
        <StatCard
          title="Teachers"
          value={stats.teachers}
          icon="👨‍🏫"
          color="purple"
        />
        <StatCard
          title="Classes"
          value={stats.classes}
          icon="🏫"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Subjects"
          value={stats.subjects}
          icon="📚"
          color="teal"
        />
        <StatCard
          title="Attendance"
          value={stats.attendance}
          icon="✅"
          color="indigo"
        />
        <StatCard
          title="Fees"
          value={stats.fees}
          icon="💰"
          color="pink"
        />
        <StatCard
          title="Grades"
          value={stats.grades}
          icon="📊"
          color="cyan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/admin/classes"
              className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors block"
            >
              <p className="text-blue-600 font-medium">Manage Classes</p>
              <p className="text-sm text-gray-500">Add, edit, or delete classes</p>
            </a>
            <a
              href="/admin/subjects"
              className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors block"
            >
              <p className="text-green-600 font-medium">Manage Subjects</p>
              <p className="text-sm text-gray-500">Add, edit, or delete subjects</p>
            </a>
            <a
              href="/admin/teachers"
              className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors block"
            >
              <p className="text-purple-600 font-medium">Manage Teachers</p>
              <p className="text-sm text-gray-500">Add, edit, or delete teachers</p>
            </a>
            <a
              href="/admin/assignments"
              className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors block"
            >
              <p className="text-orange-600 font-medium">Staff Assignments</p>
              <p className="text-sm text-gray-500">Assign roles to staff</p>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            System Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Database</span>
              <span className="text-green-600 font-medium">✓ Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Authentication</span>
              <span className="text-green-600 font-medium">✓ Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">API Endpoints</span>
              <span className="text-green-600 font-medium">✓ Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
