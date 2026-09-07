"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Field,
  SelectField,
  Spinner,
  EmptyState,
} from "../../components/ui";
import { useAuth } from "../../components/AuthProvider";

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [formData, setFormData] = useState({
    admissionNo: "",
    name: "",
    gender: "",
    classId: "",
    guardianName: "",
    guardianPhone: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/classes"),
      ]);
      const studentsData = await studentsRes.json();
      const classesData = await classesRes.json();
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
      const payload: Record<string, any> = { ...formData };
      // Convert classId to number
      if (payload.classId) {
        payload.classId = parseInt(payload.classId);
      }

      if (editingStudent) {
        await fetch(`/api/students/${editingStudent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      fetchData();
      setIsModalOpen(false);
      setFormData({
        admissionNo: "",
        name: "",
        gender: "",
        classId: "",
        guardianName: "",
        guardianPhone: "",
      });
      setEditingStudent(null);
    } catch {
      // Error
    }
  }

  function openModal(student?: any) {
    if (student) {
      setEditingStudent(student);
      setFormData({
        admissionNo: student.admissionNo,
        name: student.name,
        gender: student.gender || "",
        classId: student.classId ? student.classId.toString() : "",
        guardianName: student.guardianName || "",
        guardianPhone: student.guardianPhone || "",
      });
    } else {
      setEditingStudent(null);
      setFormData({
        admissionNo: "",
        name: "",
        gender: "",
        classId: "",
        guardianName: "",
        guardianPhone: "",
      });
    }
    setIsModalOpen(true);
  }

  const classOptions = [
    { value: "", label: "Select Class" },
    ...classes.map((c) => ({
      value: c.id.toString(),
      label: `${c.name} ${c.section || ""}`.trim(),
    })),
  ];

  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
  ];

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
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + Add Student
        </button>
      </div>

      {students.length === 0 ? (
        <EmptyState
          message="No students found"
          icon="👨‍🎓"
          description="Add your first student to get started"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Admission No
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Class
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Guardian
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.admissionNo}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{student.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.gender || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.className || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.guardianName || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(student)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                    </div>
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
        title={editingStudent ? "Edit Student" : "Add Student"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Admission Number"
              type="text"
              value={formData.admissionNo}
              onChange={(e) =>
                setFormData({ ...formData, admissionNo: e.target.value })
              }
              placeholder="e.g., S001"
              required
            />
            <Field
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Jane Doe"
              required
            />
            <SelectField
              label="Gender"
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              options={genderOptions}
            />
            <SelectField
              label="Class"
              value={formData.classId}
              onChange={(e) =>
                setFormData({ ...formData, classId: e.target.value })
              }
              options={classOptions}
            />
            <Field
              label="Guardian Name"
              type="text"
              value={formData.guardianName}
              onChange={(e) =>
                setFormData({ ...formData, guardianName: e.target.value })
              }
              placeholder="e.g., Mr. Smith"
            />
            <Field
              label="Guardian Phone"
              type="tel"
              value={formData.guardianPhone}
              onChange={(e) =>
                setFormData({ ...formData, guardianPhone: e.target.value })
              }
              placeholder="e.g., +254700000000"
            />
          </div>

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
              {editingStudent ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
