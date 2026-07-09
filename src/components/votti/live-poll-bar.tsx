import type { PollOption } from "@/lib/votti/poll-types";
import { getOptionImageUrl } from "@/lib/votti/poll-types";
import { RankingOptionAvatar } from "@/components/votti/ranking-option-avatar";

type LivePollBarProps = {
  option: PollOption;
  pct: number;
  hasVotes: boolean;
  isLeader: boolean;
  primaryColor: string;
  featured?: boolean;
  stackZ?: number;
};

const THUMB_SIZE = { default: 26, featured: 30 } as const;

/** Tamanho da bolha na barra — cresce com a porcentagem real (0–100). */
export function optionBubbleSize(pct: number, featured = false) {
  const min = featured ? 24 : 21;
  const max = featured ? 40 : 37;
  const p = Math.min(100, Math.max(0, pct));
  return Math.round(min + (p / 100) * (max - min));
}

/** Posição da bolha: 0% no início da barra, 100% no fim, centro no meio. */
export function bubbleTrackPosition(pct: number): { left: string; transform: string } {
  const p = Math.min(100, Math.max(0, pct));
  if (p <= 0) return { left: "0%", transform: "translate(0, -50%)" };
  if (p >= 100) return { left: "100%", transform: "translate(-100%, -50%)" };
  return { left: `${p}%`, transform: "translate(-50%, -50%)" };
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
  const imageUrl = getOptionImageUrl(option);
  const thumbSize = featured ? THUMB_SIZE.featured : THUMB_SIZE.default;
  const showTrackBubble = Boolean(imageUrl);
  const bubbleSize = optionBubbleSize(pct, featured);
  const bubblePos = bubbleTrackPosition(pct);
  const candidateName = option.text.trim();

  return (
    <div
      className={`live-poll-bar ${imageUrl ? "live-poll-bar--photo" : ""} ${featured ? "live-poll-bar--featured" : ""} ${isLeader ? "live-poll-bar--lead" : ""}`}
      style={{
        zIndex: stackZ,
        ...(imageUrl ? { ["--rank-thumb-size" as string]: `${thumbSize}px` } : {}),
      }}
    >
      <div className="live-poll-bar__meta">
        <div className="live-poll-bar__identity">
          {imageUrl ? (
            <RankingOptionAvatar
              src={imageUrl}
              size={thumbSize}
              lead={isLeader}
              title={candidateName}
              className="live-poll-bar__thumb"
            />
          ) : null}
          <span className="live-poll-bar__name-wrap" title={candidateName}>
            <span className="live-poll-bar__label">{candidateName}</span>
            {isLeader ? (
              <span className="live-poll-bar__medal" aria-hidden>
                {" "}
                🥇
              </span>
            ) : null}
          </span>
        </div>
        <span className={`live-poll-bar__pct tabular-nums ${isLeader ? "live-poll-bar__pct--lead" : ""}`}>
          {hasVotes ? `${option.votes} · ${pct}%` : "0 votos"}
        </span>
      </div>

      <div
        className="live-poll-bar__track-zone"
        style={showTrackBubble ? { ["--bubble-size" as string]: `${bubbleSize}px` } : undefined}
      >
        <div className="live-poll-bar__track">
          <div
            className={`live-poll-bar__fill ${isLeader ? "live-poll-bar__fill--lead" : ""} ${!hasVotes || pct === 0 ? "live-poll-bar__fill--zero" : ""}`}
            style={{
              width: `${Math.min(100, Math.max(0, pct))}%`,
              ...(isLeader ? { background: primaryColor } : {}),
            }}
          />
          {showTrackBubble ? (
            <RankingOptionAvatar
              src={imageUrl}
              size={bubbleSize}
              lead={isLeader}
              title={candidateName}
              className={`live-poll-bar__bubble ${isLeader ? "live-poll-bar__bubble--lead" : ""}`}
              style={bubblePos}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
