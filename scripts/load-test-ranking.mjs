/**
 * Teste de carga — ranking ao vivo VOTTI
 *
 * Uso:
 *   node scripts/load-test-ranking.mjs
 *   node scripts/load-test-ranking.mjs --base https://votti.app --slug 9PY5FD --spectators 5000 --sse 500 --votes-per-sec 100 --duration 120
 *
 * Variáveis:
 *   VOTTI_WEBHOOK_SECRET — se definido, simula votos via webhook interno (incremento Redis)
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
const SSE_CONNECTIONS = Number(arg("sse", "500"));
const VOTES_PER_SEC = Number(arg("votes-per-sec", "100"));
const DURATION_SEC = Number(arg("duration", "120"));
const WEBHOOK_SECRET = process.env.VOTTI_WEBHOOK_SECRET?.trim() ?? "";

const rankingUrl = `${BASE}/api/polls/${encodeURIComponent(SLUG)}/ranking`;
const streamUrl = `${BASE}/api/polls/${encodeURIComponent(SLUG)}/stream`;
const webhookUrl = `${BASE}/api/internal/vote-recorded`;

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

async function fetchRanking(id) {
  const t0 = performance.now();
  try {
    const res = await fetch(rankingUrl, {
      headers: { accept: "application/json", "x-load-test": "1", "x-client-id": String(id) },
      signal: AbortSignal.timeout(15_000),
    });
    const ms = performance.now() - t0;
    const ok = res.ok;
    let bytes = 0;
    if (ok) {
      const text = await res.text();
      bytes = text.length;
    }
    return { ok, ms, status: res.status, bytes };
  } catch (err) {
    return { ok: false, ms: performance.now() - t0, status: 0, error: String(err) };
  }
}

async function runSpectatorWave(count, waveLabel) {
  const latencies = [];
  const errors = [];
  let bytes = 0;
  const batchSize = 100;
  const started = performance.now();

  for (let offset = 0; offset < count; offset += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, count - offset) }, (_, i) =>
      fetchRanking(offset + i),
    );
    const results = await Promise.all(batch);
    for (const r of results) {
      if (r.ok) {
        latencies.push(r.ms);
        bytes += r.bytes ?? 0;
      } else {
        errors.push(r);
      }
    }
  }

  return {
    wave: waveLabel,
    elapsedMs: Math.round(performance.now() - started),
    ...stats("GET /ranking", latencies),
    errors: errors.length,
    totalBytes: bytes,
    errorSample: errors.slice(0, 3),
  };
}

function openSseConnection(id, durationMs, sink) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    let messages = 0;
    let pings = 0;
    let errors = 0;
    let firstDataMs = null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), durationMs);

    fetch(streamUrl, {
      headers: { accept: "text/event-stream", "x-load-test": "1", "x-sse-id": String(id) },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) {
          errors += 1;
          clearTimeout(timer);
          resolve({ id, ok: false, status: res.status, messages, pings, errors });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const chunk of parts) {
            if (chunk.startsWith("data:")) {
              messages += 1;
              if (firstDataMs === null) firstDataMs = performance.now() - t0;
              sink.push(performance.now() - t0);
            } else if (chunk.startsWith(":")) {
              pings += 1;
            }
          }
        }

        clearTimeout(timer);
        resolve({
          id,
          ok: true,
          messages,
          pings,
          errors,
          firstDataMs: firstDataMs !== null ? Math.round(firstDataMs) : null,
          durationMs: Math.round(performance.now() - t0),
        });
      })
      .catch(() => {
        clearTimeout(timer);
        errors += 1;
        resolve({ id, ok: false, messages, pings, errors, durationMs: Math.round(performance.now() - t0) });
      });
  });
}

async function runSseLoad(count, durationSec) {
  const durationMs = durationSec * 1000;
  const firstMessageLatencies = [];
  const started = performance.now();

  const connections = Array.from({ length: count }, (_, i) =>
    openSseConnection(i, durationMs, firstMessageLatencies),
  );
  const results = await Promise.all(connections);

  const ok = results.filter((r) => r.ok).length;
  const totalMessages = results.reduce((s, r) => s + r.messages, 0);
  const totalPings = results.reduce((s, r) => s + r.pings, 0);

  return {
    requested: count,
    connected: ok,
    failed: count - ok,
    durationSec,
    elapsedMs: Math.round(performance.now() - started),
    totalMessages,
    totalPings,
    messagesPerConnAvg: ok ? Math.round(totalMessages / ok) : 0,
    firstMessage: stats("SSE first data", firstMessageLatencies),
    sample: results.slice(0, 5),
  };
}

async function postWebhookVote(seq) {
  const t0 = performance.now();
  const pollId = "load-test-poll";
  const body = {
    record: {
      id: `load-test-${seq}`,
      poll_id: pollId,
      question_id: "load-q",
      option_id: "load-o",
      voter_token: `load-voter-${seq}`,
    },
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${WEBHOOK_SECRET}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    return { ok: res.ok, ms: performance.now() - t0, status: res.status };
  } catch (err) {
    return { ok: false, ms: performance.now() - t0, status: 0, error: String(err) };
  }
}

async function runVoteLoad(votesPerSec, durationSec) {
  if (!WEBHOOK_SECRET) {
    return {
      skipped: true,
      reason:
        "VOTTI_WEBHOOK_SECRET não definido — simulando carga de leitura equivalente (poll de versão via GET /ranking)",
    };
  }

  const latencies = [];
  let errors = 0;
  let sent = 0;
  const endAt = performance.now() + durationSec * 1000;
  let seq = 0;

  while (performance.now() < endAt) {
    const batch = Array.from({ length: votesPerSec }, () => postWebhookVote(seq++));
    const results = await Promise.all(batch);
    for (const r of results) {
      if (r.ok) latencies.push(r.ms);
      else errors += 1;
    }
    sent += votesPerSec;
    await sleep(1000);
  }

  return {
    skipped: false,
    sent,
    errors,
    ...stats("POST /internal/vote-recorded", latencies),
  };
}

async function runVersionPollLoad(requestsPerSec, durationSec) {
  const latencies = [];
  let errors = 0;
  let sent = 0;
  const endAt = performance.now() + durationSec * 1000;

  while (performance.now() < endAt) {
    const batch = Array.from({ length: requestsPerSec }, (_, i) => fetchRanking(10_000 + sent + i));
    const results = await Promise.all(batch);
    for (const r of results) {
      if (r.ok) latencies.push(r.ms);
      else errors += 1;
    }
    sent += requestsPerSec;
    await sleep(1000);
  }

  return {
    simulatedVotesAsRankingPolls: true,
    sent,
    errors,
    ...stats("GET /ranking (simula carga de votos)", latencies),
  };
}

async function main() {
  console.log("=== VOTTI Load Test — Ranking ao vivo ===");
  console.log({
    base: BASE,
    slug: SLUG,
    spectators: SPECTATORS,
    sseConnections: SSE_CONNECTIONS,
    votesPerSec: VOTES_PER_SEC,
    durationSec: DURATION_SEC,
    webhookConfigured: Boolean(WEBHOOK_SECRET),
    startedAt: new Date().toISOString(),
  });

  const memBefore = process.memoryUsage();

  const health = await fetchRanking(0);
  if (!health.ok) {
    console.error("Falha no health check:", health);
    process.exit(1);
  }

  console.log("\n--- Fase 1: espectadores (GET /ranking) ---");
  const spectatorResult = await runSpectatorWave(SPECTATORS, "all-at-once");

  console.log("\n--- Fase 2: SSE simultâneo ---");
  const sseResult = await runSseLoad(SSE_CONNECTIONS, Math.min(DURATION_SEC, 60));

  console.log("\n--- Fase 3: votos (3 min) ---");
  const voteResult = WEBHOOK_SECRET
    ? await runVoteLoad(VOTES_PER_SEC, Math.min(DURATION_SEC, 180))
    : await runVersionPollLoad(VOTES_PER_SEC, Math.min(DURATION_SEC, 180));

  console.log("\n--- Fase 4: espectadores sustentados durante carga ---");
  const sustained = await runSpectatorWave(Math.min(1000, SPECTATORS), "sustained-1k");

  const memAfter = process.memoryUsage();

  const report = {
    config: {
      base: BASE,
      slug: SLUG,
      spectators: SPECTATORS,
      sseConnections: SSE_CONNECTIONS,
      votesPerSec: VOTES_PER_SEC,
      durationSec: DURATION_SEC,
    },
    healthCheck: stats("health GET /ranking", [health.ms]),
    spectatorWave: spectatorResult,
    sse: sseResult,
    votes: voteResult,
    sustainedSpectators: sustained,
    client: {
      memoryHeapMb: {
        before: Math.round(memBefore.heapUsed / 1024 / 1024),
        after: Math.round(memAfter.heapUsed / 1024 / 1024),
      },
      note: "CPU/memória do servidor (Vercel/Redis) não são expostos neste teste local; ver métricas no dashboard.",
    },
    supabaseNote:
      "Consumo Supabase no hot path de espectadores deve ser ~0. vote-applied e rebuild consultam votes apenas no write/recovery.",
    redisEstimate: {
      sseCommandsPerSec: `~${SSE_CONNECTIONS * 2 * (1000 / 500)} cmds/s (poll versão 500ms)`,
      rankingGets: spectatorResult.count + sustained.count,
    },
    finishedAt: new Date().toISOString(),
  };

  console.log("\n=== RELATÓRIO ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
