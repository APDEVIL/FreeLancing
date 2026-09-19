"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import { formatCompact } from "@/lib/utils";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface IncomeChartItem {
  name:  string;
  value: number;
}

interface IncomeChartProps {
  data:       IncomeChartItem[];
  isLoading?: boolean;
}

// ─────────────────────────────────────────────
// Custom tooltip
// ─────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?:  boolean;
  payload?: { value: number }[];
  label?:   string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm shadow-lg"
      style={{
        background: "hsl(var(--card))",
        border:     "1px solid hsl(var(--border))",
        color:      "hsl(var(--foreground))",
      }}
    >
      <p className="font-semibold mb-0.5">{label}</p>
      <p style={{ color: CHART_COLORS.purple }}>
        ${formatCompact(payload[0]!.value)}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

function SkeletonBars() {
  const heights = [80, 55, 70, 45, 65, 50];
  return (
    <div className="flex items-end gap-4 h-full px-4 pb-6">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded animate-pulse"
          style={{
            height:     `${h}%`,
            background: "hsl(var(--muted))",
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function IncomeChart({ data, isLoading = false }: IncomeChartProps) {
  if (isLoading) {
    return (
      <div className="h-56">
        <SkeletonBars />
      </div>
    );
  }

  // Colour bars: highest value gets the solid purple, rest are lighter
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, bottom: 0, left: 8 }}
        barSize={10}
      >
        <CartesianGrid
          horizontal={false}
          stroke="hsl(var(--border))"
          strokeDasharray="3 3"
        />
        <XAxis
          type="number"
          tickFormatter={(v) => `${formatCompact(v)}`}
          tick={{ fontSize: 11, fill: "hsl(220 9% 55%)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={80}
          tick={{ fontSize: 11, fill: "hsl(220 9% 40%)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--accent))" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((entry, idx) => (
            <Cell
              key={idx}
              fill={
                entry.value === maxVal
                  ? CHART_COLORS.purple
                  : CHART_COLORS.violet + "99" // 60% opacity for others
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}