import { formatMoney } from "@/lib/bolao";
import { TrendingUp } from "lucide-react";

type PrizeBannerProps = {
  prize: number;
  delta?: number;
  label?: string;
};

export function PrizeBanner({ prize, delta, label = "Prêmio atual" }: PrizeBannerProps) {
  return (
    <div className="rounded-2xl p-4 flex items-center justify-between demo-prize-banner">
      <div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-gold font-bold">{label}</div>
        <div className="font-display text-3xl font-bold text-gradient-gold mt-0.5">{formatMoney(prize, true)}</div>
      </div>
      {delta != null && delta > 0 && (
        <div className="text-right">
          <div className="flex items-center gap-1 text-success text-sm font-semibold">
            <TrendingUp className="size-4" /> +{formatMoney(delta)}
          </div>
          <div className="text-xs text-muted-foreground">nos últimos 5 min</div>
        </div>
      )}
    </div>
  );
}
