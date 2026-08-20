import { isPartialMonth, monthLabel, providerFor } from "@/lib/data";
import type { LeaderboardRecord } from "@/lib/types";

const RANKS = Array.from({ length: 10 }, (_, i) => i + 1);

export function MatrixTable({ records }: { records: LeaderboardRecord[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-12 border-r border-border bg-surface px-3 py-2.5 text-left font-medium text-muted">
              #
            </th>
            {records.map((r) => {
              const partial = isPartialMonth(r.date);
              return (
                <th
                  key={r.date}
                  className="min-w-[200px] border-r border-border px-3 py-2 text-left font-medium last:border-0"
                >
                  <div className="text-foreground">
                    {monthLabel(r.date)}
                    {partial && (
                      <span
                        className="ml-1 text-amber-500/70"
                        title={`Partial month — data as of ${r.date}`}
                      >
                        *
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10px] font-normal text-muted">
                    {partial ? `as of ${r.date}` : `through ${r.date}`}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {RANKS.map((rank) => (
            <tr
              key={rank}
              className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/60"
            >
              <td className="sticky left-0 z-10 border-r border-border bg-surface px-3 py-2 font-mono text-xs text-muted">
                {rank}
              </td>
              {records.map((r) => {
                const model = r.models.find((m) => m.rank === rank && m.name !== "Other");
                const { provider, color } = model ? providerFor(model.name) : { provider: "", color: "" };
                return (
                  <td
                    key={r.date}
                    className="border-r border-border px-3 py-2 align-top last:border-0"
                  >
                    {model ? (
                      <>
                        <div className="font-mono text-xs" style={{ color }}>
                          {model.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted">
                          {provider} · <span className="text-foreground/70">{model.pct.toFixed(1)}%</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
