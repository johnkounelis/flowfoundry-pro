import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<string, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm",
  secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 shadow-sm",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
};

const sizes: Record<string, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-sm px-5 py-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, className, variant = "primary", size = "md", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={clsx(base, variants[variant], sizes[size], className)} {...props} />;
  }
);
Button.displayName = "Button";
