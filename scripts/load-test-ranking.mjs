/**
 * Teste de carga — ranking v3 (snapshots Supabase)
 *
 * Uso:
 *   node scripts/load-test-ranking.mjs
 *   node scripts/load-test-ranking.mjs --base https://votti.app --slug 9PY5FD --spectators 5000 --refresh-per-sec 50 --duration 120
 */

import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = arg("base", "https://votti.app").replace(/\/$/, "");
const SLUG = arg("slug", "9PY5FD");
const SPECTATORS = Number(arg("spectators", "5000"));
const REFRESH_PER_SEC = Number(arg("refresh-per-sec", "50"));
const DURATION_SEC = Number(arg("duration", "120"));

const rankingUrl = `${BASE}/ranking/${encodeURIComponent(SLUG)}`;
const metaUrl = `${BASE}/api/polls/${encodeURIComponent(SLUG)}/meta`;
const refreshUrl = `${BASE}/api/polls/${encodeURIComponent(SLUG)}/refresh-snapshot`;

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function stats(label, values) {
  if (!values.length) return { label, count: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    label,
    count: sorted.length,
    min: Math.round(sorted[0]),
    p50: Math.round(percentile(sorted, 50)),
    p95: Math.round(percentile(sorted, 95)),
    p99: Math.round(percentile(sorted, 99)),
    max: Math.round(sorted[sorted.length - 1]),
    avg: Math.round(sum / sorted.length),
  };
}

async function timedFetch(url, init) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    return { ok: res.ok, status: res.status, ms: performance.now() - t0 };
  } catch (err) {
    return { ok: false, status: 0, ms: performance.now() - t0, error: String(err) };
  }
}

async function runSpectatorWave(count) {
  const latencies = [];
  let errors = 0;
  const batchSize = 100;
  const started = performance.now();

  for (let off = 0; off < count; off += batchSize) {
    const results = await Promise.all(
      Array.from({ length: Math.min(batchSize, count - off) }, (_, i) =>
        timedFetch(rankingUrl, {
          headers: { accept: "application/json", "x-load-test": "1", "x-client-id": String(off + i) },
        }),
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
    ...stats("GET /ranking", latencies),
    errors,
    errorRate: count ? Math.round((errors / count) * 10000) / 100 : 0,
  };
}

async function runRefreshLoad(durationSec, rate) {
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
    ...stats("POST /refresh-snapshot", latencies),
    note: "Simula atualização de snapshot após votos (v3)",
  };
}

async function main() {
  console.log("=== VOTTI Ranking v3 Load Test ===");
  console.log({ base: BASE, slug: SLUG, spectators: SPECTATORS });

  const health = await timedFetch(rankingUrl, { headers: { accept: "application/json" } });
  const meta = await timedFetch(metaUrl, { headers: { accept: "application/json" } });

  if (!health.ok) {
    console.warn(`\n⚠️  GET /ranking retornou ${health.status}. Confira deploy + SUPABASE_SERVICE_ROLE_KEY.`);
  }

  console.log("\n--- Fase 1: espectadores (GET /ranking) ---");
  const spectatorResult = await runSpectatorWave(SPECTATORS);

  console.log(`\n--- Fase 2: refresh-snapshot (${REFRESH_PER_SEC}/s × ${DURATION_SEC}s) ---`);
  const refreshResult = await runRefreshLoad(DURATION_SEC, REFRESH_PER_SEC);

  const report = {
    generatedAt: new Date().toISOString(),
    architecture: "v3-snapshots",
    config: { base: BASE, slug: SLUG, spectators: SPECTATORS, refreshPerSec: REFRESH_PER_SEC },
    healthCheck: { ranking: health, meta },
    spectators: spectatorResult,
    refreshLoad: refreshResult,
    approval: {
      rankingReachable: health.ok,
      errorRateUnder1Pct: spectatorResult.errorRate < 1,
      p95Under500ms: spectatorResult.p95 < 500 || spectatorResult.count === 0,
    },
  };

  console.log("\n=== RELATÓRIO ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
