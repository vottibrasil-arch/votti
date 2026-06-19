/**
 * Demonstração — fluxo completo no front (mock).
 * Arquivo único: passos 1–9 em /demonstracao?passo=N.
 * Não usa Supabase, login nem rotas reais (/share, /join, etc.).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";
import { SignOutButton } from "@/components/auth-sign-out";
import { useAuth } from "@/lib/auth/use-auth";
import { SettingsToggle } from "@/components/bolao/form-primitives";
import { DemoFlowNav } from "@/components/demo-flow-nav";
import { WorldCup2026Banner, WorldCupStageCard } from "@/components/bolao/world-cup-2026";
import { MatchHeader } from "@/components/bolao/match-header";
import { StatCard } from "@/components/bolao/stat-card";
import { PlacarRulePicker } from "@/components/bolao/placar-rule-picker";
import { ScorePicker } from "@/components/bolao/score-picker";
import { ScrollableListPanel } from "@/components/bolao/scrollable-list-panel";
import { TakenScoresList } from "@/components/bolao/taken-scores-list";
import { ParticipantRow } from "@/components/bolao/participant-row";
import { PrizeBanner } from "@/components/bolao/prize-banner";
import { TeamFlag } from "@/components/bolao/team-flag";
import { FormField } from "@/components/bolao/form-primitives";
import { useDemoBolao } from "@/lib/demo-bolao-store";
import {
  DEMO_BOLAO,
  MATCHES,
  STAGES,
  STAKE_PRESETS,
  bolaoFeePercent,
  calcPrize,
  calcPrizeShare,
  findFinalPrizeWinners,
  resolvePrizeLeaders,
  formatMoney,
  formatScore,
  formatScoreDisplay,
  getParticipantStatus,
  rankParticipants,
  scoreKey,
} from "@/lib/bolao";
import {
  Check, ChevronLeft, ChevronRight, Copy, Crown, Eye, EyeOff, Flame,
  Link2, Lock, Minus, Plus, Share2, Sparkles, Trophy, Users, Wallet, X,
} from "lucide-react";
import type { Score } from "@/lib/bolao/types";

function matchesForStage(stageId: string) {
  if (stageId === "single") return [MATCHES[0]];
  if (stageId === "r16") return MATCHES.filter((m) => m.stage.includes("Oitavas"));
  if (stageId === "qf") return MATCHES.filter((m) => m.stage.includes("Quartas"));
  return MATCHES;
}

function demoInviteUrl() {
  if (typeof window === "undefined") return "/demonstracao?passo=5";
  return `${window.location.origin}/demonstracao?passo=5`;
}

function parseGuess(guess: string): Score | null {
  const normalized = guess.replace(/x/gi, "-");
  const m = normalized.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function findTakenBy(
  takenScores: Record<string, string>,
  requests: { name: string; guess: string; status: string }[],
  home: number,
  away: number,
): string | undefined {
  const key = scoreKey([home, away]);
  if (takenScores[key]) return takenScores[key];
  for (const r of requests) {
    if (r.status === "rejected") continue;
    const s = parseGuess(r.guess);
    if (s && scoreKey(s) === key) return r.name;
  }
  return undefined;
}

export const Route = createFileRoute("/demonstracao")({
  validateSearch: (search: Record<string, unknown>) => {
    const n = Number(search.passo);
    const passo = n >= 1 && n <= 9 ? n : 1;
    return { passo: passo as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 };
  },
  head: () => ({ meta: [{ title: "Demonstração — Palpite Gol" }] }),
  component: Demonstracao,
});

function DemoTopBarRight() {
  const { user } = useAuth();
  if (user) return <SignOutButton compact />;
  return (
    <Link
      to="/"
      className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition px-1"
    >
      Sair
    </Link>
  );
}

function Demonstracao() {
  const { passo } = Route.useSearch();
  const navigate = useNavigate();
  const {
    draft: d,
    bolao: b,
    setStageId: setStage,
    setMatchId: setMatch,
    setStake: setStk,
    setSettings: setSet,
    setUserGuess: setGuess,
    setLiveScore: setLive,
    setFinalScore: setFinal,
    setMinute: setMin,
    markDemoEnded: markEnded,
    incrementMinute: incMin,
    updateRequestStatus: updateReq,
    resetDemo,
  } = useDemoBolao();

  const selectedMatch = MATCHES.find((m) => m.id === d.matchId) ?? DEMO_BOLAO.match;
  const stageMatches = matchesForStage(d.stageId);
  const stakeValue = String(d.stake);

  const goTo = (next: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) =>
    navigate({ to: "/demonstracao", search: { passo: next } });

  return (
    <Shell className="pb-44">
      <TopBar
        title="Demonstração"
        back={passo > 1 ? "/demonstracao" : "/"}
        backSearch={passo > 1 ? { passo: (passo - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 } : undefined}
        right={<DemoTopBarRight />}
      />
      <DemoFlowNav passo={passo} />

      {passo === 1 && <Passo1 draft={d} setStageId={setStage} goTo={goTo} />}
      {passo === 2 && (
        <Passo2
          stageMatches={stageMatches}
          selectedMatch={selectedMatch}
          draft={d}
          setMatchId={setMatch}
          goTo={goTo}
        />
      )}
      {passo === 3 && (
        <Passo3
          selectedMatch={selectedMatch}
          draft={d}
          stakeValue={stakeValue}
          setStake={setStk}
          setSettings={setSet}
          goTo={goTo}
        />
      )}
      {passo === 4 && <Passo4 bolao={b} goTo={goTo} />}
      {passo === 5 && <Passo5 bolao={b} goTo={goTo} />}
      {passo === 6 && <Passo6 bolao={b} draft={d} setUserGuess={setGuess} goTo={goTo} />}
      {passo === 7 && <Passo7 bolao={b} draft={d} updateRequestStatus={updateReq} goTo={goTo} />}
      {passo === 8 && (
        <Passo8
          bolao={b}
          draft={d}
          setLiveScore={setLive}
          setMinute={setMin}
          incrementMinute={incMin}
          goTo={goTo}
          setFinalScore={setFinal}
          markDemoEnded={markEnded}
        />
      )}
      {passo === 9 && <Passo9 bolao={b} draft={d} onRestart={resetDemo} goTo={goTo} />}
    </Shell>
  );
}

function Passo1({
  draft,
  setStageId,
  goTo,
}: {
  draft: ReturnType<typeof useDemoBolao>["draft"];
  setStageId: (id: string) => void;
  goTo: (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
}) {
  return (
    <div className="animate-rise space-y-5">
      <WorldCup2026Banner />
      <div>
        <h1 className="font-display text-xl font-bold">Escolha o campeonato</h1>
        <p className="text-muted-foreground mt-1 text-sm">Copa do Mundo FIFA 2026 — escolha a fase do bolão.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {STAGES.map((stage) => (
          <WorldCupStageCard
            key={stage.id}
            icon={stage.icon}
            label={stage.label}
            desc={stage.desc}
            selected={draft.stageId === stage.id}
            onClick={() => setStageId(stage.id)}
          />
        ))}
      </div>
      <PrimaryButton onClick={() => goTo(2)} variant="primary">
        Continuar <ChevronRight className="size-5" />
      </PrimaryButton>
    </div>
  );
}

function Passo2({
  stageMatches,
  selectedMatch,
  draft,
  setMatchId,
  goTo,
}: {
  stageMatches: typeof MATCHES;
  selectedMatch: (typeof MATCHES)[0];
  draft: ReturnType<typeof useDemoBolao>["draft"];
  setMatchId: (id: string) => void;
  goTo: (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
}) {
  return (
    <div className="animate-rise space-y-5">
      <WorldCup2026Banner compact />
      <div>
        <h1 className="font-display text-xl font-bold">Escolha a partida</h1>
        <p className="text-muted-foreground mt-1 text-sm">Selecione o jogo do seu bolão.</p>
      </div>
      <div className="space-y-2">
        {stageMatches.map((m) => {
          const selected = draft.matchId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMatchId(m.id)}
              className={`w-full rounded-2xl p-3.5 flex items-center justify-between transition border active:scale-[0.99] ${
                selected ? "border-primary/60 bg-primary/10" : "glass border-border hover:bg-surface-2/60"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex -space-x-1.5 shrink-0">
                  <TeamFlag code={m.homeCode} size="sm" className="ring-2 ring-background" />
                  <TeamFlag code={m.awayCode} size="sm" className="ring-2 ring-background" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-semibold text-sm truncate">{m.home} × {m.away}</div>
                  <div className="text-xs text-muted-foreground">{m.date} · {m.stage}</div>
                </div>
              </div>
              <div className={`size-6 rounded-full grid place-items-center border shrink-0 ${selected ? "bg-primary border-primary" : "border-border"}`}>
                {selected && <Check className="size-3.5 text-primary-foreground" />}
              </div>
            </button>
          );
        })}
      </div>
      {selectedMatch && (
        <div
          className="rounded-2xl p-4 flex flex-col items-center gap-3"
          style={{
            background: "linear-gradient(180deg, color-mix(in oklab, var(--primary) 15%, var(--surface)), var(--surface))",
            border: "1px solid color-mix(in oklab, var(--primary) 30%, transparent)",
          }}
        >
          <span className="chip text-[10px] text-primary border-primary/30">Jogo selecionado</span>
          <div className="flex items-center gap-4">
            <TeamFlag code={selectedMatch.homeCode} size="lg" />
            <div className="text-center">
              <div className="font-display font-bold text-lg">{selectedMatch.home}</div>
              <div className="text-muted-foreground text-sm font-bold">×</div>
              <div className="font-display font-bold text-lg">{selectedMatch.away}</div>
            </div>
            <TeamFlag code={selectedMatch.awayCode} size="lg" />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <PrimaryButton onClick={() => goTo(1)} variant="outline" className="flex-1">
          <ChevronLeft className="size-5" /> Voltar
        </PrimaryButton>
        <PrimaryButton onClick={() => goTo(3)} variant="primary" className="flex-[2]">
          Continuar <ChevronRight className="size-5" />
        </PrimaryButton>
      </div>
    </div>
  );
}

function Passo3({
  selectedMatch,
  draft,
  stakeValue,
  setStake,
  setSettings,
  goTo,
}: {
  selectedMatch: (typeof MATCHES)[0];
  draft: ReturnType<typeof useDemoBolao>["draft"];
  stakeValue: string;
  setStake: (n: number) => void;
  setSettings: ReturnType<typeof useDemoBolao>["setSettings"];
  goTo: (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
}) {
  return (
    <div className="animate-rise space-y-5">
      <WorldCup2026Banner compact />
      <div>
        <h1 className="font-display text-xl font-bold">Configure o bolão</h1>
        <p className="text-muted-foreground mt-1 text-sm">Valor da aposta e regras do jogo.</p>
      </div>
      <div className="rounded-2xl glass p-4 flex items-center gap-3">
        <TeamFlag code={selectedMatch.homeCode} size="sm" />
        <div className="flex-1 min-w-0 font-semibold text-sm truncate">
          {selectedMatch.home} × {selectedMatch.away}
        </div>
        <TeamFlag code={selectedMatch.awayCode} size="sm" />
      </div>
      <div>
        <h2 className="font-display font-semibold mb-3 text-sm">Valor da aposta</h2>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <span className="font-display text-gradient-gold text-2xl font-bold">R$</span>
          <input
            value={stakeValue}
            onChange={(e) => setStake(Number(e.target.value.replace(/\D/g, "")) || 0)}
            inputMode="numeric"
            className="bg-transparent flex-1 font-display text-3xl font-bold outline-none w-full tabular-nums"
            placeholder="10"
          />
          <span className="text-xs text-muted-foreground">por pessoa</span>
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          {STAKE_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setStake(Number(v))}
              className="chip"
              style={
                stakeValue === v
                  ? { background: "var(--gradient-green)", color: "var(--primary-foreground)", border: "none" }
                  : undefined
              }
            >
              R$ {v}
            </button>
          ))}
        </div>
      </div>
      <PlacarRulePicker
        exclusive={draft.settings.exclusiveScore}
        onChange={(exclusiveScore) => setSettings({ ...draft.settings, exclusiveScore })}
      />
      <div>
        <h2 className="font-display font-semibold mb-3 text-sm text-muted-foreground">Mais opções</h2>
        <div className="space-y-2">
        <SettingsToggle
          icon={<Users className="size-4" />}
          label="Mostrar participantes"
          sub="Todos veem quem está participando"
          value={draft.settings.participantsVisible}
          onChange={(participantsVisible) => setSettings({ ...draft.settings, participantsVisible })}
        />
        <SettingsToggle
          icon={draft.settings.showWinningNow ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          label="Mostrar quem está ganhando ao vivo"
          sub="Ranking e prêmio em tempo real"
          value={draft.settings.showWinningNow}
          onChange={(showWinningNow) => setSettings({ ...draft.settings, showWinningNow })}
        />
        </div>
      </div>
      <div className="flex gap-2">
        <PrimaryButton onClick={() => goTo(2)} variant="outline" className="flex-1">
          <ChevronLeft className="size-5" /> Voltar
        </PrimaryButton>
        <PrimaryButton
          onClick={() => goTo(4)}
          variant="gold"
          className={`flex-[2] ${draft.stake < 1 ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Link2 className="size-5" /> Gerar link
        </PrimaryButton>
      </div>
    </div>
  );
}

function Passo4({
  bolao,
  goTo,
}: {
  bolao: ReturnType<typeof useDemoBolao>["bolao"];
  goTo: (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = demoInviteUrl();

  const copy = () => {
    navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="animate-rise space-y-5">
      <div className="text-center">
        <div className="text-6xl mb-3">🎉</div>
        <h1 className="font-display text-3xl font-bold">Seu bolão está no ar</h1>
        <p className="text-muted-foreground mt-2">Envie este link para os convidados palpitarem.</p>
      </div>
      <div className="rounded-3xl glass p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-pitch)" }} />
        <div className="relative">
          <MatchHeader match={bolao.match} size="sm" variant="invite" label="Bolão da partida" />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <StatCard compact label="Entrada" value={`R$ ${bolao.stake}`} />
            <StatCard compact label="Placar" value={bolao.settings.exclusiveScore ? "Exclusivo" : "Repetido"} />
            <StatCard compact label="Modo" value="Ao vivo" />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="w-full glass rounded-2xl p-3.5 flex items-center justify-between active:scale-[0.99] transition"
      >
        <div className="text-left min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Link para convidados (demo)</div>
          <div className="text-sm font-medium truncate text-primary">{inviteUrl}</div>
        </div>
        {copied ? <Check className="size-5 text-primary" /> : <Copy className="size-5 text-muted-foreground" />}
      </button>
      <PrimaryButton onClick={() => goTo(7)} variant="gold">
        Administrar participantes
      </PrimaryButton>
      <PrimaryButton onClick={() => goTo(5)} variant="primary">
        Simular convite recebido
      </PrimaryButton>
      <p className="text-xs text-center text-muted-foreground">
        Demonstração isolada — sem login nem banco de dados.
      </p>
    </div>
  );
}

function Passo5({
  bolao,
  goTo,
}: {
  bolao: ReturnType<typeof useDemoBolao>["bolao"];
  goTo: (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
}) {
  return (
    <div className="animate-rise space-y-5">
      <div className="rounded-3xl glass p-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-50" style={{ background: "var(--gradient-pitch)" }} />
        <div className="relative">
          <MatchHeader match={bolao.match} size="sm" variant="invite" label="Você foi convidado" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon={<Wallet className="size-5" />} label="Prêmio atual" value={formatMoney(bolao.prize)} gold />
        <StatCard icon={<Users className="size-5" />} label="Participantes" value={String(bolao.participantCount)} />
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-1.5 font-display font-semibold text-sm mb-3">
          <Flame className="size-4 text-gold" /> Últimos palpites
        </div>
        <ul className="space-y-2.5">
          {bolao.recentGuesses.map((g) => (
            <li key={g.name + g.guess} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-surface-2 grid place-items-center font-display font-bold text-sm">
                  {g.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold">{g.name}</div>
                  <div className="text-xs text-muted-foreground">{g.time}</div>
                </div>
              </div>
              <div className="font-display font-bold tabular-nums">{g.guess}</div>
            </li>
          ))}
        </ul>
      </div>
      <PrimaryButton onClick={() => goTo(6)} variant="gold">
        Escolher meu placar
      </PrimaryButton>
      <p className="text-xs text-center text-muted-foreground">Entrada: R$ {bolao.stake}</p>
    </div>
  );
}

function Passo6({
  bolao,
  draft,
  setUserGuess,
  goTo,
}: {
  bolao: ReturnType<typeof useDemoBolao>["bolao"];
  draft: ReturnType<typeof useDemoBolao>["draft"];
  setUserGuess: ReturnType<typeof useDemoBolao>["setUserGuess"];
  goTo: (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
}) {
  const [nome, setNome] = useState("Você");
  const [home, setHome] = useState(draft.userGuess[0]);
  const [away, setAway] = useState(draft.userGuess[1]);
  const takenBy = draft.settings.exclusiveScore
    ? findTakenBy(bolao.takenScores, draft.requests, home, away)
    : undefined;

  const handleSubmit = () => {
    if (!nome.trim() || takenBy) return;
    setUserGuess([home, away]);
    goTo(7);
  };

  return (
    <div className="animate-rise space-y-5">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">Qual será o placar?</h1>
        <p className="text-muted-foreground mt-1">
          {draft.settings.exclusiveScore
            ? "Escolha seu placar acima e confira abaixo quais já foram pegos."
            : "Escolha seu palpite para este jogo."}
        </p>
      </div>
      <FormField label="Seu nome *">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full bg-transparent outline-none font-semibold text-sm"
        />
      </FormField>
      <ScorePicker match={bolao.match} home={home} away={away} onHomeChange={setHome} onAwayChange={setAway} />
      {draft.settings.exclusiveScore && (
      <div>
        {takenBy ? (
          <div className="rounded-2xl bg-destructive/15 border border-destructive/40 p-4 flex items-start gap-3">
            <X className="size-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Placar já escolhido</div>
              <div className="text-sm text-muted-foreground">{takenBy} escolheu primeiro.</div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-primary/15 border border-primary/40 p-4 flex items-start gap-3">
            <Check className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Placar disponível</div>
              <div className="text-sm text-muted-foreground">Garanta antes que alguém escolha.</div>
            </div>
          </div>
        )}
      </div>
      )}
      {draft.settings.exclusiveScore && (
        <TakenScoresList
          requests={draft.requests}
          showStatus={false}
          highlightGuess={takenBy ? formatScore([home, away]) : undefined}
        />
      )}
      <PrimaryButton
        onClick={handleSubmit}
        variant="gold"
        className={takenBy ? "opacity-50 pointer-events-none" : ""}
      >
        Solicitar aprovação
      </PrimaryButton>
    </div>
  );
}

function Passo7({
  bolao,
  draft,
  updateRequestStatus,
  goTo,
}: {
  bolao: ReturnType<typeof useDemoBolao>["bolao"];
  draft: ReturnType<typeof useDemoBolao>["draft"];
  updateRequestStatus: ReturnType<typeof useDemoBolao>["updateRequestStatus"];
  goTo: (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
}) {
  const approved = draft.requests.filter((r) => r.status === "approved").length;
  const feePercent = bolaoFeePercent(bolao.settings);
  const prize = calcPrize(approved || bolao.participants.length, bolao.stake, feePercent);

  return (
    <div className="animate-rise space-y-5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="size-4" /> Confirmados
          </div>
          <div className="font-display text-2xl font-bold mt-1">{approved}</div>
        </div>
        <div className="rounded-2xl p-4 demo-prize-banner">
          <div className="text-xs uppercase tracking-wider text-gold flex items-center gap-1.5">
            <Wallet className="size-4" /> Prêmio
          </div>
          <div className="font-display text-2xl font-bold mt-1 text-gradient-gold">{formatMoney(prize)}</div>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold">Participantes</h2>
          <span className="chip">{draft.requests.filter((r) => r.status === "pending").length} pendentes</span>
        </div>
        <ScrollableListPanel>
          {draft.requests.map((r, i) => (
            <li key={`${r.name}-${i}`} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-surface-2 grid place-items-center font-display font-bold">
                {r.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground">Palpite: {r.guess}</div>
              </div>
              {r.status === "pending" ? (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateRequestStatus(i, "rejected")}
                    className="size-10 rounded-xl bg-destructive/15 text-destructive grid place-items-center"
                  >
                    <X className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRequestStatus(i, "approved")}
                    className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center"
                  >
                    <Check className="size-5" />
                  </button>
                </div>
              ) : (
                <span className="chip shrink-0">{r.status === "approved" ? "Aprovado" : "Rejeitado"}</span>
              )}
            </li>
          ))}
        </ScrollableListPanel>
      </div>
      <PrimaryButton onClick={() => goTo(8)} variant="gold">
        Iniciar ao vivo
      </PrimaryButton>
    </div>
  );
}

function Passo8({
  bolao,
  draft,
  setLiveScore,
  setMinute,
  incrementMinute,
  goTo,
  setFinalScore,
  markDemoEnded,
}: {
  bolao: ReturnType<typeof useDemoBolao>["bolao"];
  draft: ReturnType<typeof useDemoBolao>["draft"];
  setLiveScore: ReturnType<typeof useDemoBolao>["setLiveScore"];
  setMinute: ReturnType<typeof useDemoBolao>["setMinute"];
  incrementMinute: ReturnType<typeof useDemoBolao>["incrementMinute"];
  goTo: (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
  setFinalScore: ReturnType<typeof useDemoBolao>["setFinalScore"];
  markDemoEnded: ReturnType<typeof useDemoBolao>["markDemoEnded"];
}) {
  const liveScore = draft.liveScore;
  const minute = draft.minute;

  useEffect(() => {
    if (draft.minute === 0) {
      setMinute(45);
      setLiveScore([2, 1]);
    }
  }, [draft.minute, setMinute, setLiveScore]);

  useEffect(() => {
    if (draft.minute === 0) return undefined;
    const t = setInterval(() => incrementMinute(), 4500);
    return () => clearInterval(t);
  }, [draft.minute, incrementMinute]);

  const feePercent = bolaoFeePercent(bolao.settings);
  const leaders = resolvePrizeLeaders(bolao.participants, liveScore, bolao.settings.exclusiveScore, false);
  const { totalPrize, perWinner } = calcPrizeShare(
    bolao.participants.length,
    bolao.stake,
    feePercent,
    leaders.length,
  );
  const sorted = rankParticipants(bolao.participants, liveScore);
  const winner = leaders[0];
  const you = sorted.find((p) => p.isYou);
  const yourStatus = you ? getParticipantStatus(you, leaders, { isEnded: false }) : null;

  const encerrar = () => {
    setFinalScore(liveScore);
    markDemoEnded();
    goTo(9);
  };

  return (
    <div className="animate-rise space-y-5">
      <div className="rounded-3xl glass p-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-60 demo-pitch-bg" style={{ background: "var(--gradient-pitch)" }} />
        <MatchHeader match={bolao.match} score={liveScore} live minute={minute} />
      </div>
      <div className="rounded-3xl glass p-4 space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground text-center">
          Atualize o placar (demonstração)
        </p>
        <GoalControl
          team={bolao.match.home}
          code={bolao.match.homeCode}
          onAdd={() => setLiveScore([Math.min(20, liveScore[0] + 1), liveScore[1]])}
          onRemove={() => setLiveScore([Math.max(0, liveScore[0] - 1), liveScore[1]])}
        />
        <GoalControl
          team={bolao.match.away}
          code={bolao.match.awayCode}
          onAdd={() => setLiveScore([liveScore[0], Math.min(20, liveScore[1] + 1)])}
          onRemove={() => setLiveScore([liveScore[0], Math.max(0, liveScore[1] - 1)])}
        />
      </div>
      {bolao.settings.showWinningNow && totalPrize > 0 && (
        <PrizeBanner prize={totalPrize} delta={bolao.prizeDelta} />
      )}
      {winner && bolao.settings.showWinningNow && (
        <div className="relative rounded-3xl p-5 overflow-hidden demo-card-gold">
          <div className="flex items-center gap-1.5">
            <Crown className="size-4 text-gold" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-gold font-bold">
              {leaders.length > 1 ? "Dividindo o prêmio agora" : "Cravou o placar agora"}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="size-14 rounded-2xl grid place-items-center font-display font-bold text-xl shrink-0" style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}>
              {winner.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl font-bold truncate">
                {leaders.length > 1 ? leaders.map((p) => p.name).join(", ") : winner.name}
              </div>
              <div className="text-sm text-muted-foreground">Palpite {formatScore(winner.guess)}</div>
            </div>
            <div className="font-display font-bold text-gradient-gold shrink-0 text-right">
              <div>{formatMoney(leaders.length > 1 ? perWinner : totalPrize)}</div>
              {leaders.length > 1 && <div className="text-[10px] text-muted-foreground font-normal">cada</div>}
            </div>
          </div>
        </div>
      )}
      {yourStatus && you && (
        <div className="rounded-2xl p-4" style={{ background: yourStatus.bg, border: `1px solid ${yourStatus.border}` }}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-display font-bold" style={{ color: yourStatus.color }}>
              {yourStatus.emoji} {yourStatus.label}
            </div>
            <div className="font-display font-bold tabular-nums">{formatScore(you.guess)}</div>
          </div>
        </div>
      )}
      <div>
        <h2 className="font-display font-semibold text-sm mb-2">Ranking</h2>
        <ScrollableListPanel>
          {sorted.map((p, i) => (
            <ParticipantRow key={`${p.name}-${i}`} participant={p} isLeader={i === 0 && p.alive} />
          ))}
        </ScrollableListPanel>
      </div>
      <button
        type="button"
        onClick={encerrar}
        className="w-full min-h-14 px-4 rounded-2xl font-display font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition btn-glow-gold"
        style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
      >
        <Lock className="size-5 shrink-0" />
        <span>Encerrar partida</span>
      </button>
    </div>
  );
}

function Passo9({
  bolao,
  draft,
  onRestart,
  goTo,
}: {
  bolao: ReturnType<typeof useDemoBolao>["bolao"];
  draft: ReturnType<typeof useDemoBolao>["draft"];
  onRestart: () => void;
  goTo: (n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) => void;
}) {
  const finalScore = draft.finalScore;
  const feePercent = bolaoFeePercent(bolao.settings);
  const winners = findFinalPrizeWinners(bolao.participants, finalScore, bolao.settings.exclusiveScore);
  const { totalPrize, perWinner } = calcPrizeShare(
    bolao.participants.length,
    bolao.stake,
    feePercent,
    winners.length,
  );
  const winnerGuess = winners[0]?.guess ?? bolao.winnerGuess;
  const winnerTitle =
    winners.length === 0
      ? "🏆 FIM DE JOGO"
      : winners.length === 1
        ? `🏆 ${winners[0].name}`
        : `🏆 ${winners.length} vencedores`;
  const winnerSubtitle =
    winners.length === 0
      ? "Ninguém cravou o placar final."
      : winners.length === 1
        ? "Venceu o bolão desta partida."
        : `${winners.map((w) => w.name).join(", ")} dividem o prêmio.`;

  return (
    <div className="animate-rise space-y-5">
      <div className="relative text-center">
        <div className="inline-grid place-items-center size-24 rounded-full mb-4 wc-final-trophy">
          <Trophy className="size-12" style={{ color: "var(--gold-foreground)" }} />
        </div>
        <div className="chip mx-auto">
          <Sparkles className="size-3.5 text-gold" /> Fim de jogo
        </div>
        <h1 className="font-display text-4xl font-black mt-3">{winnerTitle}</h1>
        <p className="text-lg mt-1">{winnerSubtitle}</p>
      </div>
      <div className="rounded-3xl glass p-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-50 demo-pitch-bg" style={{ background: "var(--gradient-pitch)" }} />
        <MatchHeader match={bolao.match} score={finalScore} label="Placar final" />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Palpite vencedor</div>
          <div className="font-display text-2xl font-bold mt-1 tabular-nums">{formatScoreDisplay(winnerGuess)}</div>
          {winners.length > 0 && (
            <div className="text-xs text-success mt-0.5">Placar cravado</div>
          )}
        </div>
        <div className="rounded-2xl p-4 demo-prize-banner">
          <div className="text-[10px] uppercase tracking-wider text-gold">Prêmio</div>
          <div className="font-display text-2xl font-bold mt-1 text-gradient-gold">
            {winners.length > 1 ? formatMoney(perWinner) : formatMoney(totalPrize)}
          </div>
          {winners.length > 1 && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatMoney(totalPrize)} total · {winners.length} vencedores
            </div>
          )}
        </div>
      </div>
      <PrimaryButton
        variant="gold"
        onClick={() => {
          const text = `${bolao.match.home} ${formatScore(finalScore)} ${bolao.match.away} — demonstração Palpite Gol`;
          navigator.share?.({ text, url: window.location.href }) ?? navigator.clipboard?.writeText(text);
        }}
      >
        <Share2 className="size-5" /> Compartilhar resultado
      </PrimaryButton>
      <PrimaryButton
        variant="primary"
        onClick={() => {
          onRestart();
          goTo(1);
        }}
      >
        Reiniciar demonstração
      </PrimaryButton>
      <PrimaryButton variant="outline" to="/">
        Sair para o início
      </PrimaryButton>
    </div>
  );
}

function GoalControl({
  team,
  code,
  onAdd,
  onRemove,
}: {
  team: string;
  code: string;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <TeamFlag code={code} size="sm" className="shrink-0" />
      <div className="flex-1 min-w-0 font-display font-bold text-sm">{team}</div>
      <div className="flex gap-2 shrink-0">
        <button type="button" onClick={onRemove} className="size-10 rounded-xl border border-border bg-surface/60 grid place-items-center">
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="h-10 px-3 rounded-xl font-display font-bold text-xs flex items-center gap-1"
          style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}
        >
          <Plus className="size-4" /> Gol
        </button>
      </div>
    </div>
  );
}
