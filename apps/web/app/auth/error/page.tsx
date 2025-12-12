"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, { title: string; message: string }> = {
    Configuration: {
      title: "Configuration Error",
      message: "There is a problem with the server configuration. Please contact support.",
    },
    AccessDenied: {
      title: "Access Denied",
      message: "You do not have permission to sign in. Please contact your administrator.",
    },
    Verification: {
      title: "Verification Error",
      message: "The verification link may have expired or already been used.",
    },
  };

  const { title, message } = errorMessages[error || ""] || {
    title: "Authentication Error",
    message: "An unexpected error occurred during authentication.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 mb-8">{message}</p>
        <div className="flex gap-3 justify-center">
          <Link href="/auth/signin"
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            Try again
          </Link>
          <Link href="/"
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
