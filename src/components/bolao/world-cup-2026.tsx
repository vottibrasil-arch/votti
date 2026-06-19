import { Trophy } from "lucide-react";
import { TeamFlag } from "@/components/bolao/team-flag";
import { WORLD_CUP_2026 } from "@/lib/bolao";

export function WorldCup2026Banner({ compact }: { compact?: boolean }) {
  const wc = WORLD_CUP_2026;

  return (
    <div className={`wc-2026-banner relative overflow-hidden rounded-3xl ${compact ? "p-4" : "p-5"}`}>
      <div className="relative flex items-start gap-3">
        <div className="wc-2026-trophy size-12 rounded-2xl grid place-items-center shrink-0">
          <Trophy className="size-6" style={{ color: "var(--gold-foreground)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="chip text-[10px] mb-2 w-fit">FIFA · Demonstração</div>
          <h2 className={`font-display font-bold leading-tight ${compact ? "text-lg" : "text-xl"}`}>{wc.title}</h2>
          <p className="text-xs text-foreground/75 mt-1">{wc.subtitle}</p>
          {!compact && <p className="text-[11px] text-primary font-semibold mt-1.5">{wc.period}</p>}
        </div>
      </div>
      <div className="relative mt-4 flex items-center gap-2">
        {wc.hostCodes.map((code) => (
          <TeamFlag key={code} code={code} size="sm" className="ring-2 ring-background/80" />
        ))}
        <span className="text-[10px] text-foreground/65 ml-1">Sedes 2026</span>
      </div>
    </div>
  );
}

type StageCardProps = {
  icon: string;
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
};

export function WorldCupStageCard({ icon, label, desc, selected, onClick }: StageCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl p-3.5 text-left transition border active:scale-[0.98] ${
        selected ? "border-transparent wc-stage-selected" : "glass border-border hover:bg-surface-2/60"
      }`}
    >
      <div className="text-2xl leading-none">{icon}</div>
      <div className="text-sm font-bold mt-2 leading-tight">{label}</div>
      <div className={`text-[11px] mt-0.5 leading-snug ${selected ? "opacity-90" : "text-foreground/70"}`}>
        {desc}
      </div>
    </button>
  );
}
