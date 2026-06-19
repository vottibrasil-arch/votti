import { BadgeCheck, Sparkles } from "lucide-react";

type FreeHighlightProps = {
  variant?: "banner" | "compact" | "pill";
  className?: string;
};

/** Destaque: Palpite Gol é o único 100% gratuito. */
export function FreeHighlight({ variant = "banner", className = "" }: FreeHighlightProps) {
  if (variant === "pill") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide text-foreground ${className}`}
        style={{
          background: "color-mix(in oklab, var(--gold) 20%, var(--surface-2))",
          border: "1px solid color-mix(in oklab, var(--gold) 40%, transparent)",
        }}
      >
        <BadgeCheck className="size-3.5 text-primary shrink-0" />
        100% gratuito
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <p
        className={`flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground ${className}`}
      >
        <BadgeCheck className="size-3.5 text-primary shrink-0" />
        O único bolão 100% gratuito
      </p>
    );
  }

  return (
    <div
      className={`rounded-2xl px-3.5 py-3 sm:px-5 sm:py-4 bg-surface-2 border border-primary/25 ${className}`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div
          className="size-9 sm:size-10 rounded-xl grid place-items-center shrink-0"
          style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}
        >
          <Sparkles className="size-4 sm:size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-sm sm:text-base leading-snug text-foreground">
            O único bolão <span className="text-primary">100% gratuito</span>
          </p>
          <p className="text-xs text-foreground/80 mt-1 leading-snug">
            Sem mensalidade, sem taxa escondida e sem pegadinha. Crie, convide e jogue de graça.
          </p>
        </div>
        <BadgeCheck className="size-5 text-gold shrink-0 mt-0.5 hidden sm:block" />
      </div>
    </div>
  );
}
