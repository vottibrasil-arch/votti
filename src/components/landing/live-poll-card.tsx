import { useEffect, useState } from "react";
import { LiveDot } from "@/components/ui-kit";

type Option = { label: string; pct: number };

type LivePollCardProps = {
  title: string;
  initial: Option[];
  /** Atraso inicial (ms) — desincroniza os cards */
  tickOffset?: number;
  onTick?: (msg: string) => void;
  className?: string;
};

function normalize(options: Option[]): Option[] {
  const sum = options.reduce((a, o) => a + o.pct, 0);
  if (sum === 0) return options;
  return options.map((o) => ({ ...o, pct: Math.round((o.pct / sum) * 100) }));
}

function bump(options: Option[]): Option[] {
  const next = options.map((o) => ({ ...o }));
  const growIdx = Math.floor(Math.random() * next.length);
  const shrinkIdx = (growIdx + 1 + Math.floor(Math.random() * (next.length - 1))) % next.length;
  if (next[shrinkIdx].pct <= 8) return next;
  next[growIdx].pct += 1;
  next[shrinkIdx].pct -= 1;
  return normalize(next);
}

export function LivePollCard({ title, initial, tickOffset = 0, onTick, className = "" }: LivePollCardProps) {
  const [options, setOptions] = useState(() => normalize(initial));
  const [flash, setFlash] = useState(false);
  const [total, setTotal] = useState(() => 120 + Math.floor(Math.random() * 80));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tickMs = 2400 + Math.floor(Math.random() * 800);

    const start = setTimeout(() => {
      interval = setInterval(() => {
        setOptions((prev) => bump(prev));
        setTotal((t) => t + 1);
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

  const maxPct = Math.max(...options.map((o) => o.pct));

  return (
    <article className={`live-poll-card ${flash ? "live-poll-card--pulse" : ""} ${className}`}>
      <div className="live-poll-card__top">
        <LiveDot />
        <h3 className="live-poll-card__title">{title}</h3>
        <span className="live-poll-card__votes tabular-nums">{total} votos</span>
      </div>

      <div className="live-poll-card__bars">
        {options.map((opt) => (
          <div key={opt.label} className="live-poll-bar">
            <div className="live-poll-bar__meta">
              <span className="live-poll-bar__label">{opt.label}</span>
              <span
                className={`live-poll-bar__pct tabular-nums ${opt.pct === maxPct ? "live-poll-bar__pct--lead" : ""}`}
              >
                {opt.pct}%
              </span>
            </div>
            <div className="live-poll-bar__track">
              <div
                className={`live-poll-bar__fill ${opt.pct === maxPct ? "live-poll-bar__fill--lead" : ""}`}
                style={{ width: `${opt.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="live-poll-card__status">Atualizando sozinho</p>
    </article>
  );
}
