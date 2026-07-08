import type { PollOption } from "@/lib/votti/poll-types";

type LivePollBarProps = {
  option: PollOption;
  pct: number;
  hasVotes: boolean;
  isLeader: boolean;
  primaryColor: string;
  featured?: boolean;
};

/** Tamanho da bolha da foto: cresce com a porcentagem (28px → 64px). */
export function optionBubbleSize(pct: number, hasVotes: boolean) {
  const min = 28;
  const max = 64;
  if (!hasVotes) return min;
  return Math.round(min + (Math.max(pct, 6) / 100) * (max - min));
}

export function LivePollBar({
  option,
  pct,
  hasVotes,
  isLeader,
  primaryColor,
  featured = false,
}: LivePollBarProps) {
  const imageUrl = option.imageUrl?.trim();
  const bubbleSize = optionBubbleSize(pct, hasVotes);
  const bubbleLeft = hasVotes ? Math.min(Math.max(pct, 5), 97) : 5;

  return (
    <div className={`live-poll-bar ${imageUrl ? "live-poll-bar--photo" : ""} ${featured ? "live-poll-bar--featured" : ""}`}>
      <div className="live-poll-bar__meta">
        <span className="live-poll-bar__label">
          {imageUrl && !hasVotes ? (
            <img src={imageUrl} alt="" className="live-poll-bar__thumb" width={28} height={28} />
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
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className={`live-poll-bar__bubble ${isLeader ? "live-poll-bar__bubble--lead" : ""}`}
            style={{
              left: `${bubbleLeft}%`,
              width: bubbleSize,
              height: bubbleSize,
              marginLeft: -bubbleSize / 2,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
