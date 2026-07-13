import type { PollRankingState } from "@/lib/votti/ranking/types";
import type { StoredPoll } from "@/lib/votti/poll-types";
import { DEFAULT_SETTINGS } from "@/lib/votti/poll-types";
import { normalizeImageUrl } from "@/lib/votti/persist-image-url";

export type PollMetaResponse = {
  slug: string;
  pollId: string;
  title: string;
  description: string;
  primaryColor: string;
  coverUrl: string;
  logoUrl: string;
  status: "active" | "closed";
  questions: {
    id: string;
    text: string;
    options: { id: string; text: string; imageUrl: string }[];
  }[];
};

export type PollRankingLiveStatus = "connecting" | "live" | "error" | "idle";

export async function fetchPollMeta(slug: string): Promise<PollMetaResponse | null> {
  const res = await fetch(`/api/polls/${encodeURIComponent(slug)}/meta`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Falha ao carregar votação.");

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Resposta inválida do servidor.");
  }

  return (await res.json()) as PollMetaResponse;
}

export async function fetchVoterHasVoted(slug: string, voterToken: string): Promise<boolean> {
  const token = voterToken.trim();
  if (!token) return false;

  try {
    const res = await fetch(
      `/api/polls/${encodeURIComponent(slug)}/voter-status?token=${encodeURIComponent(token)}`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { voted?: boolean };
    return Boolean(data.voted);
  } catch {
    return false;
  }
}

export function pollMetaToStoredPoll(meta: PollMetaResponse): StoredPoll {
  return {
    id: meta.pollId,
    slug: meta.slug,
    ownerId: "",
    ownerEmail: "",
    title: meta.title,
    description: meta.description,
    category: "",
    logoUrl: meta.logoUrl,
    coverUrl: meta.coverUrl,
    primaryColor: meta.primaryColor,
    questions: meta.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text,
        votes: 0,
        imageUrl: o.imageUrl,
      })),
    })),
    settings: DEFAULT_SETTINGS,
    status: meta.status,
    createdAt: new Date().toISOString(),
    participantCount: 0,
    registeredVotes: 0,
  };
}

export function pollMetaToRankingState(meta: PollMetaResponse): PollRankingState {
  const poll = pollMetaToStoredPoll(meta);
  return {
    slug: poll.slug,
    pollId: poll.id,
    version: Date.now(),
    updatedAt: new Date().toISOString(),
    participantCount: 0,
    registeredVotes: 0,
    meta: {
      title: poll.title,
      description: poll.description,
      primaryColor: poll.primaryColor,
      coverUrl: poll.coverUrl,
      logoUrl: poll.logoUrl,
      status: poll.status,
    },
    questions: poll.questions,
  };
}

async function readPollRankingResponse(res: Response): Promise<PollRankingState | null> {
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Falha ao carregar ranking.");

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Resposta inválida do servidor de ranking.");
  }

  return (await res.json()) as PollRankingState;
}

async function enrichRankingState(slug: string, data: PollRankingState): Promise<PollRankingState> {
  const coverUrl = normalizeImageUrl(data.meta.coverUrl);
  const logoUrl = normalizeImageUrl(data.meta.logoUrl);
  if (coverUrl) {
    if (coverUrl === data.meta.coverUrl && logoUrl === data.meta.logoUrl) return data;
    return {
      ...data,
      meta: { ...data.meta, coverUrl, logoUrl: logoUrl || data.meta.logoUrl },
    };
  }

  const meta = await fetchPollMeta(slug);
  if (!meta) return data;

  const metaCover = normalizeImageUrl(meta.coverUrl);
  const metaLogo = normalizeImageUrl(meta.logoUrl);
  if (!metaCover && !metaLogo) return data;

  return {
    ...data,
    meta: {
      ...data.meta,
      coverUrl: metaCover || data.meta.coverUrl,
      logoUrl: metaLogo || data.meta.logoUrl,
    },
  };
}

export async function fetchPollRanking(slug: string): Promise<PollRankingState | null> {
  const rankingUrl = `/ranking/${encodeURIComponent(slug)}`;
  const headers = { accept: "application/json" };

  try {
    let data = await readPollRankingResponse(
      await fetch(rankingUrl, { cache: "no-store", headers }),
    );

    if (!data) {
      await refreshPollSnapshot(slug);
      data = await readPollRankingResponse(
        await fetch(rankingUrl, { cache: "no-store", headers }),
      );
    }

    if (data) return enrichRankingState(slug, data);
  } catch {
    /* tenta meta abaixo */
  }

  const meta = await fetchPollMeta(slug);
  return meta ? enrichRankingState(slug, pollMetaToRankingState(meta)) : null;
}

/** Atualiza snapshot após voto confirmado. */
export async function refreshPollSnapshot(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/polls/${encodeURIComponent(slug)}/refresh-snapshot`, {
      method: "POST",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function rankingStateToStoredPoll(state: PollRankingState): StoredPoll {
  return {
    id: state.pollId,
    slug: state.slug,
    ownerId: "",
    ownerEmail: "",
    title: state.meta.title,
    description: state.meta.description,
    category: "",
    logoUrl: state.meta.logoUrl,
    coverUrl: state.meta.coverUrl,
    primaryColor: state.meta.primaryColor,
    questions: state.questions,
    settings: {
      oneVotePerPerson: true,
      showResultBeforeVote: false,
      showResultAfterVote: true,
      autoClose: false,
      closeAt: "",
      closeMode: "until_admin",
      backgroundColor: "#0f1729",
      buttonColor: state.meta.primaryColor,
      themePreset: "votti-blue",
    },
    status: state.meta.status,
    createdAt: state.updatedAt,
    participantCount: state.participantCount,
    registeredVotes: state.registeredVotes,
  };
}
