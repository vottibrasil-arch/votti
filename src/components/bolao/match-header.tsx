import type { Match, Score } from "@/lib/bolao";
import { LiveDot } from "@/components/ui-kit";
import { TeamFlag } from "@/components/bolao/team-flag";

type MatchHeaderProps = {
  match: Match;
  score?: Score;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "default" | "invite";
  label?: string;
  live?: boolean;
  ended?: boolean;
  minute?: number;
  className?: string;
};

const FLAG_SIZE = { xs: "xs", sm: "sm", md: "lg", lg: "lg" } as const;
const SCORE_SIZE = { xs: "text-lg", sm: "text-2xl", md: "text-5xl", lg: "text-5xl" } as const;
const NAME_CLASS = {
  xs: "font-display font-bold text-[10px] leading-tight text-center w-full truncate px-0.5",
  sm: "font-display font-bold text-sm",
  md: "font-display font-semibold",
  lg: "font-display font-semibold",
} as const;

export function MatchHeader({
  match,
  score,
  size = "md",
  variant = "default",
  label,
  live,
  ended,
  minute,
  className = "",
}: MatchHeaderProps) {
  const flagClass = FLAG_SIZE[size];
  const scoreClass = SCORE_SIZE[size];
  const nameClass = NAME_CLASS[size];
  const displayMinute = match.isPersonalizado ? undefined : minute;

  if (variant === "invite" || (size === "sm" && !score)) {
    return (
      <div className={className}>
        {label && <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{label}</div>}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <TeamFlag code={match.homeCode} size={flagClass} />
            <span className={nameClass}>{match.home}</span>
          </div>
          <span className="font-display text-xl font-bold text-muted-foreground/60">×</span>
          <div className="flex flex-col items-center gap-1">
            <TeamFlag code={match.awayCode} size={flagClass} />
            <span className={nameClass}>{match.away}</span>
          </div>
        </div>
        <div className="text-xs text-center text-muted-foreground mt-2">
          {match.date} · {match.stage}
        </div>
      </div>
    );
  }

  if (size === "xs" || size === "sm") {
    const liveRow = (live || ended || displayMinute != null) && (
      <div className="flex items-center justify-between mb-2">
        {(live || ended) && <LiveDot ended={ended} />}
        {displayMinute != null && (
          <span className="chip text-[9px] py-0.5">
            <span className="text-[var(--live)] font-bold">{displayMinute}'</span> 2º tempo
          </span>
        )}
      </div>
    );

    if (size === "xs" && score) {
      return (
        <div className={className}>
          {liveRow}
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
            <div className="flex flex-col items-center gap-0.5 min-w-0">
              <TeamFlag code={match.homeCode} size={flagClass} />
              <span className={nameClass}>{match.home}</span>
            </div>
            <span className={`font-display ${scoreClass} font-bold tabular-nums px-1`}>
              {score[0]} <span className="text-muted-foreground/50 text-sm">×</span> {score[1]}
            </span>
            <div className="flex flex-col items-center gap-0.5 min-w-0">
              <TeamFlag code={match.awayCode} size={flagClass} />
              <span className={nameClass}>{match.away}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={className}>
        {label && <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>}
        {liveRow}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mt-2">
          <div className="flex flex-col items-center gap-1">
            <TeamFlag code={match.homeCode} size={flagClass} />
            <span className={nameClass}>{match.home}</span>
          </div>
          <span className={`font-display ${scoreClass} font-bold tabular-nums`}>
            {score![0]} <span className="text-muted-foreground/50">×</span> {score![1]}
          </span>
          <div className="flex flex-col items-center gap-1">
            <TeamFlag code={match.awayCode} size={flagClass} />
            <span className={nameClass}>{match.away}</span>
          </div>
        </div>
        <div className="text-xs text-center text-muted-foreground mt-2">
          {match.date} · {match.stage}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {(live || ended || displayMinute != null) && (
        <div className="flex items-center justify-between">
          {(live || ended) && <LiveDot ended={ended} />}
          {displayMinute != null && (
            <span className="chip">
              <span className="text-[var(--live)] font-bold">{displayMinute}'</span> 2º tempo
            </span>
          )}
        </div>
      )}
      {label && (
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-center">{label}</div>
      )}
      <div className={`${live || ended || displayMinute != null ? "mt-4" : ""} grid grid-cols-[1fr_auto_1fr] items-center gap-3`}>
        <div className="flex flex-col items-center gap-1">
          <TeamFlag code={match.homeCode} size={flagClass} />
          <span className={nameClass}>{match.home}</span>
        </div>
        <div className={`font-display ${scoreClass} font-bold tabular-nums text-center`}>
          {score ? (
            <>
              {score[0]}
              <span className="text-muted-foreground/50 mx-1.5">×</span>
              {score[1]}
            </>
          ) : (
            <span className="text-muted-foreground/70">×</span>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <TeamFlag code={match.awayCode} size={flagClass} />
          <span className={nameClass}>{match.away}</span>
        </div>
      </div>
    </div>
  );
}

export function MatchCard({ match, className = "" }: { match: Match; className?: string }) {
  return (
    <div className={`rounded-3xl glass p-5 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 opacity-50" style={{ background: "var(--gradient-pitch)" }} />
      <div className="relative">
        <MatchHeader match={match} size="sm" variant="invite" />
      </div>
    </div>
  );
}
