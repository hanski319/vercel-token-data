# PLAN

Historical market-share trends for the top models on [Vercel AI Gateway](https://vercel.com/ai-gateway/leaderboards/models), modeled after [`token-usage-open-router`](https://github.com/hanski319/token-usage-open-router).

## Research trail (what the brief assumed vs. what's actually there)

The original brief pointed at `GET /api/ai/v5/gateway-model-leaderboard?view=creators&metric=tokens` as
"the live API" and assumed Wayback coverage back to early 2025. Neither held up:

1. **That endpoint isn't the leaderboard.** It returns a flat, static list of 15 creator/provider
   slugs (`["deepseek","anthropic","openai",...]`) — a filter dropdown's options, not data. Confirmed
   by loading the real page in a browser and reading its network log: the client calls that exact URL
   and gets exactly that 150-byte array. It's a dead end.

2. **The real data is server-rendered into the page itself**, not fetched from a discoverable JSON
   API. `https://vercel.com/ai-gateway/leaderboards/models` embeds its chart data directly in the
   RSC/flight payload as escaped JSON strings of the shape:
   ```
   {"day":"2026-08-20T00:00:00.000Z","metric":"tokens","chef_values":[["DeepSeek V4 Flash",20.02],...]}
   ```
   one object per (day, metric) for `tokens`, `requests`, and `cost` — a rolling window (the page UI
   itself only offers 2W / 1M / 2M range toggles). A plain `curl` of the page gets this — no headless
   browser needed for the live source.

3. **Wayback's earliest capture of any AI Gateway leaderboard page is 2025-11-05**, not "early 2025."
   There is nothing before that date for `/ai-gateway/leaderboards`, `/ai-gateway/leaderboards/models`,
   or the older `/ai-gateway/model-leaderboard` URL. (Also: every Wayback capture here is gzip-compressed
   — `curl` without `--compressed`/decoding silently returns binary garbage that looks like "no data."
   Cost about an hour of false negatives before catching it.)

4. **That earliest snapshot's embedded data reaches back further than its capture date**, because it's
   also a rolling window. The 2025-11-05 and 2025-11-28 captures both carry a `dataTop10Only` series
   starting **2025-07-01** — so July 2025 is the effective start of recoverable history, not November.

5. **The page's data schema changed some time between 2026-04-09 and 2026-05-16.** Before that window,
   the leaderboard published a single, unlabeled `dataTop10Only` series with no metric split in the
   UI at all — its meta description reads only "The most popular models by % of AI Gateway traffic."
   Every Wayback capture from 2025-07-01 through 2026-04-09 has just that series; `chef_values` with
   named `tokens`/`requests`/`cost` metrics appears only from the 2026-05-16 capture onward.

### Identifying the old series

"% of traffic" is ambiguous, and getting it wrong silently mislabels ~10 months of data. It was
initially assumed to be *request* share — **that assumption was wrong**, and it is resolvable
empirically rather than by inference:

The two schemas overlap. The 2026-04-09 capture's `dataTop10Only` runs 2026-02-08 → 2026-04-09,
while the 2026-05-16 capture's `chef_values` runs 2026-03-17 → 2026-05-16 — 24 shared days. Comparing
the old series against each named metric on those days, per-model:

| Compared against | Mean abs. difference | Max |
| --- | --- | --- |
| **`tokens`** | **0.014 pp** | 0.33 pp |
| `requests` | 7.56 pp | 9.23 pp |
| `cost` | 9.53 pp | 10.89 pp |

The old series *is* token share (the residual 0.014pp is snapshot-timing jitter — Vercel revises
recent days slightly). So `parseOldSchema` labels it `tokens`.

### Net effect on coverage

| Metric | Earliest usable data | Source |
| --- | --- | --- |
| **Tokens** | 2025-07-01 | Wayback `dataTop10Only` (2025-07 → 2026-04, identified as tokens above) + live `chef_values` (2026-03 → now) |
| **Requests** | 2026-03-17 | Live page + Wayback `chef_values` captures only — no earlier source exists |
| **Spend (cost)** | 2026-03-17 | Same as Requests |

So: **nothing goes back to Jan 2025.** Tokens reach July 2025 — the start of any AI Gateway
leaderboard history Wayback preserved. Requests and Spend reach only March 2026, because the
leaderboard did not break traffic out by those metrics before then; that data doesn't exist anywhere
it could be scraped from. Flagged here rather than padded with invented numbers.

## Data pipeline

`scripts/build-dataset.mjs`:

1. Fetches the live page, extracts every embedded `chef_values` record (current rolling window).
2. Lists Wayback CDX captures for all three known URLs (`/ai-gateway/leaderboards/models`,
   `/ai-gateway/leaderboards`, `/ai-gateway/model-leaderboard`), one snapshot per day, `statuscode:200`,
   `text/html` only.
3. Fetches each snapshot, parses whichever schema it contains (`chef_values` or `dataTop10Only`).
4. Dedupes by `(metric, date)` — live data wins ties, since it's the freshest read of that day.
5. Ranks each day's models by share, keeps the top 10, sums everyone else into an `Other` row (only
   when the raw record actually had more than 10 entries — some very early days had fewer than 10
   models routed at all, so their shares legitimately don't sum to 100%).
6. Writes `data/leaderboard-history.json` (daily) and `data/leaderboard-monthly.json` (one row per
   metric per month — the latest day on record within that month).

Re-run with `node scripts/build-dataset.mjs`. It's idempotent and safe to re-run daily/via cron to
extend the live-page tail; it will *not* recover more Wayback history than what's listed above since
that's the actual limit of what was archived.

## App

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4, matching `token-usage-open-router`'s
stack. Dark theme only.

- **Tabs**: Token Volume / Spend / Requests (one metric each, see coverage table above).
- **Daily / Monthly toggle**: monthly is a rollup of the daily records, not a separately-fetched
  series.
- **Stacked area / line chart toggle** (Recharts) — top 10 models + Other, colored by a stable hash
  of the model name so a given model keeps its color across metrics and ranges.
- **Tabular view** below the chart, with a "show all" expander.
- **Download .xlsx`** (`app/api/export/route.ts`, via `exceljs`) — one sheet per metric, wide format
  (date rows × model columns), matching the multi-sheet pattern from `token-usage-open-router`.

## Next steps / open items

- The live page's rolling window (2M) will eventually roll past 2026-03-17; re-running the build
  script periodically is what keeps Tokens/Spend history from losing its earliest days once Wayback
  stops adding new captures in that gap. Consider a scheduled GitHub Action to run the script daily
  and commit the refreshed `data/*.json`.
- No new Wayback captures were found between 2026-04-09 and 2026-05-16 (the schema-transition
  window) — if one surfaces later, re-running the script will pick it up automatically.
- Model names are exactly what Vercel's API returns (e.g. "DeepSeek V4 Flash 0731") — no normalization
  applied. If Vercel renames a model, history before/after the rename will show as two distinct series.
