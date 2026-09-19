import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface StatCardProps {
  label:        string;
  value:        string | number;
  /** Percent change e.g. 12 (= +12%) or -5 (= -5%) */
  change?:      number;
  icon:         LucideIcon;
  /** Colour applied to the icon wrapper bg and icon — uses Tailwind arbitrary */
  iconColor?:   "violet" | "teal" | "pink" | "amber" | "blue";
  href?:        string;
  className?:   string;
}

// ─────────────────────────────────────────────
// Icon colour map — bg and icon fg
// All values reference CSS vars to stay collision-free
// ─────────────────────────────────────────────

const ICON_STYLES: Record<NonNullable<StatCardProps["iconColor"]>, { bg: string; fg: string }> = {
  violet: {
    bg: "hsl(var(--primary) / 0.12)",
    fg: "hsl(var(--primary))",
  },
  teal: {
    bg: "hsl(172 76% 90%)",
    fg: "hsl(172 76% 35%)",
  },
  pink: {
    bg: "hsl(330 81% 93%)",
    fg: "hsl(330 81% 50%)",
  },
  amber: {
    bg: "hsl(43 96% 90%)",
    fg: "hsl(32 95% 40%)",
  },
  blue: {
    bg: "hsl(214 100% 92%)",
    fg: "hsl(221 83% 45%)",
  },
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function StatCard({
  label,
  value,
  change,
  icon:      Icon,
  iconColor  = "violet",
  className,
}: StatCardProps) {
  const { bg, fg } = ICON_STYLES[iconColor];
  const isPositive  = (change ?? 0) >= 0;

  return (
    <div
      className={cn(
        "fppts-card flex items-center gap-4 p-4",
        "transition-shadow duration-200 hover:shadow-md",
        className,
      )}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
        style={{ background: bg }}
      >
        <Icon className="w-5 h-5" style={{ color: fg }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium mb-1 truncate"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {label}
        </p>
        <p
          className="text-2xl font-bold tracking-tight leading-none"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {value}
        </p>
      </div>

      {/* Change pill */}
      {change !== undefined && (
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
              isPositive
                ? "bg-[hsl(var(--status-paid-bg))] text-[hsl(var(--status-paid-fg))]"
                : "bg-[hsl(var(--status-overdue-bg))] text-[hsl(var(--status-overdue-fg))]",
            )}
          >
            {isPositive
              ? <TrendingUp  className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {isPositive ? "+" : ""}{change}%
          </span>
        </div>
      )}
    </div>
  );
}