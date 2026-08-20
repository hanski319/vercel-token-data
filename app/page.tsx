import { Dashboard } from "@/components/Dashboard";
import { getRecords } from "@/lib/data";
import type { Metric } from "@/lib/types";

const METRICS: Metric[] = ["tokens", "cost", "requests"];

export default function Home() {
  const dataByMetric = Object.fromEntries(
    METRICS.map((m) => [
      m,
      { daily: getRecords(m, "daily"), monthly: getRecords(m, "monthly") },
    ])
  ) as Record<Metric, { daily: ReturnType<typeof getRecords>; monthly: ReturnType<typeof getRecords> }>;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Unofficial · Community Dashboard
        </p>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Vercel AI Gateway Leaderboard — Historical Trends
        </h1>
        <p className="max-w-3xl text-sm text-muted">
          Market share of the top models routed through{" "}
          <a
            href="https://vercel.com/ai-gateway/leaderboards/models"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-2 hover:text-accent"
          >
            Vercel AI Gateway
          </a>
          , tracked over time by token volume, spend, and request count. Recent data comes from
          the live leaderboard; earlier history is reconstructed from Wayback Machine captures.
          See <a href="https://github.com/hanski319/vercel-ai-gateway-leaderboard/blob/master/PLAN.md" target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-2 hover:text-accent">PLAN.md</a> for sourcing details and known gaps.
        </p>
      </header>

      <Dashboard dataByMetric={dataByMetric} />

      <footer className="mt-4 border-t border-border pt-6 text-xs text-muted">
        Data anonymized and licensed CC BY 4.0 by Vercel. This project is not affiliated with
        Vercel. Built with Next.js.
      </footer>
    </main>
  );
}
