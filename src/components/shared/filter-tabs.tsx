"use client";

import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface FilterTab<T extends string = string> {
  value:  T;
  label:  string;
  count?: number;
}

interface FilterTabsProps<T extends string = string> {
  tabs:     FilterTab<T>[];
  value:    T;
  onChange: (value: T) => void;
  className?: string;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function FilterTabs<T extends string = string>({
  tabs,
  value,
  onChange,
  className,
}: FilterTabsProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 p-1 rounded-xl",
        "bg-[hsl(var(--secondary))]",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "filter-tab",
              isActive && "shadow-sm",
            )}
            data-active={isActive ? "true" : "false"}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="filter-tab-count">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}