"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PAYMENT_DONUT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface DonutSegment {
  label:  string;
  value:  number;
  count:  number;
  color:  string;
}

interface DonutChartProps {
  data:         DonutSegment[];
  /** 0–100 — displayed in the centre ring */
  centerPercent?: number;
  isLoading?:   boolean;
}

// ─────────────────────────────────────────────
// Default segments built from payment data
// ─────────────────────────────────────────────

export function buildDonutData(
  paid:    { count: number; amount: number },
  pending: { count: number; amount: number },
  overdue: { count: number; amount: number },
): DonutSegment[] {
  return [
    { label: "Paid",    value: paid.amount,    count: paid.count,    color: PAYMENT_DONUT_COLORS.completed },
    { label: "Pending", value: pending.amount, count: pending.count, color: PAYMENT_DONUT_COLORS.pending   },
    { label: "Overdue", value: overdue.amount, count: overdue.count, color: PAYMENT_DONUT_COLORS.overdue   },
  ];
}

// ─────────────────────────────────────────────
// Custom tooltip
// ─────────────────────────────────────────────

function CustomTooltip({ active, payload }: {
  active?:  boolean;
  payload?: { name: string; value: number; payload: DonutSegment }[];
}) {
  if (!active || !payload?.length) return null;
  const seg = payload[0]!.payload;
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm shadow-lg"
      style={{
        background: "hsl(var(--card))",
        border:     "1px solid hsl(var(--border))",
        color:      "hsl(var(--foreground))",
      }}
    >
      <p className="font-semibold mb-0.5">{seg.label}</p>
      <p style={{ color: seg.color }}>{seg.count} invoice{seg.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Legend item
// ─────────────────────────────────────────────

function LegendItem({ seg }: { seg: DonutSegment }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: seg.color }}
      />
      <div>
        <p className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
          {seg.label}
        </p>
        <p className="text-xs font-bold" style={{ color: "hsl(var(--foreground))" }}>
          {seg.count} Invoices
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

function DonutSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="w-40 h-40 rounded-full animate-pulse"
        style={{ background: "hsl(var(--muted))" }}
      />
      <div className="flex gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-2 w-14 rounded animate-pulse" style={{ background: "hsl(var(--muted))" }} />
            <div className="h-3 w-10 rounded animate-pulse" style={{ background: "hsl(var(--muted))" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function DonutChart({ data, centerPercent, isLoading = false }: DonutChartProps) {
  if (isLoading) return <DonutSkeleton />;

  const total = data.reduce((s, d) => s + d.value, 0);
  const pct   = centerPercent ?? (total > 0 ? Math.round((data[0]?.value ?? 0) / total * 100) : 0);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Donut */}
      <div className="relative">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
              dataKey="value"
              strokeWidth={2}
              stroke="hsl(var(--card))"
              paddingAngle={3}
            >
              {data.map((seg, idx) => (
                <Cell key={idx} fill={seg.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-2xl font-bold leading-none"
            style={{ color: "hsl(var(--foreground))" }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-start justify-center gap-6 flex-wrap">
        {data.map((seg) => (
          <LegendItem key={seg.label} seg={seg} />
        ))}
      </div>
    </div>
  );
}