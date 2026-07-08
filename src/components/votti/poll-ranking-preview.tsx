import { LiveDot } from "@/components/ui-kit";
import { LivePollBar, optionStackZ } from "@/components/votti/live-poll-bar";
import type { PollQuestion } from "@/lib/votti/poll-types";

type PollRankingPreviewProps = {
  title?: string;
  question: PollQuestion;
  primaryColor?: string;
  compact?: boolean;
  featured?: boolean;
  hideTitle?: boolean;
  live?: boolean;
  /** Ordena opções por votos (maior primeiro) no ranking ao vivo. */
  sortByVotes?: boolean;
};

export function PollRankingPreview({
  title,
  question,
  primaryColor = "#4F8FD9",
  compact = false,
  featured = false,
  hideTitle = false,
  live = true,
  sortByVotes = false,
}: PollRankingPreviewProps) {
  const options = question.options.filter((o) => o.text.trim());
  if (options.length === 0) return null;

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  const hasVotes = totalVotes > 0;
  const maxVotes = Math.max(...options.map((o) => o.votes), 0);

  const displayOptions = sortByVotes
    ? [...options].sort((a, b) => b.votes - a.votes || a.text.localeCompare(b.text))
    : options;

  return (
    <article
      className={`poll-ranking-preview ${compact ? "poll-ranking-preview--compact" : ""} ${featured ? "poll-ranking-preview--featured" : ""} ${!hasVotes ? "poll-ranking-preview--zero" : ""}`}
    >
      {!featured ? (
        <div className="poll-ranking-preview__head">
          {live ? <LiveDot /> : null}
          {!hideTitle ? (
            <h3 className="poll-ranking-preview__title">{title || "Sua votação"}</h3>
          ) : null}
          <span className="poll-ranking-preview__votes tabular-nums">
            {hasVotes ? `${totalVotes} votos` : "0 votos"}
          </span>
        </div>
      ) : live ? (
        <div className="poll-ranking-preview__featured-live">
          <LiveDot />
          <span>Ao vivo</span>
          <span className="poll-ranking-preview__featured-count tabular-nums">
            {hasVotes ? `${totalVotes} votos` : "0 votos"}
          </span>
        </div>
      ) : null}

      <p className="poll-ranking-preview__question">{question.text || "Pergunta principal"}</p>

      <div className="poll-ranking-preview__bars">
        {displayOptions.map((opt) => {
          const pct = hasVotes ? Math.round((opt.votes / totalVotes) * 100) : 0;
          const isLeader = hasVotes && opt.votes === maxVotes && maxVotes > 0;
          return (
            <LivePollBar
              key={opt.id}
              option={opt}
              pct={pct}
              hasVotes={hasVotes}
              isLeader={isLeader}
              primaryColor={primaryColor}
              featured={featured}
              stackZ={optionStackZ(pct, opt.votes, hasVotes)}
            />
          );
        })}
      </div>

      {live && !featured ? (
        <p className="poll-ranking-preview__status">
          {hasVotes ? "Ranking ao vivo — atualiza sozinho" : "Aguardando o primeiro voto…"}
        </p>
      ) : null}
    </article>
  );
}
