export type Metric = "tokens" | "cost" | "requests";

export type Granularity = "daily" | "monthly";

export interface ModelShare {
  rank: number;
  name: string;
  pct: number;
}

export interface LeaderboardRecord {
  date: string; // YYYY-MM-DD
  metric: Metric;
  type: Granularity;
  models: ModelShare[];
}

export const METRIC_LABEL: Record<Metric, string> = {
  tokens: "Token Volume",
  cost: "Spend",
  requests: "Requests",
};

export const METRIC_DESCRIPTION: Record<Metric, string> = {
  tokens: "Share of AI Gateway token volume across the top models.",
  cost: "Share of AI Gateway spend across the top models.",
  requests: "Share of AI Gateway requests across the top models.",
};
