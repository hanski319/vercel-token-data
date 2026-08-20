"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorForModel } from "@/lib/data";

function formatDate(d: string, granularity: "daily" | "monthly") {
  const date = new Date(d + "T00:00:00Z");
  return granularity === "monthly"
    ? date.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value).filter((p) => p.value > 0);
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-muted">{label}</div>
      <div className="space-y-0.5">
        {sorted.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
            <span className="min-w-0 flex-1 truncate">{p.dataKey}</span>
            <span className="font-mono tabular-nums text-foreground">{p.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeaderboardChart({
  rows,
  models,
  granularity,
  variant,
}: {
  rows: Record<string, string | number>[];
  models: string[];
  granularity: "daily" | "monthly";
  variant: "stacked" | "line";
}) {
  const tickFormatter = (d: string) => formatDate(d, granularity);

  if (variant === "line") {
    return (
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            stroke="var(--muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={40}
          />
          <YAxis
            stroke="var(--muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<TooltipContent />} />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
          {models.map((name) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={colorForModel(name)}
              dot={false}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          stroke="var(--muted)"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          minTickGap={40}
        />
        <YAxis
          stroke="var(--muted)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<TooltipContent />} />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
        {models.map((name) => (
          <Area
            key={name}
            type="monotone"
            dataKey={name}
            stackId="share"
            stroke={colorForModel(name)}
            fill={colorForModel(name)}
            fillOpacity={name === "Other" ? 0.25 : 0.55}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
