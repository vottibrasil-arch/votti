import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PollPublicShell } from "@/components/votti/poll-public-shell";
import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";
import { PollSharePanel } from "@/components/votti/poll-share-panel";
import { SecurityBadge } from "@/components/votti/security-badge";
import { LiveDot } from "@/components/ui-kit";
import { getPollBySlug, getPollErrorMessage, voterHasCompletedPoll } from "@/lib/votti/poll-store";
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

function participantLabel(count: number) {
  if (count === 0) return "Nenhuma pessoa votou ainda";
  if (count === 1) return "1 pessoa votou";
  return `${count} pessoas votaram`;
}

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

  const liveLabel =
    status === "connected" ? "ao vivo" : status === "connecting" ? "conectando…" : "atualizando";

  return (
    <PollPublicShell poll={poll}>
      <div className="votti-vote-page flex-1 px-5 pb-10 max-w-lg mx-auto w-full">
        {justVoted ? (
          <div className="votti-vote-success-banner animate-rise">
            <CheckCircle2 className="size-5" />
            <span>Voto confirmado — ranking atualizado!</span>
          </div>
        ) : null}

        <div className="votti-vote-hero votti-vote-hero--branded votti-vote-hero--compact animate-rise">
          {poll.coverUrl ? (
            <img src={poll.coverUrl} alt="" className="votti-vote-hero__cover" />
          ) : (
            <div className="votti-vote-hero__cover votti-vote-hero__cover--accent" />
          )}
          <div className="votti-vote-hero__body">
            <div className="votti-vote-hero__trust">
              <SecurityBadge compact />
              <span className="votti-vote-hero__live">
                <LiveDot />
                Ranking {liveLabel}
              </span>
            </div>
            <div className="votti-vote-hero__meta">
              {poll.logoUrl ? (
                <img src={poll.logoUrl} alt="" className="votti-vote-hero__logo" />
              ) : (
                <div className="votti-vote-hero__logo votti-vote-hero__logo--accent" />
              )}
              <div>
                <h1 className="votti-vote-hero__title">{poll.title}</h1>
                <p className="votti-vote-hero__votes tabular-nums">{participantLabel(poll.totalVotes)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="votti-results__stack">
          {poll.questions.map((q) => (
            <section key={q.id} className="votti-results__block animate-rise">
              <PollRankingPreview
                title={poll.title}
                question={q}
                primaryColor={poll.primaryColor}
                live
              />
            </section>
          ))}
        </div>

        <PollSharePanel slug={slug} title={poll.title} />
      </div>
    </PollPublicShell>
  );
}
