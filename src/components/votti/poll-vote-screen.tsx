import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PollCoverHero } from "@/components/votti/poll-cover-hero";
import { PollPublicShell } from "@/components/votti/poll-public-shell";
import { SecurityBadge } from "@/components/votti/security-badge";
import { LiveDot } from "@/components/ui-kit";
import {
  confirmVotes,
  getPollBySlug,
  getPollErrorMessage,
  voterHasCompletedPoll,
} from "@/lib/votti/poll-store";
import type { PollQuestion, StoredPoll } from "@/lib/votti/poll-types";
import { usePollRealtime } from "@/lib/votti/use-poll-realtime";
import {
  confirmPollForVoter,
  getOrCreateVoterToken,
  getPendingSelections,
  isPollLockedForVoter,
  setPendingSelection,
} from "@/lib/votti/voter-session";

type PollVoteScreenProps = {
  slug: string;
};

export function PollVoteScreen({ slug }: PollVoteScreenProps) {
  const navigate = useNavigate();
  const [poll, setPoll] = useState<StoredPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [voteError, setVoteError] = useState("");
  const [selections, setSelections] = useState<Record<string, string>>(() =>
    getPendingSelections(slug),
  );

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
    if (!poll || poll.status !== "active") return;

    let cancelled = false;

    void voterHasCompletedPoll(slug).then((completed) => {
      if (!cancelled && completed) {
        navigate({ to: "/votacao/$slug/resultados", params: { slug }, replace: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [poll, slug, navigate]);

  const { status } = usePollRealtime({
    pollId: poll?.id,
    enabled: Boolean(poll?.id),
    onRefresh: refreshPoll,
  });

  function handleSelect(question: PollQuestion, optionId: string) {
    if (!poll || poll.status !== "active" || isPollLockedForVoter(slug)) return;
    setVoteError("");
    setPendingSelection(slug, question.id, optionId);
    setSelections((current) => ({ ...current, [question.id]: optionId }));
  }

  async function handleConfirm() {
    if (!poll || poll.status !== "active" || isPollLockedForVoter(slug)) return;

    const activeQuestions = poll.questions.filter((q) => q.options.some((o) => o.text.trim()));
    const missing = activeQuestions.filter((q) => !selections[q.id]);
    if (missing.length > 0) {
      setVoteError("Responda todas as perguntas antes de confirmar.");
      return;
    }

    setVoteError("");
    setConfirming(true);

    try {
      const token = getOrCreateVoterToken(slug);
      const payload = activeQuestions.map((q) => ({
        questionId: q.id,
        optionId: selections[q.id],
      }));
      await confirmVotes(slug, payload, token);
      confirmPollForVoter(slug);
      navigate({
        to: "/votacao/$slug/resultados",
        params: { slug },
        search: { confirmado: "1" },
        replace: true,
      });
    } catch (err) {
      setVoteError(getPollErrorMessage(err));
      setConfirming(false);
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
  const activeQuestions = poll.questions.filter((q) => q.options.some((o) => o.text.trim()));
  const allAnswered = activeQuestions.every((q) => Boolean(selections[q.id]));

  return (
    <PollPublicShell poll={poll}>
      <div className="votti-vote-page flex-1 px-5 pb-10 max-w-lg mx-auto w-full">
        <PollCoverHero poll={poll}>
          <div className="votti-vote-hero__trust">
            <SecurityBadge compact />
            <span className="votti-vote-hero__live">
              <LiveDot />
              {liveLabel}
            </span>
          </div>
          <h1 className="votti-vote-hero__title">{poll.title}</h1>
          {poll.description ? <p className="votti-vote-hero__desc">{poll.description}</p> : null}
        </PollCoverHero>

        {closed ? (
          <div className="votti-vote-closed animate-rise">
            <p>Esta votação foi encerrada.</p>
            <Link to="/votacao/$slug/resultados" params={{ slug }} className="votti-mega-btn votti-mega-btn--sm mt-4">
              <BarChart3 className="size-4" /> Ver ranking final
            </Link>
          </div>
        ) : (
          <>
            <div className="votti-vote-stack">
              {activeQuestions.map((question, qi) => (
                <section key={question.id} className="votti-vote-question votti-vote-question--branded animate-rise">
                  <div className="votti-vote-question__head">
                    <span className="votti-question-card__badge">
                      {activeQuestions.length > 1
                        ? `Pergunta ${qi + 1} de ${activeQuestions.length}`
                        : "Escolha sua opção"}
                    </span>
                  </div>
                  <h2 className="votti-vote-question__title">{question.text || "Pergunta"}</h2>

                  <div className="votti-vote-options">
                    {question.options
                      .filter((o) => o.text.trim())
                      .map((option) => {
                        const selected = selections[question.id] === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`votti-vote-option votti-vote-option--branded ${selected ? "votti-vote-option--selected" : ""}`}
                            disabled={confirming}
                            onClick={() => handleSelect(question, option.id)}
                          >
                            {selected ? <Check className="size-4" /> : null}
                            <span>{option.text}</span>
                          </button>
                        );
                      })}
                  </div>
                </section>
              ))}
            </div>

            {voteError ? <p className="votti-auth__error mt-3">{voteError}</p> : null}

            <div className="votti-vote-footer animate-rise">
              <button
                type="button"
                className="votti-mega-btn votti-mega-btn--sm w-full max-w-none"
                disabled={!allAnswered || confirming}
                onClick={() => void handleConfirm()}
              >
                {confirming ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Confirmando…
                  </>
                ) : (
                  <>
                    <Check className="size-4" /> Confirmar votação
                  </>
                )}
              </button>
              {!allAnswered ? (
                <p className="votti-vote-footer__hint">
                  Responda {activeQuestions.length > 1 ? "todas as perguntas" : "a pergunta"} para confirmar.
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </PollPublicShell>
  );
}

