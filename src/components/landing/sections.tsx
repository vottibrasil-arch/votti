import type { ReactNode } from "react";
import { ArrowRight, Check, Crown } from "lucide-react";
import { DEMO_BOLAO, MATCHES, formatMoney, formatScoreDisplay, rankParticipants } from "@/lib/bolao";
import { TeamFlag } from "@/components/bolao/team-flag";

export function Perk({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <li className="flex items-start gap-3">
      <div
        className="size-10 rounded-full grid place-items-center shrink-0"
        style={{
          background: "color-mix(in oklab, var(--gold) 18%, var(--surface))",
          border: "1px solid color-mix(in oklab, var(--gold) 40%, transparent)",
          color: "var(--gold)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display font-bold text-[13px] sm:text-sm tracking-wide text-foreground">{title}</div>
        <div className="text-xs text-foreground/75 leading-snug">{sub}</div>
      </div>
    </li>
  );
}

export function Step({
  n,
  icon,
  title,
  desc,
  last,
}: {
  n: number;
  icon: ReactNode;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <div className="relative text-center">
      {!last && (
        <div className="hidden md:flex absolute top-9 -right-4 items-center text-primary/70 z-10">
          <ArrowRight className="size-4" />
        </div>
      )}
      <div
        className="relative mx-auto size-[72px] rounded-2xl bg-surface-2 grid place-items-center"
        style={{ border: "1px solid color-mix(in oklab, var(--primary) 30%, transparent)" }}
      >
        <span className="text-primary">{icon}</span>
        <span
          className="absolute -top-2 -left-2 size-6 rounded-full grid place-items-center font-display font-bold text-[11px]"
          style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}
        >
          {n}
        </span>
      </div>
      <div className="mt-3 font-display font-bold text-xs sm:text-[13px] tracking-wide text-foreground">{title}</div>
      <div className="mt-1 text-xs text-foreground/75 leading-snug">{desc}</div>
    </div>
  );
}

export function Benefit({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="size-11 rounded-xl grid place-items-center shrink-0"
        style={{
          background: "color-mix(in oklab, var(--primary) 15%, var(--surface-2))",
          color: "var(--primary)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display font-bold text-sm tracking-wide text-foreground">{title}</div>
        <div className="text-xs text-foreground/75 leading-snug">{desc}</div>
      </div>
    </div>
  );
}

export function QRCode() {
  const cells = Array.from({ length: 169 }, (_, i) => {
    const x = i % 13;
    const y = Math.floor(i / 13);
    const corner = (x < 3 && y < 3) || (x > 9 && y < 3) || (x < 3 && y > 9);
    return corner || ((x * 7 + y * 13 + (x ^ y) * 3) % 3 === 0);
  });
  return (
    <div
      className="size-24 rounded-xl bg-white p-2 grid gap-px"
      style={{ gridTemplateColumns: "repeat(13, 1fr)" }}
    >
      {cells.map((on, i) => (
        <div key={i} className={on ? "bg-black" : "bg-white"} />
      ))}
    </div>
  );
}

function Mockup({ step, accent, children }: { step: string; accent?: "live"; children: ReactNode }) {
  const labelColor = accent === "live" ? "var(--live)" : "var(--primary)";
  return (
    <div className="flex flex-col items-center">
      <div className="font-display font-bold text-[11px] tracking-[0.15em] mb-3" style={{ color: labelColor }}>
        {step}
      </div>
      <div
        className="relative w-full max-w-[260px] aspect-[9/19] rounded-[2.2rem] p-2"
        style={{
          background: "linear-gradient(180deg, oklch(0.22 0.03 160), oklch(0.12 0.02 160))",
          border: "1px solid color-mix(in oklab, var(--primary) 25%, var(--border))",
          boxShadow: "0 30px 60px -30px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1.5 w-16 rounded-full bg-black/60 z-10" />
        <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-background relative">{children}</div>
      </div>
    </div>
  );
}

function MockEscolha() {
  return (
    <div className="p-3 text-[10px]">
      <div className="text-center font-display font-bold text-xs mb-2">Criar Bolão</div>
      <div className="text-center text-[9px] text-muted-foreground mb-2">Escolha o que deseja criar</div>
      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        <div
          className="h-7 rounded-lg grid place-items-center font-display font-bold text-[10px]"
          style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}
        >
          JOGO
        </div>
        <div className="h-7 rounded-lg grid place-items-center font-display font-bold text-[10px] border border-border text-muted-foreground">
          FASE
        </div>
      </div>
      <div className="space-y-1.5">
        {MATCHES.slice(0, 5).map((m, i) => (
          <div
            key={m.id}
            className={`rounded-lg p-1.5 flex items-center gap-1.5 ${i === 0 ? "border border-primary bg-primary/10" : "bg-surface-2/60"}`}
          >
            <TeamFlag code={m.homeCode} size="xs" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[9px] font-semibold">
                <span>{m.home}</span>
                <span className="text-muted-foreground">x</span>
                <span>{m.away}</span>
              </div>
              <div className="text-[8px] text-muted-foreground">{m.date}</div>
            </div>
            <TeamFlag code={m.awayCode} size="xs" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MockConfigure() {
  const { match, stake } = DEMO_BOLAO;
  return (
    <div className="p-3 text-[10px]">
      <div className="text-center font-display font-bold text-xs mb-3">Configurações</div>
      <div className="rounded-lg bg-surface-2/60 p-2.5 flex items-center justify-around mb-2.5">
        <div className="text-center">
          <TeamFlag code={match.homeCode} size="sm" className="mx-auto" />
          <div className="text-[9px] font-semibold mt-0.5">{match.home}</div>
        </div>
        <div className="text-base font-bold text-muted-foreground">×</div>
        <div className="text-center">
          <TeamFlag code={match.awayCode} size="sm" className="mx-auto" />
          <div className="text-[9px] font-semibold mt-0.5">{match.away}</div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-surface-2/40 h-9 px-2.5 flex items-center justify-between mb-3">
        <span className="font-display font-bold">R$ {stake},00</span>
      </div>
      <div className="mt-3 h-9 rounded-lg grid place-items-center font-display font-bold text-[10px]"
           style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}>
        CRIAR BOLÃO
      </div>
    </div>
  );
}

function MockShare() {
  return (
    <div className="p-3 text-[10px] flex flex-col items-center">
      <div className="size-12 rounded-full grid place-items-center mt-3" style={{ background: "var(--gradient-green)" }}>
        <Check className="size-7 text-primary-foreground" />
      </div>
      <div className="font-display font-bold text-sm mt-3 text-center leading-tight">
        Bolão criado
        <br />
        com sucesso!
      </div>
      <div className="mt-3 w-full h-7 rounded-lg border border-border grid place-items-center font-mono text-[8px]">
        {DEMO_BOLAO.sharePath}
      </div>
    </div>
  );
}

function MockLive() {
  const bolao = DEMO_BOLAO;
  const score = bolao.liveScore;
  const leader = rankParticipants(bolao.participants, score)[0];

  return (
    <div className="p-2.5 text-[10px]">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[9px] font-bold tracking-wider rounded px-1.5 py-0.5 inline-flex items-center gap-1"
          style={{
            background: "color-mix(in oklab, var(--live) 25%, var(--surface))",
            color: "var(--live)",
          }}
        >
          <span className="size-1.5 rounded-full bg-[var(--live)] animate-pulse-live" />
          DEMONSTRAÇÃO
        </span>
        <span className="text-[9px] font-bold tabular-nums">{bolao.minute}'</span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-center">
          <TeamFlag code={bolao.match.homeCode} size="sm" className="mx-auto" />
          <div className="text-[9px] font-semibold mt-0.5">{bolao.match.home}</div>
        </div>
        <div className="font-display text-2xl font-bold tabular-nums">
          {score[0]} <span className="text-muted-foreground/50 text-base">x</span> {score[1]}
        </div>
        <div className="text-center">
          <TeamFlag code={bolao.match.awayCode} size="sm" className="mx-auto" />
          <div className="text-[9px] font-semibold mt-0.5">{bolao.match.away}</div>
        </div>
      </div>
      <div className="rounded-lg p-2 mb-2" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--gold) 25%, var(--surface)), var(--surface))", border: "1px solid color-mix(in oklab, var(--gold) 50%, transparent)" }}>
        <div className="text-[8px] font-bold tracking-wider text-gold text-center">LEVANDO O PRÊMIO AGORA</div>
        <div className="flex items-center gap-2 mt-1.5">
          <Crown className="size-4 text-gold shrink-0" fill="currentColor" />
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-[11px] truncate">{leader.name}</div>
            <div className="text-[8px] text-muted-foreground">Palpite: {formatScoreDisplay(leader.guess)}</div>
          </div>
          <div className="font-display font-bold text-[10px] text-gradient-gold">{formatMoney(bolao.prize)}</div>
        </div>
      </div>
    </div>
  );
}

export function LandingPhoneMockups() {
  return (
    <>
      <div id="telas" className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-rise" style={{ animationDelay: "0.1s" }}>
        <Mockup step="1. ESCOLHA">
          <MockEscolha />
        </Mockup>
        <Mockup step="2. CONFIGURE">
          <MockConfigure />
        </Mockup>
        <Mockup step="3. LINK CRIADO">
          <MockShare />
        </Mockup>
        <Mockup step="4. DEMONSTRAÇÃO" accent="live">
          <MockLive />
        </Mockup>
      </div>
    </>
  );
}
