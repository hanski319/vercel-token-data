# Vercel Token Data

Historical market-share trends for the top models on [Vercel AI Gateway](https://vercel.com/ai-gateway/leaderboards/models) — token volume, spend, and requests — going back to July 2025 where the data exists.

Not affiliated with Vercel. Companion project to [`token-usage-open-router`](https://github.com/hanski319/token-usage-open-router).

See [PLAN.md](./PLAN.md) for how the data is sourced, the two page schemas it parses, and known coverage gaps.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Recharts · ExcelJS

## Development

```bash
npm install
npm run dev       # http://localhost:3000
```

## Refreshing the data

```bash
node scripts/build-dataset.mjs
```

Pulls the current live leaderboard plus every Wayback Machine capture found for the relevant URLs,
and rewrites `data/leaderboard-history.json` (daily) and `data/leaderboard-monthly.json` (monthly
rollup). See PLAN.md for what it can and can't recover.

## Export

Each tab has a "Download .xlsx" link (`/api/export?metric=tokens|cost|requests`) that generates a
workbook on the fly — one sheet, wide format (date rows × model columns).
