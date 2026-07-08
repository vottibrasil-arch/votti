import { Link } from "@tanstack/react-router";
import { BarChart3, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";
import { SecurityBadge } from "@/components/votti/security-badge";
import { LiveDot } from "@/components/ui-kit";
import {
  castVote,
  getPollBySlug,
  getPollErrorMessage,
} from "@/lib/votti/poll-store";
import type { PollQuestion, StoredPoll } from "@/lib/votti/poll-types";
import { usePollRealtime } from "@/lib/votti/use-poll-realtime";
import {
  getOrCreateVoterToken,
  hasVotedQuestion,
  markQuestionVoted,
} from "@/lib/votti/voter-session";

type PollVoteScreenProps = {
  slug: string;
};

export function PollVoteScreen({ slug }: PollVoteScreenProps) {
  const [poll, setPoll] = useState<StoredPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [votingKey, setVotingKey] = useState<string | null>(null);
  const [voteError, setVoteError] = useState("");
  const [votedTick, setVotedTick] = useState(0);

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

  const { status } = usePollRealtime({
    pollId: poll?.id,
    enabled: Boolean(poll?.id),
    onRefresh: refreshPoll,
  });

  async function handleVote(question: PollQuestion, optionId: string) {
    if (!poll || poll.status !== "active") return;
    if (hasVotedQuestion(slug, question.id)) return;

    const key = `${question.id}:${optionId}`;
    setVoteError("");
    setVotingKey(key);

    try {
      const token = getOrCreateVoterToken(slug);
      await castVote(slug, question.id, optionId, token);
      markQuestionVoted(slug, question.id);
      setVotedTick((t) => t + 1);
      await refreshPoll();
    } catch (err) {
      setVoteError(getPollErrorMessage(err));
    } finally {
      setVotingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="votti-vote-page flex-1 flex items-center justify-center px-5">
        <p className="votti-app-muted">Carregando votação…</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="votti-vote-page flex-1 flex items-center justify-center px-5 text-center">
        <div className="votti-quest max-w-sm w-full">
          <p className="votti-quest__label">Ops</p>
          <h1 className="votti-quest__title">Votação não encontrada</h1>
          <p className="votti-quest__hint">{error || "Este link pode estar errado ou a votação foi encerrada."}</p>
          <Link to="/" className="votti-mega-btn votti-mega-btn--sm mt-6">
            IR PARA O VOTTI
          </Link>
        </div>
      </div>
    );
  }

  const liveLabel =
    status === "connected" ? "ao vivo" : status === "connecting" ? "conectando…" : "atualizando";
  const closed = poll.status === "closed";

  return (
    <div className="votti-vote-page flex-1 px-5 pb-10 max-w-lg mx-auto w-full">
      <div className="votti-vote-hero animate-rise">
        {poll.coverUrl ? (
          <img src={poll.coverUrl} alt="" className="votti-vote-hero__cover" />
        ) : (
          <div
            className="votti-vote-hero__cover votti-vote-hero__cover--empty"
            style={{ background: `linear-gradient(135deg, ${poll.primaryColor}, oklch(0.28 0.08 260))` }}
          />
        )}
        <div className="votti-vote-hero__body">
          <div className="votti-vote-hero__trust">
            <SecurityBadge compact />
            <span className="votti-vote-hero__live">
              <LiveDot />
              {liveLabel}
            </span>
          </div>
          <div className="votti-vote-hero__meta">
            {poll.logoUrl ? (
              <img src={poll.logoUrl} alt="" className="votti-vote-hero__logo" />
            ) : null}
            <div>
              <h1 className="votti-vote-hero__title" style={{ color: poll.primaryColor }}>
                {poll.title}
              </h1>
              {poll.description ? <p className="votti-vote-hero__desc">{poll.description}</p> : null}
            </div>
          </div>
          <p className="votti-vote-hero__votes tabular-nums">
            {poll.totalVotes} voto{poll.totalVotes === 1 ? "" : "s"} · ranking {liveLabel}
          </p>
        </div>
      </div>

      {closed ? (
        <div className="votti-vote-closed animate-rise">
          <p>Esta votação foi encerrada.</p>
          <Link to="/votacao/$slug/resultados" params={{ slug }} className="votti-mega-btn votti-mega-btn--sm mt-4">
            <BarChart3 className="size-4" /> Ver resultados finais
          </Link>
        </div>
      ) : (
        <div className="votti-vote-stack">
          {poll.questions.map((question, qi) => {
            const voted = hasVotedQuestion(slug, question.id);
            const showResults =
              poll.settings.showResultBeforeVote ||
              (voted && poll.settings.showResultAfterVote);

            return (
              <section key={question.id} className="votti-vote-question animate-rise">
                <div className="votti-vote-question__head">
                  <span className="votti-question-card__badge">Pergunta {qi + 1}</span>
                  {voted ? (
                    <span className="votti-vote-question__done">
                      <CheckCircle2 className="size-3.5" /> Voto confirmado
                    </span>
                  ) : null}
                </div>
                <h2 className="votti-vote-question__title">{question.text || "Pergunta"}</h2>

                {showResults ? (
                  <PollRankingPreview
                    title={poll.title}
                    question={question}
                    primaryColor={poll.primaryColor}
                    compact
                    live
                  />
                ) : voted ? (
                  <div className="votti-vote-thanks">
                    <CheckCircle2 className="size-6 text-[oklch(0.72_0.18_145)]" />
                    <p>Seu voto foi registrado com segurança.</p>
                  </div>
                ) : (
                  <div className="votti-vote-options">
                    {question.options
                      .filter((o) => o.text.trim())
                      .map((option) => {
                        const key = `${question.id}:${option.id}`;
                        const busy = votingKey === key;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className="votti-vote-option"
                            style={{ "--vote-accent": poll.primaryColor } as CSSProperties}
                            disabled={Boolean(votingKey)}
                            onClick={() => void handleVote(question, option.id)}
                          >
                            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                            <span>{option.text}</span>
                          </button>
                        );
                      })}
                  </div>
                )}

                {voteError && !voted ? <p className="votti-auth__error mt-3">{voteError}</p> : null}
              </section>
            );
          })}
        </div>
      )}

      <div className="votti-vote-footer animate-rise" key={votedTick}>
        <Link to="/votacao/$slug/resultados" params={{ slug }} className="votti-outline-btn w-full">
          <BarChart3 className="size-4" /> Ver ranking ao vivo
        </Link>
        <p className="votti-vote-footer__hint">Compartilhe este link — cada voto atualiza o ranking na hora.</p>
      </div>
    </div>
  );
}
