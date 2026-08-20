#!/usr/bin/env node
// Builds data/leaderboard-history.json and data/leaderboard-monthly.json from:
//   1. The live vercel.com/ai-gateway/leaderboards/models page (current rolling window)
//   2. Wayback Machine captures of that page and its predecessors, back to the
//      earliest capture that exists (2025-11-05).
//
// See PLAN.md for the full research trail and the two embedded-data schemas
// this parses ("chef_values" vs. the older "dataTop10Only").

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

const LIVE_URL = "https://vercel.com/ai-gateway/leaderboards/models";

const CDX_TARGETS = [
  "vercel.com/ai-gateway/leaderboards/models",
  "vercel.com/ai-gateway/leaderboards",
  "vercel.com/ai-gateway/model-leaderboard",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const TOP_N = 10;

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function listSnapshots(target) {
  const cdxUrl =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target)}` +
    `&output=json&filter=statuscode:200&filter=mimetype:text/html&collapse=timestamp:8&limit=500`;
  const raw = await fetchText(cdxUrl);
  const rows = JSON.parse(raw);
  if (rows.length <= 1) return [];
  const [, ...body] = rows;
  return body.map(([, timestamp, original]) => ({ timestamp, original }));
}

// ---- schema A: current page, {"day":"...","metric":"tokens|requests|cost","chef_values":[["Name",pct],...]}
const NEW_SCHEMA_RE =
  /\{\\?"day\\?":\\?"([^"\\]+)\\?",\\?"metric\\?":\\?"(tokens|requests|cost)\\?",\\?"chef_values\\?":\[(\[.*?\]\])\}/g;

function parseNewSchema(html, source) {
  const out = [];
  for (const m of html.matchAll(NEW_SCHEMA_RE)) {
    const [, day, metric, pairsRaw] = m;
    let pairs;
    try {
      const jsonish = `[${pairsRaw}`.replace(/\\"/g, '"');
      pairs = JSON.parse(jsonish);
    } catch {
      continue;
    }
    if (!Array.isArray(pairs) || pairs.length === 0) continue;
    out.push({
      date: day.slice(0, 10),
      metric,
      pairs, // [name, pct][]
      source,
    });
  }
  return out;
}

// ---- schema B: pre-May-2026 page, "dataTop10Only":[{"date":epochMs,"Model A":pct,"Model B":pct,...},...]
// The old page published a single unlabeled series ("The most popular models by % of AI
// Gateway traffic"), with no tokens/requests/cost split in the UI at all. It is TOKEN share:
// the two schemas overlap on 2026-03-17..2026-04-09, and across those 24 days this series
// matches the new schema's `tokens` to a mean of 0.014pp, vs 7.6pp for `requests` and 9.5pp
// for `cost`. See PLAN.md "Identifying the old series".
const OLD_SCHEMA_RE = /\\?"dataTop10Only\\?":\[(.*?)\]/s;

function parseOldSchema(html, source) {
  const match = html.match(OLD_SCHEMA_RE);
  if (!match) return [];
  const bodyRaw = match[1];
  let entries;
  try {
    const jsonish = `[${bodyRaw}]`.replace(/\\"/g, '"');
    entries = JSON.parse(jsonish);
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    const { date: epochMs, ...rest } = entry;
    const pairs = Object.entries(rest);
    if (pairs.length === 0) continue;
    out.push({
      date: new Date(epochMs).toISOString().slice(0, 10),
      metric: "tokens",
      pairs,
      source,
    });
  }
  return out;
}

function toRanked(pairs) {
  const sorted = [...pairs]
    .filter(([, pct]) => typeof pct === "number" && Number.isFinite(pct))
    .sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);
  const otherPct = rest.reduce((sum, [, pct]) => sum + pct, 0);
  const models = top.map(([name, pct], i) => ({
    rank: i + 1,
    name,
    pct: Math.round(pct * 100) / 100,
  }));
  if (rest.length > 0) {
    models.push({ rank: TOP_N + 1, name: "Other", pct: Math.round(otherPct * 100) / 100 });
  }
  return models;
}

async function main() {
  console.log("Fetching live page...");
  const records = [];
  try {
    const liveHtml = await fetchText(LIVE_URL);
    const found = parseNewSchema(liveHtml, "live");
    records.push(...found);
    console.log(`  live page: ${found.length} day/metric records`);
  } catch (err) {
    console.error("  live fetch failed:", err.message);
  }

  for (const target of CDX_TARGETS) {
    console.log(`Listing Wayback snapshots for ${target}...`);
    let snaps = [];
    try {
      snaps = await listSnapshots(target);
    } catch (err) {
      console.error("  CDX lookup failed:", err.message);
      continue;
    }
    console.log(`  ${snaps.length} snapshot(s)`);
    for (const { timestamp, original } of snaps) {
      const url = `https://web.archive.org/web/${timestamp}id_/${original}`;
      try {
        const html = await fetchText(url);
        const newRecs = parseNewSchema(html, `wayback:${timestamp}`);
        const oldRecs = newRecs.length === 0 ? parseOldSchema(html, `wayback:${timestamp}`) : [];
        records.push(...newRecs, ...oldRecs);
        console.log(
          `  ${timestamp} (${original.replace("https://vercel.com", "")}): +${newRecs.length + oldRecs.length}`
        );
      } catch (err) {
        console.error(`  ${timestamp} failed: ${err.message}`);
      }
    }
  }

  // Dedupe by metric|date, preferring live > wayback (first-write-wins since live pushed first)
  const byKey = new Map();
  for (const rec of records) {
    const key = `${rec.metric}|${rec.date}`;
    if (!byKey.has(key)) byKey.set(key, rec);
  }

  const daily = [...byKey.values()]
    .map((rec) => ({
      date: rec.date,
      metric: rec.metric,
      type: "daily",
      models: toRanked(rec.pairs),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.metric.localeCompare(b.metric)));

  console.log(`\nTotal daily records: ${daily.length}`);
  const byMetric = {};
  for (const d of daily) byMetric[d.metric] = (byMetric[d.metric] ?? 0) + 1;
  console.log("By metric:", byMetric);

  // Monthly rollup: latest day within each (metric, year-month)
  const monthlyMap = new Map();
  for (const rec of daily) {
    const ym = rec.date.slice(0, 7);
    const key = `${rec.metric}|${ym}`;
    const existing = monthlyMap.get(key);
    if (!existing || rec.date > existing.date) monthlyMap.set(key, rec);
  }
  const monthly = [...monthlyMap.values()]
    .map((rec) => ({ ...rec, type: "monthly" }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.metric.localeCompare(b.metric)));

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, "leaderboard-history.json"),
    JSON.stringify(daily, null, 2)
  );
  await writeFile(
    path.join(DATA_DIR, "leaderboard-monthly.json"),
    JSON.stringify(monthly, null, 2)
  );
  console.log(`\nWrote ${daily.length} daily + ${monthly.length} monthly records to data/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
