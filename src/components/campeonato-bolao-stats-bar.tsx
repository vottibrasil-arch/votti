import type { CampeonatoBolaoStats } from "@/lib/bolao/db-types";
import { Lock, Radio, Trophy } from "lucide-react";

export function CampeonatoBolaoStatsBar({ stats }: { stats: CampeonatoBolaoStats }) {
  if (stats.total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-surface/30 px-4 py-3 text-center text-xs text-muted-foreground">
        Nenhum bolão criado neste campeonato ainda.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-center">
        <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-primary font-bold">
          <Radio className="size-3" /> Ativos
        </div>
        <div className="font-display text-2xl font-bold mt-1 tabular-nums">{stats.ativos}</div>
      </div>
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-center">
        <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-red-300 font-bold">
          <Lock className="size-3" /> Encerrados
        </div>
        <div className="font-display text-2xl font-bold mt-1 tabular-nums">{stats.encerrados}</div>
      </div>
      <div className="rounded-2xl border border-gold/30 bg-gold/10 p-3 text-center">
        <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-gold font-bold">
          <Trophy className="size-3" /> Total
        </div>
        <div className="font-display text-2xl font-bold mt-1 tabular-nums">{stats.total}</div>
      </div>
    </div>
  );
}
