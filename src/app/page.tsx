"use client";

import { useEffect, useState } from "react";
import { StatCard, Spinner, EmptyState } from "../components/ui";
import { useAuth } from "../components/AuthProvider";

export default function MemberDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    students: 0,
    classes: 0,
    subjects: 0,
    attendance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [studentsRes, classesRes, subjectsRes, attendanceRes] =
          await Promise.all([
            fetch("/api/students"),
            fetch("/api/classes"),
            fetch("/api/subjects"),
            fetch("/api/attendance"),
          ]);

        const studentsData = await studentsRes.json();
        const classesData = await classesRes.json();
        const subjectsData = await subjectsRes.json();
        const attendanceData = await attendanceRes.json();

        setStats({
          students: studentsData.students?.length || 0,
          classes: classesData.classes?.length || 0,
          subjects: subjectsData.subjects?.length || 0,
          attendance: attendanceData.attendance?.length || 0,
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
          Welcome, {user?.name || "User"}!
        </h1>
        <p className="text-gray-500">Here&apos;s your dashboard overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Students"
          value={stats.students}
          icon="👨‍🎓"
          color="blue"
          subtitle="Total enrolled"
        />
        <StatCard
          title="Classes"
          value={stats.classes}
          icon="🏫"
          color="green"
          subtitle="Active classes"
        />
        <StatCard
          title="Subjects"
          value={stats.subjects}
          icon="📚"
          color="purple"
          subtitle="Total subjects"
        />
        <StatCard
          title="Attendance"
          value={stats.attendance}
          icon="✅"
          color="yellow"
          subtitle="Today&apos;s records"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
            <p className="text-gray-600">View Students</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
            <p className="text-gray-600">Take Attendance</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
            <p className="text-gray-600">Submit Scores</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
            <p className="text-gray-600">View Fees</p>
          </div>
        </div>
      </div>
    </div>
  );
}
