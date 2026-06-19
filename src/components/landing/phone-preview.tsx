import { Link } from "@tanstack/react-router";
import { Crown, Trophy } from "lucide-react";
import { MatchHeader } from "@/components/bolao/match-header";
import {
  DEMO_BOLAO,
  formatMoney,
  formatScore,
  rankParticipants,
  resolvePrizeLeaders,
} from "@/lib/bolao";

/** Preview real da tela /live dentro de um celular — mesmos dados do app. */
export function PhonePreview() {
  const bolao = DEMO_BOLAO;
  const score = bolao.liveScore;
  const leaders = resolvePrizeLeaders(bolao.participants, score, bolao.settings.exclusiveScore, false);
  const sorted = rankParticipants(bolao.participants, score);
  const winner = leaders[0];

  return (
    <div className="relative w-full max-w-[280px] sm:max-w-[300px] mx-auto lg:mx-0 lg:ml-auto">
      <div
        className="relative rounded-[2.5rem] sm:rounded-[2.75rem] p-2 sm:p-2.5"
        style={{
          background: "linear-gradient(165deg, oklch(0.28 0.03 160), oklch(0.10 0.02 160))",
          border: "1px solid color-mix(in oklab, var(--primary) 30%, var(--border))",
          boxShadow: "0 24px 48px -20px rgba(0,0,0,0.75)",
        }}
      >
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 h-1 w-14 rounded-full bg-black/70 z-20" />
        <div className="rounded-[2rem] sm:rounded-[2.25rem] overflow-hidden bg-background flex flex-col">
          <div className="px-4 pt-5 pb-1 flex items-center justify-between text-[10px] text-foreground/60">
            <span>21:06</span>
            <span className="flex gap-1">
              <span className="size-1 rounded-full bg-foreground/60" />
              <span className="size-1 rounded-full bg-foreground/60" />
              <span className="size-1 rounded-full bg-foreground/40" />
            </span>
          </div>

          <div className="px-3 pb-2 flex items-center justify-between gap-2 border-b border-border/50 min-w-0">
            <img src="/logo-full.png" alt="" className="w-[4.5rem] h-auto object-contain shrink-0" />
            <span className="chip text-[9px] shrink-0 whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-[var(--live)] animate-pulse-live" />
              Demo
            </span>
          </div>

          <div className="px-2.5 py-2.5 space-y-2.5">
            <div className="rounded-xl bg-surface-2 p-2.5 border border-border/60">
              <MatchHeader match={bolao.match} score={score} size="xs" live minute={bolao.minute} />
            </div>

            <div
              className="rounded-xl p-2.5 flex items-center justify-between gap-2 bg-surface-2 border border-border/60"
            >
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wider text-gold font-bold">Prêmio atual</div>
                <div className="font-display text-lg font-bold text-gold">{formatMoney(bolao.prize, true)}</div>
              </div>
              <div className="text-[10px] text-success font-semibold shrink-0">+{formatMoney(bolao.prizeDelta)}</div>
            </div>

            {winner ? (
              <div className="rounded-xl p-2.5 bg-surface-2 border border-gold/30">
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-gold font-bold">
                  <Crown className="size-3" fill="currentColor" /> Cravou o placar
                </div>
                <div className="mt-1.5 flex items-center gap-2 min-w-0">
                  <div
                    className="size-8 rounded-lg grid place-items-center font-display font-bold text-xs shrink-0"
                    style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
                  >
                    {winner.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-xs truncate">{winner.name}</div>
                    <div className="text-[10px] text-foreground/75">Palpite {formatScore(winner.guess)}</div>
                  </div>
                  <Trophy className="size-3.5 text-gold shrink-0" />
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-2.5 bg-surface-2 border border-border/60 text-[10px] text-muted-foreground text-center">
                Aguardando quem cravar {formatScore(score)}
              </div>
            )}

            <div>
              <div className="text-[10px] uppercase tracking-wider text-foreground/75 font-semibold mb-1 px-0.5">
                Participantes · {bolao.participants.length}
              </div>
              <ul className="space-y-1">
                {sorted.slice(0, 3).map((p, i) => (
                  <li
                    key={p.name}
                    className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] min-w-0 ${
                      p.isYou ? "bg-primary/10 border border-primary/30" : "bg-surface-2/80"
                    }`}
                  >
                    <span className="text-foreground/70 w-3 shrink-0">{i + 1}</span>
                    <span className="font-semibold flex-1 truncate min-w-0">{p.name}</span>
                    <span className="font-display font-bold tabular-nums shrink-0">{formatScore(p.guess)}</span>
                    <span className={`size-1.5 rounded-full shrink-0 ${p.alive ? "bg-success" : "bg-destructive"}`} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Link
            to="/demonstracao"
            search={{ passo: 8 }}
            className="mx-2.5 mb-3 h-10 rounded-xl font-display font-bold text-xs flex items-center justify-center active:scale-[0.98] transition"
            style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}
          >
            Demonstração
          </Link>
        </div>
      </div>
    </div>
  );
}
