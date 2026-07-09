import type { PollRankingState } from "@/lib/votti/ranking/types";
import type { StoredPoll } from "@/lib/votti/poll-types";
import { DEFAULT_SETTINGS } from "@/lib/votti/poll-types";

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

export async function fetchPollRanking(slug: string): Promise<PollRankingState | null> {
  const res = await fetch(`/ranking/${encodeURIComponent(slug)}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Falha ao carregar ranking.");

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Resposta inválida do servidor de ranking.");
  }

  return (await res.json()) as PollRankingState;
}

/** Atualiza snapshot após voto confirmado (substitui webhook). */
export async function refreshPollSnapshot(slug: string): Promise<void> {
  try {
    await fetch(`/api/polls/${encodeURIComponent(slug)}/refresh-snapshot`, {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    /* best-effort — telão atualiza no próximo poll */
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
