/**
 * Teste de carga — checklist de lançamento VOTTI (ranking v3)
 *
 * Uso:
 *   node scripts/load-test-launch.mjs --base https://votti.app --slug 9PY5FD
 *   node scripts/load-test-launch.mjs --scenarios 1000,5000 --refresh-duration 60
 */

import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = arg("base", "https://votti.app").replace(/\/$/, "");
const SLUG = arg("slug", "9PY5FD");
const SCENARIOS = (arg("scenarios", "1000,5000,10000") || "1000")
  .split(",")
  .map((n) => Number(n.trim()))
  .filter((n) => n > 0);
const REFRESH_PER_SEC = Number(arg("refresh-per-sec", "50"));
const REFRESH_DURATION_SEC = Number(arg("refresh-duration", "120"));

const rankingUrl = `${BASE}/ranking/${encodeURIComponent(SLUG)}`;
const metaUrl = `${BASE}/api/polls/${encodeURIComponent(SLUG)}/meta`;
const refreshUrl = `${BASE}/api/polls/${encodeURIComponent(SLUG)}/refresh-snapshot`;

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function stats(values) {
  if (!values.length) return { count: 0, avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    count: sorted.length,
    avg: Math.round(sum / sorted.length),
    p50: Math.round(percentile(sorted, 50)),
    p95: Math.round(percentile(sorted, 95)),
    p99: Math.round(percentile(sorted, 99)),
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
  };
}

async function timedFetch(url, init) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
    return { ok: res.ok, status: res.status, ms: performance.now() - t0 };
  } catch (err) {
    return { ok: false, status: 0, ms: performance.now() - t0, error: String(err) };
  }
}

async function spectatorBurst(count) {
  const latencies = [];
  let errors = 0;
  const batch = 50;
  const started = performance.now();

  for (let off = 0; off < count; off += batch) {
    const results = await Promise.all(
      Array.from({ length: Math.min(batch, count - off) }, (_, i) =>
        timedFetch(rankingUrl, { headers: { accept: "application/json", "x-load-id": String(off + i) } }),
      ),
    );
    for (const r of results) {
      if (r.ok) latencies.push(r.ms);
      else errors += 1;
    }
  }

  return {
    spectators: count,
    elapsedMs: Math.round(performance.now() - started),
    latency: stats(latencies),
    errors,
    errorRate: count ? Math.round((errors / count) * 10000) / 100 : 0,
  };
}

async function refreshLoad(durationSec, rate) {
  const latencies = [];
  let errors = 0;
  let sent = 0;
  const end = performance.now() + durationSec * 1000;

  while (performance.now() < end) {
    const batch = await Promise.all(
      Array.from({ length: rate }, () =>
        timedFetch(refreshUrl, { method: "POST", headers: { accept: "application/json" } }),
      ),
    );
    for (const r of batch) {
      if (r.ok) latencies.push(r.ms);
      else errors += 1;
    }
    sent += rate;
    await sleep(1000);
  }

  return {
    refreshRequests: sent,
    errors,
    latency: stats(latencies),
    note: "POST /refresh-snapshot após cada voto (v3)",
  };
}

async function consistencyCheck() {
  const bodies = [];
  for (let i = 0; i < 10; i += 1) {
    const res = await fetch(rankingUrl, { cache: "no-store", headers: { accept: "application/json" } });
    if (res.ok) bodies.push(await res.json());
  }
  const versions = bodies.map((b) => b.version);
  const participantCounts = bodies.map((b) => b.participantCount);

  return {
    samples: bodies.length,
    sameVersion: versions.every((v) => v === versions[0]),
    sameParticipantCount: participantCounts.every((p) => p === participantCounts[0]),
    versions: [...new Set(versions)],
    participantCounts: [...new Set(participantCounts)],
  };
}

async function main() {
  console.log("=== VOTTI Launch Load Test (v3) ===");
  console.log({ base: BASE, slug: SLUG, scenarios: SCENARIOS });

  const health = await timedFetch(rankingUrl, { headers: { accept: "application/json" } });
  const meta = await timedFetch(metaUrl, { headers: { accept: "application/json" } });

  const scenarioResults = [];
  for (const n of SCENARIOS) {
    console.log(`\n--- Cenário: ${n} espectadores ---`);
    scenarioResults.push({ spectators: n, burst: await spectatorBurst(n) });
  }

  console.log(`\n--- Refresh: ${REFRESH_PER_SEC}/s × ${REFRESH_DURATION_SEC}s ---`);
  const refresh = await refreshLoad(Math.min(REFRESH_DURATION_SEC, 120), REFRESH_PER_SEC);
  const consistency = await consistencyCheck();

  const report = {
    generatedAt: new Date().toISOString(),
    architecture: "v3-snapshots",
    config: { base: BASE, slug: SLUG, scenarios: SCENARIOS, refreshPerSec: REFRESH_PER_SEC },
    healthCheck: { ranking: health, meta },
    scenarios: scenarioResults,
    refreshLoad: refresh,
    consistency,
    approval: {
      rankingReachable: health.ok,
      errorRateUnder1Pct: scenarioResults.every((s) => s.burst.errorRate < 1),
      p95Under500ms: scenarioResults.every((s) => s.burst.latency.p95 < 500 || s.burst.latency.count === 0),
      consistencyOk: consistency.sameVersion,
    },
  };

  const outPath = "scripts/load-test-report.json";
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("\n=== RELATÓRIO ===");
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nSalvo em ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
