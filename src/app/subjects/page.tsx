"use client";

import { useState, useEffect } from "react";
import { Spinner, EmptyState } from "../../components/ui";
import { useAuth } from "../../components/AuthProvider";

export default function SubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  async function fetchSubjects() {
    try {
      const response = await fetch("/api/subjects");
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
        <p className="text-gray-500">View all subjects</p>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          message="No subjects found"
          icon="📚"
          description="No subjects have been added yet"
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
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Teacher
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {subject.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{subject.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {subject.teacherName || "-"}
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
