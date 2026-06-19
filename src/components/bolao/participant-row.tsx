import { Crown } from "lucide-react";
import type { RankedParticipant } from "@/lib/bolao";
import { formatScore } from "@/lib/bolao";

type ParticipantRowProps = {
  participant: RankedParticipant;
  isLeader?: boolean;
};

export function ParticipantRow({ participant, isLeader }: ParticipantRowProps) {
  const { name, avatar, guess, alive, distance, isYou } = participant;

  return (
    <li
      className={`rounded-2xl p-3 flex items-center gap-3 border transition ${
        isYou ? "border-primary bg-primary/10" : "border-border glass"
      }`}
    >
      <div className="relative shrink-0">
        <div
          className={`size-10 rounded-xl grid place-items-center font-display font-bold ${
            alive ? "text-primary-foreground" : "text-muted-foreground"
          }`}
          style={{
            background: alive
              ? "var(--gradient-green)"
              : "color-mix(in oklab, var(--destructive) 30%, var(--surface-2))",
          }}
        >
          {avatar}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background ${
            alive ? "bg-success" : "bg-destructive"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold truncate">{name}</span>
          {isYou && (
            <span className="chip" style={{ padding: "0 0.4rem", fontSize: "0.65rem" }}>
              VOCÊ
            </span>
          )}
          {isLeader && <Crown className="size-3.5 text-gold shrink-0" fill="currentColor" />}
        </div>
        <div className="text-xs text-muted-foreground">
          {alive
            ? distance === 0
              ? "Cravou o placar atual"
              : `Distância: ${distance}`
            : "Eliminado matematicamente"}
        </div>
      </div>
      <div className={`font-display font-bold tabular-nums ${alive ? "" : "text-muted-foreground line-through"}`}>
        {formatScore(guess)}
      </div>
    </li>
  );
}
