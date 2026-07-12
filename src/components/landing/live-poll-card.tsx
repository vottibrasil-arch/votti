import { useEffect, useMemo, useState } from "react";
import { LiveDot } from "@/components/ui-kit";
import { LivePollBar } from "@/components/votti/live-poll-bar";
import type { PollOption } from "@/lib/votti/poll-types";

type LivePollCardProps = {
  continent: string;
  title: string;
  options: PollOption[];
  primaryColor: string;
  /** Atraso inicial (ms) — desincroniza os cards */
  tickOffset?: number;
  onTick?: (msg: string) => void;
  className?: string;
};

function bumpVotes(options: PollOption[]): PollOption[] {
  const next = options.map((o) => ({ ...o, votes: Number(o.votes) }));
  const growIdx = Math.floor(Math.random() * next.length);
  const shrinkIdx = (growIdx + 1 + Math.floor(Math.random() * (next.length - 1))) % next.length;
  if (next[shrinkIdx].votes <= 2) return next;
  next[growIdx].votes += 1;
  next[shrinkIdx].votes -= 1;
  return next;
}

export function LivePollCard({
  continent,
  title,
  options: initialOptions,
  primaryColor,
  tickOffset = 0,
  onTick,
  className = "",
}: LivePollCardProps) {
  const [options, setOptions] = useState(() => initialOptions.map((o) => ({ ...o })));
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tickMs = 2400 + Math.floor(Math.random() * 800);

    const start = setTimeout(() => {
      interval = setInterval(() => {
        setOptions((prev) => bumpVotes(prev));
        setFlash(true);
        onTick?.("+1 voto");
        setTimeout(() => setFlash(false), 600);
      }, tickMs);
    }, tickOffset);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [tickOffset, onTick]);

  const totalVotes = useMemo(() => options.reduce((sum, o) => sum + Number(o.votes), 0), [options]);
  const hasVotes = totalVotes > 0;
  const maxVotes = Math.max(...options.map((o) => Number(o.votes)), 0);

  const displayOptions = useMemo(
    () =>
      [...options].sort(
        (a, b) => Number(b.votes) - Number(a.votes) || a.text.localeCompare(b.text, "pt-BR"),
      ),
    [options],
  );

  return (
    <article className={`live-poll-card live-poll-card--bubble ${flash ? "live-poll-card--pulse" : ""} ${className}`}>
      <div className="live-poll-card__top">
        <LiveDot />
        <div className="live-poll-card__heading">
          <p className="live-poll-card__continent">{continent}</p>
          <h3 className="live-poll-card__title">{title}</h3>
        </div>
        <span className="live-poll-card__votes tabular-nums">{totalVotes} votos</span>
      </div>

      <div className="live-poll-card__bars">
        {displayOptions.map((opt, rankIndex) => {
          const votes = Number(opt.votes);
          const pct = hasVotes ? Math.round((votes / totalVotes) * 100) : 0;
          const isLeader = hasVotes && votes === maxVotes && maxVotes > 0;
          const stackZ = (displayOptions.length - rankIndex) * 1000 + pct;

          return (
            <LivePollBar
              key={opt.id}
              option={{ ...opt, votes }}
              pct={pct}
              hasVotes={hasVotes}
              isLeader={isLeader}
              primaryColor={primaryColor}
              featured
              stackZ={stackZ}
            />
          );
        })}
      </div>

      <p className="live-poll-card__status">Atualizando sozinho</p>
    </article>
  );
}
