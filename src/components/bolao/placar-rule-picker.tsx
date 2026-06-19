import { Copy, Sparkles } from "lucide-react";

type Props = {
  exclusive: boolean;
  onChange: (exclusive: boolean) => void;
};

export function PlacarRulePicker({ exclusive, onChange }: Props) {
  return (
    <div>
      <h2 className="font-display font-semibold mb-3 text-sm">Regra dos palpites</h2>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-2xl p-3.5 text-left border-2 transition ${
            exclusive
              ? "border-primary bg-primary/10"
              : "border-border/80 glass hover:border-border"
          }`}
        >
          <div
            className={`size-9 rounded-xl grid place-items-center mb-2 ${
              exclusive ? "bg-primary text-primary-foreground" : "bg-surface-2 text-gold"
            }`}
          >
            <Sparkles className="size-4" />
          </div>
          <div className="font-semibold text-sm">Exclusivo</div>
          <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
            Cada placar só uma vez — prêmio inteiro para quem vencer
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-2xl p-3.5 text-left border-2 transition ${
            !exclusive
              ? "border-primary bg-primary/10"
              : "border-border/80 glass hover:border-border"
          }`}
        >
          <div
            className={`size-9 rounded-xl grid place-items-center mb-2 ${
              !exclusive ? "bg-primary text-primary-foreground" : "bg-surface-2 text-gold"
            }`}
          >
            <Copy className="size-4" />
          </div>
          <div className="font-semibold text-sm">Repetido</div>
          <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
            Vários podem cravar o mesmo — prêmio divide entre quem acertar
          </div>
        </button>
      </div>
    </div>
  );
}
