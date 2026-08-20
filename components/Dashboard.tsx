"use client";

import { useMemo, useState } from "react";
import { LeaderboardChart } from "./LeaderboardChart";
import { DataTable } from "./DataTable";
import { pivotForChart } from "@/lib/data";
import { METRIC_DESCRIPTION, METRIC_LABEL, type Granularity, type LeaderboardRecord, type Metric } from "@/lib/types";

const METRICS: Metric[] = ["tokens", "cost", "requests"];

export function Dashboard({
  dataByMetric,
}: {
  dataByMetric: Record<Metric, { daily: LeaderboardRecord[]; monthly: LeaderboardRecord[] }>;
}) {
  const [metric, setMetric] = useState<Metric>("tokens");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [chartVariant, setChartVariant] = useState<"stacked" | "line">("stacked");

  const records = dataByMetric[metric][granularity];
  const { models, rows } = useMemo(() => pivotForChart(records), [records]);

  const range = records.length > 0 ? { from: records[0].date, to: records[records.length - 1].date } : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-px">
        {METRICS.map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              metric === m
                ? "border border-b-0 border-border bg-surface text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {METRIC_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{METRIC_LABEL[metric]}</h2>
            <p className="text-sm text-muted">{METRIC_DESCRIPTION[metric]}</p>
            {range && (
              <p className="mt-1 font-mono text-xs text-muted">
                {range.from} → {range.to} · {records.length} {granularity === "daily" ? "days" : "months"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={granularity}
              onChange={(v) => setGranularity(v as Granularity)}
              options={[
                { value: "daily", label: "Daily" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
            <SegmentedControl
              value={chartVariant}
              onChange={(v) => setChartVariant(v as "stacked" | "line")}
              options={[
                { value: "stacked", label: "Stacked" },
                { value: "line", label: "Line" },
              ]}
            />
            <a
              href={`/api/export?metric=${metric}`}
              className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              Download .xlsx
            </a>
          </div>
        </div>

        {records.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">No data for this view.</p>
        ) : (
          <LeaderboardChart rows={rows} models={models} granularity={granularity} variant={chartVariant} />
        )}
      </div>

      {records.length > 0 && <DataTable records={records} />}
    </div>
  );
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex rounded-md border border-border bg-surface-2 p-0.5 text-xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded px-2.5 py-1 font-medium transition-colors ${
            value === opt.value ? "bg-background text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
