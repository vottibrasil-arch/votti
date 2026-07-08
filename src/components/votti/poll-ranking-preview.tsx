import { LiveDot } from "@/components/ui-kit";
import type { PollQuestion } from "@/lib/votti/poll-types";

type PollRankingPreviewProps = {
  title?: string;
  question: PollQuestion;
  primaryColor?: string;
  compact?: boolean;
  featured?: boolean;
  hideTitle?: boolean;
  live?: boolean;
};

export function PollRankingPreview({
  title,
  question,
  primaryColor = "#4F8FD9",
  compact = false,
  featured = false,
  hideTitle = false,
  live = true,
}: PollRankingPreviewProps) {
  const options = question.options.filter((o) => o.text.trim());
  if (options.length === 0) return null;

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  const hasVotes = totalVotes > 0;
  const maxVotes = Math.max(...options.map((o) => o.votes), 0);

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
        {options.map((opt) => {
          const pct = hasVotes ? Math.round((opt.votes / totalVotes) * 100) : 0;
          const isLeader = hasVotes && opt.votes === maxVotes && maxVotes > 0;
          return (
            <div key={opt.id} className="live-poll-bar">
              <div className="live-poll-bar__meta">
                <span className="live-poll-bar__label">
                  {isLeader ? "🥇 " : ""}
                  {opt.text}
                </span>
                <span className={`live-poll-bar__pct tabular-nums ${isLeader ? "live-poll-bar__pct--lead" : ""}`}>
                  {hasVotes ? `${opt.votes} · ${pct}%` : "0 votos"}
                </span>
              </div>
              <div className="live-poll-bar__track">
                <div
                  className={`live-poll-bar__fill ${isLeader ? "live-poll-bar__fill--lead" : ""} ${!hasVotes ? "live-poll-bar__fill--zero" : ""}`}
                  style={{
                    width: hasVotes ? `${pct}%` : "0%",
                    ...(isLeader ? { background: primaryColor } : {}),
                  }}
                />
              </div>
            </div>
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
