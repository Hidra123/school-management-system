import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - ShuleHub",
  description: "Login to ShuleHub School Management System",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
