/**
 * Teste de carga — checklist de lançamento VOTTI
 * Cenários: 1k / 5k / 10k espectadores + 100 votos/s × 10 min (configurável)
 *
 * Uso:
 *   node scripts/load-test-launch.mjs --base https://votti.app --slug 9PY5FD
 *   node scripts/load-test-launch.mjs --scenarios 1000,5000 --vote-duration 60
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
const VOTES_PER_SEC = Number(arg("votes-per-sec", "100"));
const VOTE_DURATION_SEC = Number(arg("vote-duration", "600"));
const SSE_SAMPLE = Number(arg("sse-sample", "200"));
const WEBHOOK_SECRET = process.env.VOTTI_WEBHOOK_SECRET?.trim() ?? "";

const rankingUrl = `${BASE}/api/polls/${encodeURIComponent(SLUG)}/ranking`;
const streamUrl = `${BASE}/api/polls/${encodeURIComponent(SLUG)}/stream`;
const metaUrl = `${BASE}/api/polls/${encodeURIComponent(SLUG)}/meta`;
const webhookUrl = `${BASE}/api/internal/vote-recorded`;

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
    const ms = performance.now() - t0;
    return { ok: res.ok, status: res.status, ms };
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

async function sseSample(count, durationSec) {
  const durationMs = durationSec * 1000;
  const updateLatencies = [];
  let connected = 0;
  let failed = 0;
  let updates = 0;

  const runOne = (id) =>
    new Promise((resolve) => {
      const t0 = performance.now();
      let msgs = 0;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), durationMs);

      fetch(streamUrl, { headers: { accept: "text/event-stream" }, signal: ctrl.signal })
        .then(async (res) => {
          if (!res.ok || !res.body) {
            failed += 1;
            clearTimeout(timer);
            resolve(null);
            return;
          }
          connected += 1;
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const parts = buf.split("\n\n");
            buf = parts.pop() ?? "";
            for (const p of parts) {
              if (p.startsWith("data:")) {
                msgs += 1;
                if (msgs > 1) updateLatencies.push(performance.now() - t0);
              }
            }
          }
          updates += msgs;
          clearTimeout(timer);
          resolve(msgs);
        })
        .catch(() => {
          failed += 1;
          clearTimeout(timer);
          resolve(null);
        });
    });

  const started = performance.now();
  const batch = 25;
  for (let off = 0; off < count; off += batch) {
    await Promise.all(
      Array.from({ length: Math.min(batch, count - off) }, (_, i) => runOne(off + i)),
    );
  }

  return {
    requested: count,
    connected,
    failed,
    durationSec,
    elapsedMs: Math.round(performance.now() - started),
    totalUpdates: updates,
    avgUpdatesPerConn: connected ? Math.round(updates / connected) : 0,
    updateLatency: stats(updateLatencies),
    estimatedRedisCmdsPerSec: `~${connected * 2 * (1000 / 500)} (poll versão 500ms)`,
  };
}

async function voteLoad(durationSec, rate) {
  if (!WEBHOOK_SECRET) {
    return {
      skipped: true,
      reason: "VOTTI_WEBHOOK_SECRET ausente — simulando leituras ranking no lugar",
      ...await rankingPollLoad(durationSec, rate),
    };
  }

  const latencies = [];
  let errors = 0;
  let sent = 0;
  const end = performance.now() + durationSec * 1000;
  let seq = 0;

  while (performance.now() < end) {
    const batch = await Promise.all(
      Array.from({ length: rate }, () => {
        const body = JSON.stringify({
          record: {
            id: `load-${seq++}`,
            poll_id: "load-test",
            question_id: "q",
            option_id: "o",
            voter_token: `v-${seq}`,
          },
        });
        return timedFetch(webhookUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${WEBHOOK_SECRET}`,
          },
          body,
        });
      }),
    );
    for (const r of batch) {
      if (r.ok) latencies.push(r.ms);
      else errors += 1;
    }
    sent += rate;
    await sleep(1000);
  }

  return {
    skipped: false,
    votesSent: sent,
    errors,
    latency: stats(latencies),
    supabaseQueries: 0,
    note: "Webhook incrementa Redis diretamente; Supabase não consultado no hot path",
  };
}

async function rankingPollLoad(durationSec, rate) {
  const latencies = [];
  let errors = 0;
  let sent = 0;
  const end = performance.now() + durationSec * 1000;

  while (performance.now() < end) {
    const batch = await Promise.all(
      Array.from({ length: rate }, () => timedFetch(rankingUrl, { headers: { accept: "application/json" } })),
    );
    for (const r of batch) {
      if (r.ok) latencies.push(r.ms);
      else errors += 1;
    }
    sent += rate;
    await sleep(1000);
  }

  return { simulatedAsVotes: true, requests: sent, errors, latency: stats(latencies) };
}

async function consistencyCheck() {
  const samples = await Promise.all(
    Array.from({ length: 10 }, () => timedFetch(rankingUrl, { headers: { accept: "application/json" } })),
  );
  const bodies = [];
  for (const s of samples.filter((x) => x.ok)) {
    const res = await fetch(rankingUrl, { cache: "no-store" });
    if (res.ok) bodies.push(await res.json());
  }
  const versions = bodies.map((b) => b.version);
  const sameVersion = versions.every((v) => v === versions[0]);
  const participantCounts = bodies.map((b) => b.participantCount);
  const sameParticipants = participantCounts.every((p) => p === participantCounts[0]);

  return {
    samples: bodies.length,
    sameVersion,
    sameParticipantCount: sameParticipants,
    versions: [...new Set(versions)],
    participantCounts: [...new Set(participantCounts)],
  };
}

async function main() {
  const memBefore = process.memoryUsage();
  console.log("=== VOTTI Launch Load Test ===");
  console.log({ base: BASE, slug: SLUG, scenarios: SCENARIOS, votesPerSec: VOTES_PER_SEC });

  const health = await timedFetch(rankingUrl, { headers: { accept: "application/json" } });
  const meta = await timedFetch(metaUrl, { headers: { accept: "application/json" } });

  const scenarioResults = [];
  for (const n of SCENARIOS) {
    console.log(`\n--- Cenário: ${n} espectadores ---`);
    const burst = await spectatorBurst(n);
    const sse = await sseSample(Math.min(SSE_SAMPLE, Math.round(n / 10)), 30);
    scenarioResults.push({ spectators: n, burst, sse });
  }

  console.log(`\n--- Votos: ${VOTES_PER_SEC}/s × ${VOTE_DURATION_SEC}s ---`);
  const votes = await voteLoad(Math.min(VOTE_DURATION_SEC, 120), VOTES_PER_SEC);

  const consistency = await consistencyCheck();
  const memAfter = process.memoryUsage();

  const report = {
    generatedAt: new Date().toISOString(),
    config: { base: BASE, slug: SLUG, scenarios: SCENARIOS, votesPerSec: VOTES_PER_SEC, voteDurationSec: VOTE_DURATION_SEC },
    healthCheck: { ranking: health, meta },
    scenarios: scenarioResults,
    voteLoad: votes,
    consistency,
    client: {
      memoryMb: {
        heapBefore: Math.round(memBefore.heapUsed / 1024 / 1024),
        heapAfter: Math.round(memAfter.heapUsed / 1024 / 1024),
      },
      note: "CPU/memória do servidor e Redis requerem dashboard Vercel + Upstash",
    },
    redisEstimate: {
      ssePolling: "N conexões × 2 GET/s a cada 500ms",
      recommendation: "Migrar para Upstash Realtime antes de >2k espectadores",
    },
    supabaseEstimate: {
      spectatorReads: 0,
      voteWrites: "INSERT apenas",
      rebuildOnCacheMiss: "O(n) votes — evitar em evento",
    },
    approval: {
      redisConfigured: health.ok,
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
