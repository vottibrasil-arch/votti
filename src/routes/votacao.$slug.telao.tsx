import { createFileRoute } from "@tanstack/react-router";
import { useMemo, type CSSProperties } from "react";
import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";
import { LiveDot } from "@/components/ui-kit";
import { formatPollStats } from "@/lib/votti/poll-stats";
import { rankingStateToStoredPoll } from "@/lib/votti/ranking/client";
import { usePollRankingLive } from "@/lib/votti/use-poll-ranking-live";

export const Route = createFileRoute("/votacao/$slug/telao")({
  head: () => ({ meta: [{ title: "VOTTI — Modo Telão" }] }),
  component: TelaoPage,
});

function TelaoPage() {
  const { slug } = Route.useParams();
  const { state, status, error } = usePollRankingLive({
    slug,
  });

  const poll = useMemo(() => (state ? rankingStateToStoredPoll(state) : null), [state]);

  if (status === "connecting" && !poll) {
    return (
      <div className="votti-telao votti-telao--loading">
        <p>Carregando ranking…</p>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="votti-telao votti-telao--loading">
        <p>{error || "Votação não encontrada."}</p>
      </div>
    );
  }

  const liveLabel =
    status === "live"
      ? "ao vivo"
      : status === "connecting"
        ? "conectando…"
        : "atualizando";

  return (
    <div
      className="votti-telao"
      style={
        {
          "--votti-brand": poll.primaryColor,
        } as CSSProperties
      }
    >
      <header className="votti-telao__header">
        <div className="votti-telao__brand">
          <div>
            <h1 className="votti-telao__title">{poll.title}</h1>
            {poll.description ? <p className="votti-telao__desc">{poll.description}</p> : null}
          </div>
        </div>
        <div className="votti-telao__meta">
          <span className="votti-telao__live">
            <LiveDot />
            Ranking {liveLabel}
          </span>
          <p className="votti-telao__votes tabular-nums">{formatPollStats(poll)}</p>
        </div>
      </header>

      <div className="votti-telao__stack">
        {poll.questions.map((question) => (
          <section key={question.id} className="votti-telao__block">
            <PollRankingPreview
              title={poll.title}
              question={question}
              primaryColor={poll.primaryColor}
              live
            />
          </section>
        ))}
      </div>
    </div>
  );
}
