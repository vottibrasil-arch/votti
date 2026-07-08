import type { PollOption } from "@/lib/votti/poll-types";

type LivePollBarProps = {
  option: PollOption;
  pct: number;
  hasVotes: boolean;
  isLeader: boolean;
  primaryColor: string;
  featured?: boolean;
  stackZ?: number;
};

/** Tamanho da bolha da foto: pequena e discreta (16px → 28px). */
export function optionBubbleSize(pct: number, hasVotes: boolean) {
  const min = 16;
  const max = 28;
  if (!hasVotes) return min;
  return Math.round(min + (Math.max(pct, 6) / 100) * (max - min));
}

/** Camadas do ranking: maior % / mais votos ficam por cima das linhas de baixo. */
export function optionStackZ(pct: number, votes: number, hasVotes: boolean) {
  if (!hasVotes) return 1;
  return votes * 1000 + pct + 10;
}

export function LivePollBar({
  option,
  pct,
  hasVotes,
  isLeader,
  primaryColor,
  featured = false,
  stackZ = 1,
}: LivePollBarProps) {
  const imageUrl = option.imageUrl?.trim();
  const showTrackBubble = Boolean(imageUrl && hasVotes);
  const bubbleSize = optionBubbleSize(pct, hasVotes);
  const bubbleLeft = hasVotes ? Math.min(Math.max(pct, 8), 92) : 8;

  return (
    <div
      className={`live-poll-bar ${imageUrl ? "live-poll-bar--photo" : ""} ${featured ? "live-poll-bar--featured" : ""}`}
      style={{ zIndex: stackZ }}
    >
      <div className="live-poll-bar__meta">
        <span className="live-poll-bar__label">
          {imageUrl && !hasVotes ? (
            <img src={imageUrl} alt="" className="live-poll-bar__thumb" width={18} height={18} />
          ) : null}
          {isLeader ? "🥇 " : ""}
          {option.text}
        </span>
        <span className={`live-poll-bar__pct tabular-nums ${isLeader ? "live-poll-bar__pct--lead" : ""}`}>
          {hasVotes ? `${option.votes} · ${pct}%` : "0 votos"}
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
        {showTrackBubble ? (
          <img
            src={imageUrl}
            alt=""
            className={`live-poll-bar__bubble ${isLeader ? "live-poll-bar__bubble--lead" : ""}`}
            style={{
              left: `${bubbleLeft}%`,
              width: bubbleSize,
              height: bubbleSize,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
