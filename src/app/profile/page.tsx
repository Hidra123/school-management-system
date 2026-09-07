"use client";

import { useState, useEffect } from "react";
import {
  Field,
  PasswordField,
  Alert,
  Spinner,
  Badge,
} from "../../components/ui";
import { useAuth } from "../../components/AuthProvider";

export default function ProfilePage() {
  const { user, mustChangePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // Force password change if required
    if (mustChangePassword && user) {
      // Already on profile page, so this is fine
    }
  }, [mustChangePassword, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setSuccess("Password changed successfully! You will be redirected.");
        setTimeout(() => {
          window.location.href = user?.role === "admin" ? "/admin" : "/";
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to change password");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
        {mustChangePassword && (
          <Alert
            message="You must change your password to continue using the system"
            type="warning"
            className="mt-4"
          />
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {error && (
          <Alert message={error} type="error" onClose={() => setError("")} />
        )}
        {success && (
          <Alert message={success} type="success" onClose={() => setSuccess("")} />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            required
            showPassword={showCurrent}
            onTogglePassword={() => setShowCurrent(!showCurrent)}
          />

          <PasswordField
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
            showPassword={showNew}
            onTogglePassword={() => setShowNew(!showNew)}
          />

          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            showPassword={showConfirm}
            onTogglePassword={() => setShowConfirm(!showConfirm)}
          />

          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner size="sm" />
                <span>Changing...</span>
              </>
            ) : (
              "Change Password"
            )}
          </button>
        </form>

        {user && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Logged in as: <strong>{user.name}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Username: {user.username}
            </p>
            <p className="text-sm text-gray-500">
              Role: <Badge variant="info">{user.role}</Badge>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
