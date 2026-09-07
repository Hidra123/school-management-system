"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  SelectField,
  Field,
  Spinner,
  EmptyState,
} from "../../components/ui";
import { useAuth } from "../../components/AuthProvider";

export default function GradesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    subjectId: "",
    examType: "",
    term: "",
    score: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [gradesRes, studentsRes, subjectsRes] = await Promise.all([
        fetch("/api/grades"),
        fetch("/api/students"),
        fetch("/api/subjects"),
      ]);
      const gradesData = await gradesRes.json();
      const studentsData = await studentsRes.json();
      const subjectsData = await subjectsRes.json();
      setGrades(gradesData.grades || []);
      setStudents(studentsData.students || []);
      setSubjects(subjectsData.subjects || []);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          studentId: parseInt(formData.studentId),
          subjectId: parseInt(formData.subjectId),
          score: parseInt(formData.score),
        }),
      });
      fetchData();
      setIsModalOpen(false);
      setFormData({
        studentId: "",
        subjectId: "",
        examType: "",
        term: "",
        score: "",
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

  const subjectOptions = [
    { value: "", label: "Select Subject" },
    ...subjects.map((s) => ({
      value: s.id.toString(),
      label: `${s.code} - ${s.name}`,
    })),
  ];

  const examTypeOptions = [
    { value: "", label: "Select Exam Type" },
    { value: "CAT", label: "CAT" },
    { value: "Midterm", label: "Midterm" },
    { value: "Final", label: "Final" },
  ];

  const termOptions = [
    { value: "", label: "Select Term" },
    { value: "Term 1", label: "Term 1" },
    { value: "Term 2", label: "Term 2" },
    { value: "Term 3", label: "Term 3" },
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
        <h1 className="text-2xl font-bold text-gray-900">Submit Scores</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + Submit Score
        </button>
      </div>

      {grades.length === 0 ? (
        <EmptyState
          message="No grades found"
          icon="📊"
          description="Submit scores to get started"
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
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Exam Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Term
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {grades.map((grade) => (
                <tr key={grade.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {grade.admissionNo} - {grade.studentName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {grade.subjectCode} - {grade.subjectName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {grade.examType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{grade.term}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {grade.score}
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
        title="Submit Score"
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
          <SelectField
            label="Subject"
            value={formData.subjectId}
            onChange={(e) =>
              setFormData({ ...formData, subjectId: e.target.value })
            }
            options={subjectOptions}
            required
          />
          <SelectField
            label="Exam Type"
            value={formData.examType}
            onChange={(e) =>
              setFormData({ ...formData, examType: e.target.value })
            }
            options={examTypeOptions}
            required
          />
          <SelectField
            label="Term"
            value={formData.term}
            onChange={(e) => setFormData({ ...formData, term: e.target.value })}
            options={termOptions}
            required
          />
          <Field
            label="Score"
            type="number"
            value={formData.score}
            onChange={(e) => setFormData({ ...formData, score: e.target.value })}
            placeholder="e.g., 85"
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
              Submit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
