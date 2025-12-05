import * as React from "react";
import { clsx } from "clsx";

const colorMap: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600",
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  red: "bg-red-50 text-red-700",
  yellow: "bg-amber-50 text-amber-700",
  purple: "bg-purple-50 text-purple-700",
  indigo: "bg-indigo-50 text-indigo-700",
};

export const Badge = ({
  children,
  color = "gray",
  className = "",
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) => (
  <span
    className={clsx(
      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
      colorMap[color] || colorMap.gray,
      className
    )}
  >
    {children}
  </span>
);
