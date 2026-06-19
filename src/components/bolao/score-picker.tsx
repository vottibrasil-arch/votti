import { Minus, Plus } from "lucide-react";
import type { Match } from "@/lib/bolao";
import { TeamFlag } from "@/components/bolao/team-flag";

type ScorePickerProps = {
  match: Match;
  home: number;
  away: number;
  onHomeChange: (n: number) => void;
  onAwayChange: (n: number) => void;
};

export function ScorePicker({ match, home, away, onHomeChange, onAwayChange }: ScorePickerProps) {
  return (
    <div className="rounded-3xl glass p-5 relative overflow-hidden">
      <div className="absolute inset-0 opacity-50" style={{ background: "var(--gradient-pitch)" }} />
      <div className="relative grid grid-cols-2 gap-4">
        <TeamStepper code={match.homeCode} name={match.home} value={home} onChange={onHomeChange} />
        <TeamStepper code={match.awayCode} name={match.away} value={away} onChange={onAwayChange} />
      </div>
      <div className="relative mt-5 text-center font-display text-5xl font-bold tabular-nums">
        {home} <span className="text-muted-foreground/50">×</span> {away}
      </div>
    </div>
  );
}

function TeamStepper({
  code,
  name,
  value,
  onChange,
}: {
  code: string;
  name: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-surface-2/60 p-3 text-center">
      <div className="flex justify-center">
        <TeamFlag code={code} size="lg" />
      </div>
      <div className="font-display font-semibold mt-1">{name}</div>
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="size-9 rounded-full bg-surface grid place-items-center active:scale-95 transition"
          aria-label="Diminuir"
        >
          <Minus className="size-4" />
        </button>
        <div className="font-display text-3xl font-bold tabular-nums w-10">{value}</div>
        <button
          onClick={() => onChange(Math.min(9, value + 1))}
          className="size-9 rounded-full bg-primary text-primary-foreground grid place-items-center active:scale-95 transition"
          aria-label="Aumentar"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
