"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Field,
  SelectField,
  ActionButton,
  useActionState,
  Spinner,
  Badge,
  EmptyState,
} from "../../../components/ui";
import { useAuth } from "../../../components/AuthProvider";

export default function ManageSubjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    teacherId: "",
  });
  const { state: deleteState, execute: deleteExecute } = useActionState();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [subjectsRes, teachersRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/teachers"),
      ]);
      const subjectsData = await subjectsRes.json();
      const teachersData = await teachersRes.json();
      setSubjects(subjectsData.subjects || []);
      setTeachers(teachersData.teachers || []);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingSubject) {
        await fetch(`/api/subjects/${editingSubject.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      fetchData();
      setIsModalOpen(false);
      setFormData({ name: "", code: "", teacherId: "" });
      setEditingSubject(null);
    } catch {
      // Error
    }
  }

  async function handleDelete(id: number) {
    await deleteExecute(async () => {
      await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      fetchData();
    });
  }

  function openModal(subject?: any) {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        name: subject.name,
        code: subject.code,
        teacherId: subject.teacherId ? subject.teacherId.toString() : "",
      });
    } else {
      setEditingSubject(null);
      setFormData({ name: "", code: "", teacherId: "" });
    }
    setIsModalOpen(true);
  }

  const teacherOptions = [
    { value: "", label: "Select Teacher" },
    ...teachers.map((t) => ({ value: t.id.toString(), label: t.name })),
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
        <h1 className="text-2xl font-bold text-gray-900">Manage Subjects</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + Add Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          message="No subjects found"
          icon="📚"
          description="Add your first subject to get started"
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
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {subject.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {subject.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {subject.teacherName || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(subject)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
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
        title={editingSubject ? "Edit Subject" : "Add Subject"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Subject Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Mathematics"
            required
          />
          <Field
            label="Subject Code"
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="e.g., MATH"
            required
          />
          <SelectField
            label="Teacher"
            value={formData.teacherId}
            onChange={(e) =>
              setFormData({ ...formData, teacherId: e.target.value })
            }
            options={teacherOptions}
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
              {editingSubject ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
