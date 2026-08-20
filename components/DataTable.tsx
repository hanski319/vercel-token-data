"use client";

import { useState } from "react";
import type { LeaderboardRecord } from "@/lib/types";

export function DataTable({ records }: { records: LeaderboardRecord[] }) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? records : records.slice(-20);
  const reversed = [...rows].reverse();

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">Tabular data</h3>
        {records.length > 20 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-accent hover:underline"
          >
            {expanded ? "Show recent only" : `Show all ${records.length} rows`}
          </button>
        )}
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-surface-2">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted">Date</th>
              <th className="px-3 py-2 text-left font-medium text-muted">#1</th>
              <th className="px-3 py-2 text-left font-medium text-muted">#2</th>
              <th className="px-3 py-2 text-left font-medium text-muted">#3</th>
              <th className="px-3 py-2 text-left font-medium text-muted">#4</th>
              <th className="px-3 py-2 text-left font-medium text-muted">#5</th>
              <th className="px-3 py-2 text-left font-medium text-muted">Other top 10</th>
            </tr>
          </thead>
          <tbody>
            {reversed.map((r) => {
              const top5 = r.models.filter((m) => m.name !== "Other").slice(0, 5);
              const restCount = r.models.filter((m) => m.name !== "Other").length - top5.length;
              return (
                <tr key={r.date} className="border-t border-border/60 hover:bg-surface-2/60">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-muted">{r.date}</td>
                  {top5.map((m) => (
                    <td key={m.name} className="whitespace-nowrap px-3 py-2">
                      <span className="text-foreground">{m.name}</span>{" "}
                      <span className="font-mono text-muted">{m.pct.toFixed(1)}%</span>
                    </td>
                  ))}
                  {Array.from({ length: 5 - top5.length }).map((_, i) => (
                    <td key={`empty-${i}`} className="px-3 py-2 text-muted">
                      —
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-muted">
                    {restCount > 0 ? `+${restCount} more` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
