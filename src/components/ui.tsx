"use client";

import { useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

// Badge component
export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
}) {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

// Modal component
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${sizes[size]}`}
      >
        {(title || onClose) ? (
          <div className="flex justify-between items-center p-4 border-b">
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>
        ) : null}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// Form Field component
export function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = "",
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />
    </div>
  );
}

// Select Field component
export function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// StatCard component
export function StatCard({
  title,
  value,
  icon,
  color = "blue",
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "orange" | "teal" | "indigo" | "pink" | "cyan";
  subtitle?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    teal: "bg-teal-500",
    indigo: "bg-indigo-500",
    pink: "bg-pink-500",
    cyan: "bg-cyan-500",
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xl ${colors[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// Spinner component
export function Spinner({ size = "md", className = "" }: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div
      className={`animate-spin rounded-full border-blue-500 border-t-transparent ${sizes[size]} ${className}`}
    />
  );
}

// Checkmark component (animated)
export function Checkmark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-6 h-6 text-green-500 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
        className="animate-drawCheck"
      />
    </svg>
  );
}

// ActionButton - Normal → Spinning → Checkmark
type ActionState = "idle" | "loading" | "success" | "error";

export function ActionButton({
  onClick,
  children,
  state = "idle",
  disabled = false,
  className = "",
  variant = "primary",
}: {
  onClick: () => void | Promise<void>;
  children: ReactNode;
  state?: ActionState;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  const isLoading = state === "loading";
  const isSuccess = state === "success";

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading || isSuccess}
      className={`px-4 py-2 rounded-md transition-colors ${variants[variant]} ${className} ${
        (disabled || isLoading || isSuccess) ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {isLoading && <Spinner size="sm" className="mr-2" />}
      {isSuccess ? <Checkmark className="inline" /> : children}
    </button>
  );
}

// Hook for managing action state
export function useActionState(initialState: ActionState = "idle") {
  const [state, setState] = useState<ActionState>(initialState);

  const execute = async (action: () => void | Promise<void>) => {
    setState("loading");
    try {
      await action();
      setState("success");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  return { state, execute, setState };
}

// Textarea component
export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  rows = 3,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />
    </div>
  );
}

// Password input with show/hide toggle
export function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = "",
  showPassword = false,
  onTogglePassword,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}) {
  const [show, setShow] = useState(showPassword || false);

  const toggle = () => {
    setShow(!show);
    if (onTogglePassword) onTogglePassword();
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 pr-10"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          {show ? "👁️" : "👁️‍🗨️"}
        </button>
      </div>
    </div>
  );
}

// Table component
export function Table({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full bg-white border">{children}</table>
    </div>
  );
}

// Table header
export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-gray-50">{children}</thead>;
}

// Table body
export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

// Table row
export function TRow({ children, className = "" }: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`border-b hover:bg-gray-50 transition-colors ${className}`}
    >
      {children}
    </tr>
  );
}

// Table header cell
export function TH({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}

// Table cell
export function TD({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-2 text-sm text-gray-900 ${className}`}>{children}</td>
  );
}

// Empty state component
export function EmptyState({
  message,
  icon = "📭",
  description,
}: {
  message: string;
  icon?: string;
  description?: string;
}) {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-gray-500">{message}</p>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
    </div>
  );
}

// Alert component
export function Alert({
  message,
  type = "info",
  onClose,
  className = "",
}: {
  message: string;
  type?: "info" | "success" | "warning" | "error";
  onClose?: () => void;
  className?: string;
}) {
  const types = {
    info: "bg-blue-100 border-blue-400 text-blue-800",
    success: "bg-green-100 border-green-400 text-green-800",
    warning: "bg-yellow-100 border-yellow-400 text-yellow-800",
    error: "bg-red-100 border-red-400 text-red-800",
  };

  return (
    <div
      className={`border-l-4 p-4 mb-4 rounded-r ${types[type]} ${className}`}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-lg leading-none hover:opacity-70"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
