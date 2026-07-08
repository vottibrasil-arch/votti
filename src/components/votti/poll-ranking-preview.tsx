import { LiveDot } from "@/components/ui-kit";
import type { PollQuestion } from "@/lib/votti/poll-types";

type PollRankingPreviewProps = {
  title: string;
  question: PollQuestion;
  primaryColor?: string;
  totalVotes?: number;
  compact?: boolean;
  live?: boolean;
};

function demoPercentages(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [100];
  if (count === 2) return [58, 42];
  if (count === 3) return [45, 32, 23];
  const base = Math.floor(100 / count);
  const rest = 100 - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < rest ? 1 : 0));
}

export function PollRankingPreview({
  title,
  question,
  primaryColor = "#4F8FD9",
  totalVotes = 0,
  compact = false,
  live = true,
}: PollRankingPreviewProps) {
  const options = question.options.filter((o) => o.text.trim());
  if (options.length === 0) return null;

  const total = options.reduce((sum, o) => sum + o.votes, 0);
  const useDemo = total === 0;
  const demoPcts = demoPercentages(options.length);
  const rows = options.map((opt, i) => {
    const pct = useDemo ? demoPcts[i] ?? 0 : Math.round((opt.votes / total) * 100);
    return { id: opt.id, label: opt.text, pct, votes: opt.votes };
  });
  const maxPct = Math.max(...rows.map((r) => r.pct));
  const voteLabel = useDemo ? "Prévia ao vivo" : `${totalVotes || total} votos`;

  return (
    <article className={`poll-ranking-preview ${compact ? "poll-ranking-preview--compact" : ""}`}>
      <div className="poll-ranking-preview__head">
        {live ? <LiveDot /> : null}
        <h3 className="poll-ranking-preview__title">{title || "Sua votação"}</h3>
        <span className="poll-ranking-preview__votes tabular-nums">{voteLabel}</span>
      </div>
      <p className="poll-ranking-preview__question">{question.text || "Pergunta principal"}</p>
      <div className="poll-ranking-preview__bars">
        {rows.map((row, index) => (
          <div key={row.id} className="live-poll-bar">
            <div className="live-poll-bar__meta">
              <span className="live-poll-bar__label">
                {index === 0 ? "🥇 " : ""}
                {row.label}
              </span>
              <span
                className={`live-poll-bar__pct tabular-nums ${row.pct === maxPct ? "live-poll-bar__pct--lead" : ""}`}
              >
                {useDemo ? `${row.pct}%` : `${row.votes} · ${row.pct}%`}
              </span>
            </div>
            <div className="live-poll-bar__track">
              <div
                className={`live-poll-bar__fill ${row.pct === maxPct ? "live-poll-bar__fill--lead" : ""}`}
                style={{
                  width: `${row.pct}%`,
                  ...(row.pct === maxPct ? { background: primaryColor } : {}),
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {live ? <p className="poll-ranking-preview__status">Ranking ao vivo — atualiza sozinho</p> : null}
    </article>
  );
}
