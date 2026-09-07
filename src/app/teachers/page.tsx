"use client";

import { useState, useEffect } from "react";
import { Spinner, EmptyState, Badge } from "../../components/ui";
import { useAuth } from "../../components/AuthProvider";

export default function TeachersPage() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      const response = await fetch("/api/teachers");
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }

  function togglePasswordVisibility(teacherId: number) {
    setShowPasswords((prev) => ({
      ...prev,
      [teacherId]: !prev[teacherId],
    }));
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
        <p className="text-gray-500">View all teachers</p>
      </div>

      {teachers.length === 0 ? (
        <EmptyState
          message="No teachers found"
          icon="👨‍🏫"
          description="No teachers have been added yet"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Credentials
                </th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {teacher.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {teacher.subject || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {teacher.phone || teacher.email || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {teacher.user ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="info">
                          {teacher.user.username}
                        </Badge>
                        <button
                          onClick={() => togglePasswordVisibility(teacher.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords[teacher.id] ? "👁️" : "👁️‍🗨️"}
                        </button>
                        {showPasswords[teacher.id] && (
                          <code className="text-xs bg-gray-100 px-1 rounded">
                            {teacher.user.rawPassword}
                          </code>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
