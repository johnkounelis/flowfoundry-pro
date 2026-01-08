"use client";

import { useEffect } from "react";

interface MessageBannerProps {
  type: "success" | "error" | "info";
  message: string;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  dismissAfter?: number;
}

export function MessageBanner({
  type,
  message,
  onDismiss,
  autoDismiss = true,
  dismissAfter = 5000
}: MessageBannerProps) {
  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, dismissAfter);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, dismissAfter, onDismiss]);

  const bgColor =
    type === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : type === "error"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-blue-50 border-blue-200 text-blue-800";

  return (
    <div className={`mb-6 p-4 rounded-md border ${bgColor}`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-current opacity-70 hover:opacity-100 ml-4"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

