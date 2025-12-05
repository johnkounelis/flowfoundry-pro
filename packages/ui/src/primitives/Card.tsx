import * as React from "react";
import { clsx } from "clsx";

export const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={clsx(
      "rounded-xl border border-gray-200 bg-white p-4 shadow-card",
      className
    )}
  >
    {children}
  </div>
);
