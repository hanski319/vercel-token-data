import daily from "@/data/leaderboard-history.json";
import monthly from "@/data/leaderboard-monthly.json";
import type { Granularity, LeaderboardRecord, Metric } from "./types";

const DAILY = daily as LeaderboardRecord[];
const MONTHLY = monthly as LeaderboardRecord[];

export function getRecords(metric: Metric, granularity: Granularity): LeaderboardRecord[] {
  const source = granularity === "daily" ? DAILY : MONTHLY;
  return source.filter((r) => r.metric === metric);
}

export function getAllMetricsAllGranularities(): LeaderboardRecord[] {
  return [...DAILY, ...MONTHLY];
}

/** Stable color assignment: same model name -> same hue everywhere, derived
 * from a hash of the name so it doesn't shift as new models enter the top 10. */
const PALETTE = [
  "#6ee7ff", // cyan
  "#a78bfa", // violet
  "#f472b6", // pink
  "#fb923c", // orange
  "#facc15", // yellow
  "#4ade80", // green
  "#60a5fa", // blue
  "#f87171", // red
  "#2dd4bf", // teal
  "#c084fc", // purple
  "#fbbf24", // amber
  "#34d399", // emerald
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function colorForModel(name: string): string {
  if (name === "Other") return "#4b5563"; // neutral gray, always
  return PALETTE[hashString(name) % PALETTE.length];
}

/** Pivot a set of records (one per date) into a chart-friendly shape:
 * a row per date with one column per model name (the union of top models
 * across the whole series), values are pct (0 if absent that day). */
export function pivotForChart(records: LeaderboardRecord[]) {
  const modelSet = new Set<string>();
  for (const r of records) for (const m of r.models) modelSet.add(m.name);
  // Rank models by their best (max) share across the series so the legend/stack
  // order favors whoever was ever dominant, "Other" always last.
  const best = new Map<string, number>();
  for (const r of records) for (const m of r.models) {
    best.set(m.name, Math.max(best.get(m.name) ?? 0, m.pct));
  }
  const models = [...modelSet].sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return (best.get(b) ?? 0) - (best.get(a) ?? 0);
  });

  const rows = records.map((r) => {
    const row: Record<string, string | number> = { date: r.date };
    for (const m of r.models) row[m.name] = m.pct;
    return row;
  });

  return { models, rows };
}
