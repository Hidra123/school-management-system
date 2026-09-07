"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  SelectField,
  Field,
  Spinner,
  EmptyState,
  Badge,
} from "../../../components/ui";
import { useAuth } from "../../../components/AuthProvider";
import { ASSIGNMENT_ROLES, ROLE_PRESETS } from "../../../lib/permissions";

export default function AdminAssignments() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [formData, setFormData] = useState({
    userId: "",
    assignmentType: "",
    details: "",
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    try {
      const response = await fetch("/api/admin/members");
      const data = await response.json();
      setStaff(data.users || []);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        userId: parseInt(formData.userId),
      };

      if (editingAssignment) {
        await fetch(`/api/admin/assignments/${editingAssignment.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/admin/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      fetchStaff();
      setIsModalOpen(false);
      setFormData({
        userId: "",
        assignmentType: "",
        details: "",
      });
      setEditingAssignment(null);
    } catch {
      // Error
    }
  }

  const staffOptions = [
    { value: "", label: "Select Staff Member" },
    ...staff.map((s) => ({
      value: s.id.toString(),
      label: `${s.name} (${s.username})`,
    })),
  ];

  const roleOptions = [
    { value: "", label: "Select Role" },
    ...ASSIGNMENT_ROLES.map((role) => ({ value: role, label: role })),
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
        <h1 className="text-2xl font-bold text-gray-900">Staff Assignments</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + Assign Role
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Role Presets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(ROLE_PRESETS).map(([role, permissions]) => (
            <div key={role} className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">{role}</h3>
              <p className="text-sm text-gray-500">
                {permissions.length} permissions
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Staff Member
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Username
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                Current Permissions
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{member.name}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {member.username}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {member.role === "admin" ? (
                    <Badge variant="info">Admin</Badge>
                  ) : (
                    <Badge variant="default">{member.role}</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {member.role === "admin"
                    ? "All permissions"
                    : ROLE_PRESETS[member.role]?.length || 0}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      setEditingAssignment({
                        id: member.id,
                        userId: member.id,
                        assignmentType: member.role,
                      });
                      setFormData({
                        userId: member.id.toString(),
                        assignmentType: member.role,
                        details: "",
                      });
                      setIsModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAssignment ? "Edit Assignment" : "Assign Role"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField
            label="Staff Member"
            value={formData.userId}
            onChange={(e) =>
              setFormData({ ...formData, userId: e.target.value })
            }
            options={staffOptions}
            required
          />
          <SelectField
            label="Role"
            value={formData.assignmentType}
            onChange={(e) =>
              setFormData({ ...formData, assignmentType: e.target.value })
            }
            options={roleOptions}
            required
          />
          <Field
            label="Details"
            type="text"
            value={formData.details}
            onChange={(e) =>
              setFormData({ ...formData, details: e.target.value })
            }
            placeholder="Optional details"
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
              {editingAssignment ? "Update" : "Assign"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
