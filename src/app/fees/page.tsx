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

export default function FeesPage() {
  const { user } = useAuth();
  const [fees, setFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    description: "",
    amount: "",
    dueDate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [feesRes, studentsRes] = await Promise.all([
        fetch("/api/fees"),
        fetch("/api/students"),
      ]);
      const feesData = await feesRes.json();
      const studentsData = await studentsRes.json();
      setFees(feesData.fees || []);
      setStudents(studentsData.students || []);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          studentId: parseInt(formData.studentId),
          amount: parseInt(formData.amount),
        }),
      });
      fetchData();
      setIsModalOpen(false);
      setFormData({
        studentId: "",
        description: "",
        amount: "",
        dueDate: "",
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

  function getStatusVariant(status: string): "success" | "error" | "warning" | "info" | "default" {
    switch (status) {
      case "paid":
        return "success";
      case "pending":
        return "warning";
      case "overdue":
        return "error";
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
        <h1 className="text-2xl font-bold text-gray-900">Fees & Payments</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + Add Fee
        </button>
      </div>

      {fees.length === 0 ? (
        <EmptyState
          message="No fees found"
          icon="💰"
          description="Add fees to get started"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Paid
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => (
                <tr key={fee.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {fee.admissionNo} - {fee.studentName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {fee.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    KES {fee.amount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    KES {fee.paidAmount}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <Badge variant={getStatusVariant(fee.status)}>
                      {fee.status}
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
        title="Add Fee"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelectField
            label="Student"
            value={formData.studentId}
            onChange={(e) =>
              setFormData({ ...formData, studentId: e.target.value })
            }
            options={studentOptions}
            required
          />
          <Field
            label="Description"
            type="text"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="e.g., Tuition Fee"
            required
          />
          <Field
            label="Amount (KES)"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="e.g., 50000"
            required
          />
          <Field
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
              Add Fee
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
