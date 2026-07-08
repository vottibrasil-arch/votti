import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PollPublicShell } from "@/components/votti/poll-public-shell";
import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";
import { PollSharePanel } from "@/components/votti/poll-share-panel";
import { SecurityBadge } from "@/components/votti/security-badge";
import { formatPollStats } from "@/lib/votti/poll-stats";
import { getPollBySlug, getPollErrorMessage, voterHasCompletedPoll } from "@/lib/votti/poll-store";
import { getPollCoverUrl } from "@/lib/votti/poll-types";
import type { StoredPoll } from "@/lib/votti/poll-types";
import { usePollRealtime } from "@/lib/votti/use-poll-realtime";
import { isPollLockedForVoter } from "@/lib/votti/voter-session";

type ResultadosSearch = {
  confirmado?: string;
};

export const Route = createFileRoute("/votacao/$slug/resultados")({
  validateSearch: (search: Record<string, unknown>): ResultadosSearch => ({
    confirmado: typeof search.confirmado === "string" ? search.confirmado : undefined,
  }),
  head: () => ({ meta: [{ title: "VOTTI — Ranking ao vivo" }] }),
  component: ResultadosPage,
});

function ResultadosPage() {
  const { slug } = Route.useParams();
  const { confirmado } = Route.useSearch();
  const [poll, setPoll] = useState<StoredPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [justVoted, setJustVoted] = useState(confirmado === "1");

  const refreshPoll = useCallback(async () => {
    try {
      const data = await getPollBySlug(slug);
      setPoll(data);
      setError(data ? "" : "Votação não encontrada.");
    } catch (err) {
      setError(getPollErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refreshPoll();
  }, [refreshPoll]);

  useEffect(() => {
    if (confirmado === "1" || isPollLockedForVoter(slug)) {
      setJustVoted(true);
      return;
    }
    void voterHasCompletedPoll(slug).then(setJustVoted);
  }, [slug, confirmado]);

  const { status } = usePollRealtime({
    pollId: poll?.id,
    enabled: Boolean(poll?.id),
    onRefresh: refreshPoll,
  });

  if (loading) {
    return (
      <div className="votti-vote-page flex-1 flex items-center justify-center px-5">
        <p className="votti-app-muted">Carregando ranking…</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="votti-vote-page flex-1 flex items-center justify-center px-5">
        <p className="votti-app-muted">{error || "Votação não encontrada."}</p>
      </div>
    );
  }

  const liveConnected = status === "connected";
  const liveLabel = liveConnected
    ? "AO VIVO"
    : status === "connecting"
      ? "CONECTANDO…"
      : "ATUALIZANDO…";
  const coverUrl = getPollCoverUrl(poll);

  return (
    <PollPublicShell poll={poll} coverStyle="minimal">
      <div className="votti-results-page flex-1 px-4 pb-6 max-w-lg mx-auto w-full">
        {justVoted ? (
          <div className="votti-vote-success-banner votti-vote-success-banner--compact animate-rise">
            <CheckCircle2 className="size-4" />
            <span>Voto confirmado!</span>
          </div>
        ) : null}

        <div className="votti-results-hero animate-rise">
          {coverUrl ? (
            <div
              className="votti-results-hero__cover"
              style={{ backgroundImage: `url(${coverUrl})` }}
              aria-hidden
            />
          ) : (
            <div className="votti-results-hero__cover votti-results-hero__cover--accent" aria-hidden />
          )}

          <div className="votti-results-hero__body">
            <div className="votti-results-hero__meta">
              <SecurityBadge compact />
              <span
                className={`votti-results-hero__live ${liveConnected ? "votti-results-hero__live--on" : "votti-results-hero__live--sync"}`}
              >
                <span className="votti-results-hero__live-dot" aria-hidden />
                {liveLabel}
              </span>
            </div>
            <h1 className="votti-results-hero__title">{poll.title}</h1>
            <p className="votti-results-hero__stats tabular-nums">{formatPollStats(poll)}</p>
          </div>
        </div>

        <div className="votti-results-official animate-rise">
          {poll.questions.map((q) => (
            <section key={q.id}>
              <PollRankingPreview
                question={q}
                primaryColor={poll.primaryColor}
                featured
                hideTitle
                hideFeaturedLive
                live={false}
                sortByVotes
              />
            </section>
          ))}
        </div>

        <PollSharePanel slug={slug} title={poll.title} variant="footer" />
      </div>
    </PollPublicShell>
  );
}
