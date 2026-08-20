import { Dashboard } from "@/components/Dashboard";
import { getRecords } from "@/lib/data";
import type { Metric } from "@/lib/types";

const METRICS: Metric[] = ["tokens", "cost", "requests"];

export default function Home() {
  const monthlyByMetric = Object.fromEntries(
    METRICS.map((m) => [m, getRecords(m, "monthly")])
  ) as Record<Metric, ReturnType<typeof getRecords>>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
            Vercel Token Data
          </h1>
          <p className="text-sm text-muted">
            Top 10 models by share of{" "}
            <a
              href="https://vercel.com/ai-gateway/leaderboards/models"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              Vercel AI Gateway
            </a>{" "}
            traffic, one snapshot per month. Coverage varies by metric — see{" "}
            <a
              href="https://github.com/hanski319/vercel-token-data/blob/master/PLAN.md"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              PLAN.md
            </a>{" "}
            for sourcing and known gaps
          </p>
        </div>
      </header>

      <Dashboard monthlyByMetric={monthlyByMetric} />

      <footer className="mt-4 border-t border-border pt-6 text-xs text-muted">
        Data anonymized and licensed CC BY 4.0 by Vercel. Not affiliated with Vercel.
      </footer>
    </main>
  );
}
