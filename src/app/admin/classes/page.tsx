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
} from "../../../components/ui";
import { useAuth } from "../../../components/AuthProvider";

export default function ManageClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    section: "",
    capacity: "",
  });
  const { state: deleteState, execute: deleteExecute } = useActionState();

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingClass) {
        await fetch(`/api/classes/${editingClass.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      fetchClasses();
      setIsModalOpen(false);
      setFormData({ name: "", section: "", capacity: "" });
      setEditingClass(null);
    } catch {
      // Error
    }
  }

  async function handleDelete(id: number) {
    await deleteExecute(async () => {
      await fetch(`/api/classes/${id}`, { method: "DELETE" });
      fetchClasses();
    });
  }

  function openModal(cls?: any) {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        name: cls.name,
        section: cls.section || "",
        capacity: cls.capacity ? cls.capacity.toString() : "",
      });
    } else {
      setEditingClass(null);
      setFormData({ name: "", section: "", capacity: "" });
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
        <h1 className="text-2xl font-bold text-gray-900">Manage Classes</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + Add Class
        </button>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          message="No classes found"
          icon="🏫"
          description="Add your first class to get started"
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
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Actions
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(cls)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cls.id)}
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
        title={editingClass ? "Edit Class" : "Add Class"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Class Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Form 1"
            required
          />
          <Field
            label="Section"
            type="text"
            value={formData.section}
            onChange={(e) =>
              setFormData({ ...formData, section: e.target.value })
            }
            placeholder="e.g., A"
          />
          <Field
            label="Capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) =>
              setFormData({ ...formData, capacity: e.target.value })
            }
            placeholder="e.g., 50"
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
              {editingClass ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
