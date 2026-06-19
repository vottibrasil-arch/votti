import { PlacarRulePicker } from "@/components/bolao/placar-rule-picker";
import { STAKE_PRESETS } from "@/lib/bolao/constants";
import { Trophy, Wallet } from "lucide-react";

type Props = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  stake: number;
  onStakeChange: (v: number) => void;
  modoExclusivo?: boolean;
  onModoExclusivoChange?: (v: boolean) => void;
  compact?: boolean;
  hideToggle?: boolean;
};

export function BolaoAtivarSection({
  enabled,
  onEnabledChange,
  stake,
  onStakeChange,
  modoExclusivo = true,
  onModoExclusivoChange,
  compact = false,
  hideToggle = false,
}: Props) {
  return (
    <div
      className={`rounded-2xl overflow-hidden border-2 transition ${
        enabled || hideToggle ? "border-gold/50 bg-gold/5" : "border-border glass"
      }`}
    >
      {!hideToggle && (
        <button
          type="button"
          onClick={() => onEnabledChange(!enabled)}
          className="w-full p-4 flex items-center gap-3 text-left"
        >
        <div
          className="size-12 rounded-2xl grid place-items-center shrink-0"
          style={
            enabled
              ? { background: "var(--gradient-gold)", color: "var(--gold-foreground)" }
              : { background: "var(--surface-2)" }
          }
        >
          <Trophy className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-sm">Transformar em bolão</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Convide a galera, receba palpites e acompanhe a classificação
          </div>
        </div>
        <div
          className={`relative w-11 h-6 rounded-full transition shrink-0 ${enabled ? "bg-gold" : "bg-surface-2"}`}
        >
          <div
            className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${
              enabled ? "left-[1.375rem]" : "left-0.5"
            }`}
          />
        </div>
      </button>
      )}

      {hideToggle && (
        <div className="p-4 flex items-center gap-3 border-b border-gold/20">
          <div
            className="size-12 rounded-2xl grid place-items-center shrink-0"
            style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
          >
            <Trophy className="size-6" />
          </div>
          <div>
            <div className="font-display font-bold text-sm">Transformar em bolão</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Defina a aposta e gere o link para a galera
            </div>
          </div>
        </div>
      )}

      {(enabled || hideToggle) && (
        <div className={`px-4 pb-4 space-y-3 ${compact ? "" : "border-t border-gold/20 pt-4 mx-4 mb-0"}`}>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Wallet className="size-3" /> Valor da aposta
            </div>
            <div className="glass rounded-2xl p-3 flex items-center gap-2">
              <span className="font-display text-gradient-gold text-xl font-bold">R$</span>
              <input
                value={String(stake)}
                onChange={(e) => onStakeChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
                inputMode="numeric"
                className="bg-transparent flex-1 font-display text-2xl font-bold outline-none tabular-nums"
              />
              <span className="text-[10px] text-muted-foreground">/ pessoa</span>
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              {STAKE_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onStakeChange(Number(v))}
                  className="chip"
                  style={
                    String(stake) === v
                      ? { background: "var(--gradient-gold)", color: "var(--gold-foreground)", border: "none" }
                      : undefined
                  }
                >
                  R$ {v}
                </button>
              ))}
            </div>
          </div>

          {onModoExclusivoChange && (
            <PlacarRulePicker exclusive={modoExclusivo} onChange={onModoExclusivoChange} />
          )}
        </div>
      )}
    </div>
  );
}
