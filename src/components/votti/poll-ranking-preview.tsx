import { PollLiveBadge } from "@/components/votti/poll-live-badge";
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
  /** Esconde faixa "Ao vivo" dentro do card (usado quando o cabeçalho da página já mostra). */
  hideFeaturedLive?: boolean;
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
  hideFeaturedLive = false,
}: PollRankingPreviewProps) {
  const options = question.options.filter((o) => o.text.trim());
  if (options.length === 0) return null;

  const totalVotes = options.reduce((sum, o) => sum + Number(o.votes), 0);
  const hasVotes = totalVotes > 0;
  const maxVotes = Math.max(...options.map((o) => Number(o.votes)), 0);

  const displayOptions = sortByVotes
    ? [...options].sort(
        (a, b) => Number(b.votes) - Number(a.votes) || a.text.localeCompare(b.text, "pt-BR"),
      )
    : options;

  return (
    <article
      className={`poll-ranking-preview ${compact ? "poll-ranking-preview--compact" : ""} ${featured ? "poll-ranking-preview--featured" : ""} ${featured && sortByVotes ? "poll-ranking-preview--official" : ""} ${!hasVotes ? "poll-ranking-preview--zero" : ""}`}
    >
      {!featured ? (
        <div className="poll-ranking-preview__head">
          {live ? <PollLiveBadge /> : null}
          {!hideTitle ? (
            <h3 className="poll-ranking-preview__title">{title || "Sua votação"}</h3>
          ) : null}
          <span className="poll-ranking-preview__votes tabular-nums">
            {hasVotes ? `${totalVotes} votos` : "0 votos"}
          </span>
        </div>
      ) : live && !hideFeaturedLive ? (
        <div className="poll-ranking-preview__featured-live">
          <PollLiveBadge />
          <span className="poll-ranking-preview__featured-count tabular-nums">
            {hasVotes ? `${totalVotes} votos` : "0 votos"}
          </span>
        </div>
      ) : featured && !hideFeaturedLive ? (
        <span className="poll-ranking-preview__featured-count poll-ranking-preview__featured-count--solo tabular-nums">
          {hasVotes ? `${totalVotes} votos` : "0 votos"}
        </span>
      ) : null}

      <p className="poll-ranking-preview__question">{question.text || "Pergunta principal"}</p>

      <div className="poll-ranking-preview__bars">
        {displayOptions.map((opt, rankIndex) => {
          const votes = Number(opt.votes);
          const pct = hasVotes ? Math.round((votes / totalVotes) * 100) : 0;
          const isLeader = hasVotes && votes === maxVotes && maxVotes > 0;
          const stackZ =
            sortByVotes && hasVotes
              ? (displayOptions.length - rankIndex) * 1000 + pct
              : optionStackZ(pct, votes, hasVotes);
          return (
            <LivePollBar
              key={opt.id}
              option={{ ...opt, votes }}
              pct={pct}
              hasVotes={hasVotes}
              isLeader={isLeader}
              primaryColor={primaryColor}
              featured={featured}
              stackZ={stackZ}
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
