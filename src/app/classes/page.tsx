"use client";

import { useState, useEffect } from "react";
import { Spinner, EmptyState } from "../../components/ui";
import { useAuth } from "../../components/AuthProvider";

export default function ClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    try {
      const response = await fetch("/api/classes");
      const data = await response.json();
      setClasses(data.classes || []);
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
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <p className="text-gray-500">View all classes</p>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          message="No classes found"
          icon="🏫"
          description="No classes have been added yet"
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
                  Section
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Capacity
                </th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{cls.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {cls.section || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {cls.capacity || "-"}
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
