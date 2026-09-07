"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  SelectField,
  Field,
  Spinner,
  EmptyState,
  Badge,
} from "../../components/ui";
import { useAuth } from "../../components/AuthProvider";

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    classId: "",
    date: new Date().toISOString().split("T")[0],
    status: "present",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [attendanceRes, studentsRes, classesRes] = await Promise.all([
        fetch("/api/attendance"),
        fetch("/api/students"),
        fetch("/api/classes"),
      ]);
      const attendanceData = await attendanceRes.json();
      const studentsData = await studentsRes.json();
      const classesData = await classesRes.json();
      setAttendance(attendanceData.attendance || []);
      setStudents(studentsData.students || []);
      setClasses(classesData.classes || []);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          studentId: parseInt(formData.studentId),
          classId: parseInt(formData.classId),
        }),
      });
      fetchData();
      setIsModalOpen(false);
      setFormData({
        studentId: "",
        classId: "",
        date: new Date().toISOString().split("T")[0],
        status: "present",
      });
    } catch {
      // Error
    }
  }

  const studentOptions = [
    { value: "", label: "Select Student" },
    ...students.map((s) => ({
      value: s.id.toString(),
      label: `${s.admissionNo} - ${s.name}`,
    })),
  ];

  const classOptions = [
    { value: "", label: "Select Class" },
    ...classes.map((c) => ({
      value: c.id.toString(),
      label: `${c.name} ${c.section || ""}`.trim(),
    })),
  ];

  const statusOptions = [
    { value: "present", label: "Present" },
    { value: "absent", label: "Absent" },
    { value: "late", label: "Late" },
    { value: "excused", label: "Excused" },
  ];

  function getStatusVariant(status: string): "success" | "error" | "warning" | "info" | "default" {
    switch (status) {
      case "present":
        return "success";
      case "absent":
        return "error";
      case "late":
        return "warning";
      case "excused":
        return "info";
      default:
        return "default";
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + Record Attendance
        </button>
      </div>

      {attendance.length === 0 ? (
        <EmptyState
          message="No attendance records found"
          icon="✅"
          description="Record attendance to get started"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Class
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {record.admissionNo} - {record.studentName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {record.className}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <Badge variant={getStatusVariant(record.status)}>
                      {record.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Attendance"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <SelectField
            label="Student"
            value={formData.studentId}
            onChange={(e) =>
              setFormData({ ...formData, studentId: e.target.value })
            }
            options={studentOptions}
            required
          />
          <SelectField
            label="Class"
            value={formData.classId}
            onChange={(e) =>
              setFormData({ ...formData, classId: e.target.value })
            }
            options={classOptions}
            required
          />
          <SelectField
            label="Status"
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            options={statusOptions}
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
