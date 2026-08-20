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

/** Infer the model's provider/lab from its name so the table can color and
 * label cells the way openrouter.ai-style leaderboards do (same provider,
 * same color, everywhere). Falls back to "Other" for anything unrecognized
 * rather than guessing wrong. */
const PROVIDER_RULES: [RegExp, string, string][] = [
  [/^claude/i, "Anthropic", "#d97757"],
  [/^gpt|^text-embedding|^o[1-9]\b|^dall-e/i, "OpenAI", "#34d399"],
  [/^gemini/i, "Google", "#60a5fa"],
  [/^deepseek/i, "DeepSeek", "#a78bfa"],
  [/^glm/i, "Zhipu", "#f472b6"],
  [/^step/i, "StepFun", "#facc15"],
  [/^(mini)?max|^minimax/i, "MiniMax", "#2dd4bf"],
  [/^kimi|^moonshot/i, "Moonshot AI", "#c084fc"],
  [/^grok/i, "xAI", "#f87171"],
  [/^llama/i, "Meta", "#fbbf24"],
  [/^qwen/i, "Alibaba", "#38bdf8"],
  [/^mistral|^mixtral|^codestral/i, "Mistral", "#fb923c"],
  [/^nova/i, "Amazon", "#eab308"],
  [/^command/i, "Cohere", "#f97316"],
  [/^perplexity|^sonar/i, "Perplexity", "#22d3ee"],
];

export function providerFor(name: string): { provider: string; color: string } {
  if (name === "Other") return { provider: "Other", color: "#555555" };
  for (const [re, provider, color] of PROVIDER_RULES) {
    if (re.test(name)) return { provider, color };
  }
  return { provider: "Other", color: "#6b7280" };
}

/** True if `date` (YYYY-MM-DD) falls short of that month's last day --
 * i.e. this is an in-progress month, not a closed one. */
export function isPartialMonth(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d < lastDay;
}

export function monthLabel(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** Pivot a set of records (one per date) into a wide, spreadsheet-friendly
 * shape: a row per date with one column per model name (the union of top
 * models across the whole series), values are pct (0 if absent that day).
 * Used for the XLSX export. */
export function pivotWide(records: LeaderboardRecord[]) {
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
