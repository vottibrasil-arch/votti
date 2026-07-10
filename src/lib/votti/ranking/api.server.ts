import { buildPollMetaFromDb } from "@/lib/votti/ranking/poll-meta.server";
import {
  getStoredSnapshot,
  refreshRankingSnapshot,
} from "@/lib/votti/ranking/snapshot.server";
import type { PollRankingState } from "@/lib/votti/ranking/types";

const CACHE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, s-maxage=1, stale-while-revalidate=2",
  "cdn-cache-control": "public, s-maxage=1, stale-while-revalidate=2",
};

const NO_STORE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function jsonResponse(body: unknown, status = 200, headers = NO_STORE_HEADERS): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function rankingResponse(payload: PollRankingState): Response {
  return jsonResponse(payload, 200, CACHE_HEADERS);
}

function parseRankingSlug(pathname: string): string | null {
  const prefix = "/ranking/";
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length).split("/")[0]?.trim();
  return slug || null;
}

async function handleGetRanking(slug: string): Promise<Response> {
  try {
    let snapshot = await getStoredSnapshot(slug);
    if (!snapshot) {
      snapshot = await refreshRankingSnapshot(slug);
    }
    if (!snapshot) {
      return jsonResponse({ error: "Votação não encontrada." }, 404);
    }
    return rankingResponse(snapshot);
  } catch (err) {
    console.error("[votti-ranking] GET /ranking failed", slug, err);
    return jsonResponse({ error: "Falha ao carregar ranking." }, 500);
  }
}

async function handleGetMeta(slug: string): Promise<Response> {
  try {
    const poll = await buildPollMetaFromDb(slug);
    if (!poll) return jsonResponse({ error: "Votação não encontrada." }, 404);

    return jsonResponse({
      slug: poll.slug,
      pollId: poll.id,
      title: poll.title,
      description: poll.description,
      primaryColor: poll.primaryColor,
      coverUrl: poll.coverUrl,
      logoUrl: poll.logoUrl,
      status: poll.status,
      questions: poll.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options.map((o) => ({ id: o.id, text: o.text, imageUrl: o.imageUrl })),
      })),
    });
  } catch (err) {
    console.error("[votti-ranking] GET meta failed", slug, err);
    return jsonResponse({ error: "Falha ao carregar votação." }, 500);
  }
}

async function handleRefreshSnapshot(slug: string): Promise<Response> {
  try {
    const snapshot = await refreshRankingSnapshot(slug);
    if (!snapshot) return jsonResponse({ error: "Votação não encontrada." }, 404);
    return jsonResponse({ ok: true, slug, updatedAt: snapshot.updatedAt });
  } catch (err) {
    console.error("[votti-ranking] refresh-snapshot failed", slug, err);
    return jsonResponse({ error: "Falha ao atualizar snapshot." }, 500);
  }
}

function parsePollApiSlug(pathname: string, suffix: string): string | null {
  const prefix = "/api/polls/";
  if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) return null;
  const slug = pathname.slice(prefix.length, pathname.length - suffix.length);
  return slug.trim() || null;
}

export async function handleRankingApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;

  const rankingSlug = parseRankingSlug(pathname);
  if (rankingSlug && request.method === "GET") {
    return handleGetRanking(rankingSlug);
  }

  const refreshSlug = parsePollApiSlug(pathname, "/refresh-snapshot");
  if (refreshSlug && request.method === "POST") {
    return handleRefreshSnapshot(refreshSlug);
  }

  const metaSlug = parsePollApiSlug(pathname, "/meta");
  if (metaSlug && request.method === "GET") {
    return handleGetMeta(metaSlug);
  }

  if (pathname.startsWith("/api/polls/") || pathname.startsWith("/api/internal/")) {
    return jsonResponse({ error: "Rota não encontrada." }, 404);
  }

  return null;
}
