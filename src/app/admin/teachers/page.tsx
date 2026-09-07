"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Field,
  ActionButton,
  useActionState,
  Spinner,
  Badge,
  EmptyState,
  PasswordField,
} from "../../../components/ui";
import { useAuth } from "../../../components/AuthProvider";

export default function ManageTeachers() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    qualification: "",
    hireDate: "",
    username: "",
    rawPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const { state: deleteState, execute: deleteExecute } = useActionState();

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = { ...formData };
      // Remove empty strings
      Object.keys(payload).forEach((key) => {
        if (payload[key as keyof typeof payload] === "") {
          delete payload[key as keyof typeof payload];
        }
      });

      if (editingTeacher) {
        await fetch(`/api/teachers/${editingTeacher.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      fetchTeachers();
      setIsModalOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        qualification: "",
        hireDate: "",
        username: "",
        rawPassword: "",
      });
      setEditingTeacher(null);
    } catch {
      // Error
    }
  }

  async function handleDelete(id: number) {
    await deleteExecute(async () => {
      await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      fetchTeachers();
    });
  }

  function openModal(teacher?: any) {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        name: teacher.name,
        email: teacher.email || "",
        phone: teacher.phone || "",
        subject: teacher.subject || "",
        qualification: teacher.qualification || "",
        hireDate: teacher.hireDate || "",
        username: teacher.user?.username || "",
        rawPassword: teacher.user?.rawPassword || "",
      });
    } else {
      setEditingTeacher(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        qualification: "",
        hireDate: "",
        username: "",
        rawPassword: "",
      });
    }
    setIsModalOpen(true);
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
        <h1 className="text-2xl font-bold text-gray-900">Manage Teachers</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + Add Teacher
        </button>
      </div>

      {teachers.length === 0 ? (
        <EmptyState
          message="No teachers found"
          icon="👨‍🏫"
          description="Add your first teacher to get started"
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
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Actions
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
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-sm text-gray-500"
                        >
                          {showPassword ? "👁️" : "👁️‍🗨️"}
                        </button>
                        {showPassword && (
                          <code className="text-xs bg-gray-100 px-1 rounded">
                            {teacher.user.rawPassword}
                          </code>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(teacher)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id)}
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
        title={editingTeacher ? "Edit Teacher" : "Add Teacher"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., John Doe"
              required
            />
            <Field
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="e.g., john@school.com"
            />
            <Field
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="e.g., +254700000000"
            />
            <Field
              label="Subject"
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="e.g., Mathematics"
            />
            <Field
              label="Qualification"
              type="text"
              value={formData.qualification}
              onChange={(e) =>
                setFormData({ ...formData, qualification: e.target.value })
              }
              placeholder="e.g., B.Ed, M.Sc"
            />
            <Field
              label="Hire Date"
              type="date"
              value={formData.hireDate}
              onChange={(e) =>
                setFormData({ ...formData, hireDate: e.target.value })
              }
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              User Account (Check Number)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Username (Check Number)"
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="e.g., TCH001"
              />
              <PasswordField
                label="Password"
                value={formData.rawPassword}
                onChange={(e) =>
                  setFormData({ ...formData, rawPassword: e.target.value })
                }
                placeholder="Leave blank for default"
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Default password: shulehub2025
            </p>
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
              {editingTeacher ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
