"use client";

import { useState } from "react";
import { MatrixTable } from "./MatrixTable";
import { METRIC_LABEL, type LeaderboardRecord, type Metric } from "@/lib/types";

const METRICS: Metric[] = ["tokens", "cost", "requests"];

export function Dashboard({
  monthlyByMetric,
}: {
  monthlyByMetric: Record<Metric, LeaderboardRecord[]>;
}) {
  const [metric, setMetric] = useState<Metric>("tokens");
  const records = monthlyByMetric[metric];
  const range = records.length > 0 ? { from: records[0].date, to: records[records.length - 1].date } : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1">
        {METRICS.map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              metric === m
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {METRIC_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted">
          Top 10 Models — {METRIC_LABEL[metric]} · Latest Day of Each Month
        </h2>
        <div className="flex items-center gap-3">
          {range && (
            <span className="text-xs text-muted">
              {records.length} months · {range.from} → {range.to} · scroll horizontally →
            </span>
          )}
          <a
            href={`/api/export?metric=${metric}`}
            className="whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-muted"
          >
            Download XLSX
          </a>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">No data for this view.</p>
      ) : (
        <MatrixTable records={records} />
      )}
    </div>
  );
}
