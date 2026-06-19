import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  icon?: ReactNode;
  gold?: boolean;
  compact?: boolean;
};

export function StatCard({ label, value, icon, gold, compact }: StatCardProps) {
  if (compact) {
    return (
      <div className="rounded-xl bg-surface-2/60 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-display font-semibold text-sm mt-0.5">{value}</div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div
        className={`flex items-center gap-1.5 text-xs uppercase tracking-wider ${
          gold ? "text-gold" : "text-muted-foreground"
        }`}
      >
        {icon} {label}
      </div>
      <div className={`font-display text-2xl font-bold mt-1 ${gold ? "text-gradient-gold" : ""}`}>{value}</div>
    </div>
  );
}
