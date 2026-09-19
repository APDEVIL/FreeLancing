"use client";

import { cn } from "@/lib/utils";
import {
  PROJECT_STATUS_CONFIG,
  TASK_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  type ProjectStatus,
  type TaskStatus,
  type PaymentStatus,
} from "@/lib/constants";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type AnyStatus = ProjectStatus | TaskStatus | PaymentStatus;

interface StatusBadgeProps {
  type:      "project" | "task" | "payment";
  status:    AnyStatus;
  className?: string;
  /** Show a leading dot indicator */
  dot?:      boolean;
  size?:     "sm" | "md";
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function StatusBadge({
  type,
  status,
  className,
  dot  = false,
  size = "md",
}: StatusBadgeProps) {
  const config =
    type === "project"
      ? PROJECT_STATUS_CONFIG[status as ProjectStatus]
      : type === "task"
        ? TASK_STATUS_CONFIG[status as TaskStatus]
        : PAYMENT_STATUS_CONFIG[status as PaymentStatus];

  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap",
        size === "sm"
          ? "text-[10px] px-2 py-0.5"
          : "text-xs px-2.5 py-1",
        config.className,
        className,
      )}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 bg-current opacity-70"
        />
      )}
      {config.label}
    </span>
  );
}