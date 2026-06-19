import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";
import { GuestRankingScreen } from "@/components/bolao/guest-ranking-screen";
import { MatchHeader } from "@/components/bolao/match-header";
import { ParticipantRow } from "@/components/bolao/participant-row";
import { ScrollableListPanel } from "@/components/bolao/scrollable-list-panel";
import { PrizeBanner } from "@/components/bolao/prize-banner";
import { TeamFlag } from "@/components/bolao/team-flag";
import { encerrarBolao, getBolaoBySlug, updateBolaoPlacar } from "@/lib/api/boloes.server";
import { useAuth } from "@/lib/auth/use-auth";
import { loadGuestPick } from "@/lib/bolao/guest-session";
import { buildBolaoGuestFinalSearch } from "@/lib/bolao/share-url";
import { useBolaoRealtime } from "@/lib/bolao/use-bolao-realtime";
import {
  bolaoFeePercent,
  calcPrizeShare,
  formatMoney,
  formatScore,
  getParticipantStatus,
  rankParticipants,
  resolvePrizeLeaders,
} from "@/lib/bolao";
import type { Bolao, Score } from "@/lib/bolao/types";
import { Crown, Plus, Minus, Lock, Frown } from "lucide-react";

export const Route = createFileRoute("/live")({
  validateSearch: (search: Record<string, unknown>) => ({
    bolao: typeof search.bolao === "string" ? search.bolao : undefined,
    slug: typeof search.slug === "string" ? search.slug : undefined,
    admin: search.admin === "1" ? ("1" as const) : undefined,
  }),
  loader: async ({ location }) => {
    const slug = (location.search.bolao ?? location.search.slug) as string | undefined;
    if (!slug) {
      return {
        slug: null,
        bolao: null as Bolao | null,
        bolaoId: null as string | null,
        partidaId: null as number | null,
        ownerId: null as string | null,
        error: "Informe o bolão.",
      };
    }
    try {
      const result = await getBolaoBySlug({ data: { slug } });
      if (!result) {
        return { slug, bolao: null, bolaoId: null, partidaId: null, ownerId: null, error: "Bolão não encontrado." };
      }
      return {
        slug,
        bolao: result.bolao,
        bolaoId: result.bolaoId,
        partidaId: result.partidaId,
        ownerId: result.ownerId,
        error: null,
      };
    } catch (err) {
      return {
        slug,
        bolao: null,
        bolaoId: null,
        partidaId: null,
        ownerId: null,
        error: err instanceof Error ? err.message : "Erro",
      };
    }
  },
  head: () => ({ meta: [{ title: "Ao vivo — Palpite Gol" }] }),
  component: Live,
});

function Live() {
  const { slug, bolao: loaderBolao, bolaoId: loaderBolaoId, partidaId: loaderPartidaId, ownerId, error } =
    Route.useLoaderData();
  const { admin } = Route.useSearch();
  const router = useRouter();
  const { user, getAccessToken, loading: authLoading } = useAuth();
  const getBolaoFn = useServerFn(getBolaoBySlug);
  const updatePlacarFn = useServerFn(updateBolaoPlacar);
  const encerrarBolaoFn = useServerFn(encerrarBolao);
  const isOwner = Boolean(user?.id && ownerId && user.id === ownerId);
  const isAdminLive = admin === "1" && isOwner;

  const [bolao, setBolao] = useState<Bolao | null>(loaderBolao);
  const [bolaoId, setBolaoId] = useState<string | null>(loaderBolaoId);
  const [partidaId, setPartidaId] = useState<number | null>(loaderPartidaId);
  const [liveScore, setLiveScore] = useState<Score>(loaderBolao?.liveScore ?? [0, 0]);
  const [minute, setMinute] = useState(loaderBolao?.minute ?? 0);
  const [savingScore, setSavingScore] = useState(false);
  const [endingGame, setEndingGame] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  useEffect(() => {
    setBolao(loaderBolao);
    setBolaoId(loaderBolaoId);
    setPartidaId(loaderPartidaId);
  }, [loaderBolao, loaderBolaoId, loaderPartidaId]);

  useEffect(() => {
    if (bolao) {
      setLiveScore(bolao.liveScore);
      setMinute(bolao.minute);
    }
  }, [bolao]);

  useEffect(() => {
    const t = setInterval(() => setMinute((m) => Math.min(90, m + 1)), 4500);
    return () => clearInterval(t);
  }, []);

  const refreshBolao = useCallback(async () => {
    if (!slug) return;
    try {
      const result = await getBolaoFn({ data: { slug } });
      if (result?.bolao) {
        setBolao(result.bolao);
        setBolaoId(result.bolaoId);
        setPartidaId(result.partidaId);
      }
    } catch {
      // Mantem a ultima versao carregada se houver falha temporaria de rede.
    }
  }, [getBolaoFn, slug]);

  useEffect(() => {
    void refreshBolao();
  }, [refreshBolao]);

  const activeBolao = bolao ?? loaderBolao;
  const activeBolaoId = bolaoId ?? loaderBolaoId;
  const activePartidaId = partidaId ?? loaderPartidaId;
  const [guestSession, setGuestSession] = useState<ReturnType<typeof loadGuestPick>>(null);

  useEffect(() => {
    if (slug) setGuestSession(loadGuestPick(slug));
  }, [slug]);

  const { status: realtimeStatus, refreshManual } = useBolaoRealtime({
    slug,
    bolaoId: activeBolaoId,
    partidaId: activePartidaId,
    enabled: Boolean(slug && activeBolaoId),
    onRefresh: refreshBolao,
  });

  const realtimeFallback = realtimeStatus === "disconnected" && (
    <button
      type="button"
      onClick={refreshManual}
      className="mb-4 w-full rounded-2xl border border-border/70 bg-surface/40 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
    >
      Conexão instável — toque para atualizar
    </button>
  );

  const participantsWithYou = useMemo(() => {
    if (!activeBolao || !guestSession) return activeBolao?.participants ?? [];
    return activeBolao.participants.map((p) =>
      p.name.toLowerCase() === guestSession.nome.toLowerCase() ? { ...p, isYou: true } : p,
    );
  }, [activeBolao, guestSession]);

  if (!slug || error) {
    return (
      <Shell>
        <TopBar title="Ao vivo" useHistoryBack />
        <div className="glass rounded-2xl p-6 text-center text-sm text-red-400">{error ?? "Informe o bolão."}</div>
      </Shell>
    );
  }

  if (!activeBolao) {
    return (
      <Shell>
        <TopBar title="Ao vivo" useHistoryBack />
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Carregando bolão...</div>
      </Shell>
    );
  }

  if (authLoading && admin === "1") {
    return (
      <Shell>
        <TopBar title="Ao vivo" hideBack />
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Carregando...</div>
      </Shell>
    );
  }

  if (!isAdminLive) {
    const isEnded = activeBolao.status === "encerrado";
    if (isEnded) {
      return <Navigate to="/final" search={buildBolaoGuestFinalSearch(slug)} replace />;
    }
    return (
      <Shell className="pb-44">
        <TopBar title="Ranking ao vivo" back="/join" backSearch={{ bolao: slug }} />
        {realtimeFallback}
        <GuestRankingScreen slug={slug} bolao={activeBolao} liveScore={liveScore} />
      </Shell>
    );
  }

  const feePercent = bolaoFeePercent(activeBolao.settings);
  const isEnded = activeBolao.status === "encerrado";
  const rankingScore = isEnded ? activeBolao.liveScore : liveScore;
  const leaders = resolvePrizeLeaders(participantsWithYou, rankingScore, activeBolao.settings.exclusiveScore, isEnded);
  const { totalPrize, perWinner } = calcPrizeShare(
    activeBolao.participants.length,
    activeBolao.stake,
    feePercent,
    leaders.length,
  );
  const sorted = rankParticipants(participantsWithYou, rankingScore);
  const winner = leaders[0];
  const you = sorted.find((p) => p.isYou);
  const yourStatus = you ? getParticipantStatus(you, leaders, { isEnded }) : null;
  const ranking = sorted;
  const allEliminated = participantsWithYou.length > 0 && leaders.length === 0;

  const saveScore = async (nextScore: Score) => {
    const token = getAccessToken();
    if (!token || !slug) {
      setScoreError("Sessão expirada. Entre novamente para atualizar o placar.");
      return;
    }

    setLiveScore(nextScore);
    setSavingScore(true);
    setScoreError(null);
    try {
      await updatePlacarFn({
        data: {
          accessToken: token,
          slug,
          placarCasa: nextScore[0],
          placarFora: nextScore[1],
        },
      });
      await router.invalidate();
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : "Erro ao salvar placar");
      setLiveScore(activeBolao.liveScore);
    } finally {
      setSavingScore(false);
    }
  };

  const handleEndGame = async () => {
    const token = getAccessToken();
    if (!token || !slug) {
      setScoreError("Sessão expirada. Entre novamente para encerrar a partida.");
      return;
    }

    const ok = window.confirm(
      `Encerrar esta partida com o placar ${liveScore[0]}×${liveScore[1]}? Essa ação fecha o bolão e deve ser usada com cuidado.`,
    );
    if (!ok) return;

    setEndingGame(true);
    setScoreError(null);
    try {
      await encerrarBolaoFn({
        data: {
          accessToken: token,
          slug,
          placarCasa: liveScore[0],
          placarFora: liveScore[1],
        },
      });
      await router.invalidate();
      await router.navigate({
        to: "/final",
        search: { bolao: slug, score: `${liveScore[0]}-${liveScore[1]}` },
      });
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : "Erro ao encerrar partida");
    } finally {
      setEndingGame(false);
    }
  };

  return (
    <Shell className="pb-32">
      <TopBar
        title={isEnded ? "Partida encerrada" : "Ao vivo — admin"}
        back="/admin"
        backSearch={{ bolao: slug }}
      />

      <div className="rounded-3xl glass p-5 relative overflow-hidden animate-rise">
        <div className="absolute inset-0 opacity-60 demo-pitch-bg" style={{ background: "var(--gradient-pitch)" }} />
        <MatchHeader match={activeBolao.match} score={rankingScore} live={!isEnded} ended={isEnded} minute={minute} />
      </div>

      {isAdminLive && !isEnded && (
        <div className="mt-4 rounded-3xl glass p-4 space-y-3 animate-rise">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground text-center">
            Atualize o placar (salva no banco)
          </p>
          {scoreError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
              {scoreError}
            </div>
          )}
          <GoalControl
            team={activeBolao.match.home}
            code={activeBolao.match.homeCode}
            disabled={savingScore}
            onAdd={() => saveScore([Math.min(20, liveScore[0] + 1), liveScore[1]])}
            onRemove={() => saveScore([Math.max(0, liveScore[0] - 1), liveScore[1]])}
          />
          <GoalControl
            team={activeBolao.match.away}
            code={activeBolao.match.awayCode}
            disabled={savingScore}
            onAdd={() => saveScore([liveScore[0], Math.min(20, liveScore[1] + 1)])}
            onRemove={() => saveScore([liveScore[0], Math.max(0, liveScore[1] - 1)])}
          />
          <p className="text-xs text-muted-foreground text-center">
            {savingScore ? "Salvando placar..." : "Ranking e links públicos atualizam automaticamente."}
          </p>
        </div>
      )}

      {activeBolao.settings.showWinningNow && totalPrize > 0 && (
        <div className="mt-4 animate-rise">
          <PrizeBanner prize={totalPrize} delta={0} />
        </div>
      )}

      {winner && activeBolao.settings.showWinningNow && (
        <div className="mt-4 relative animate-rise">
          <div className="relative rounded-3xl p-5 overflow-hidden demo-card-gold">
            <div className="flex items-center gap-1.5">
              <Crown className="size-4 text-gold" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-gold font-bold">
                {isEnded
                  ? leaders.length > 1
                    ? "Vencedores do bolão"
                    : "Vencedor do bolão"
                  : leaders.length > 1
                    ? "Dividindo a liderança agora"
                    : "Cravou o placar agora"}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="size-14 rounded-2xl grid place-items-center font-display font-bold text-xl shrink-0"
                style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
              >
                {winner.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl font-bold truncate">
                  {leaders.length > 1
                    ? `${leaders.map((p) => p.name).join(", ")}`
                    : winner.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Palpite {formatScore(winner.guess)}
                  {isEnded && " · placar cravado"}
                </div>
              </div>
              <div className="font-display font-bold text-gradient-gold shrink-0 text-right">
                <div>{formatMoney(leaders.length > 1 ? perWinner : totalPrize)}</div>
                {leaders.length > 1 && (
                  <div className="text-[10px] text-muted-foreground font-normal">cada</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {allEliminated && (
        <div className="mt-4 glass rounded-3xl p-5 text-center border border-border/70 animate-rise">
          <div className="mx-auto size-16 rounded-full bg-surface-2 grid place-items-center mb-3">
            <Frown className="size-9 text-muted-foreground" />
          </div>
          <div className="font-display font-bold text-lg">
            {isEnded ? "Ninguém cravou" : "Aguardando placar exato"}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isEnded
              ? "Ninguém cravou o placar final."
              : "Ninguém cravou o placar atual. Só quem acertar o resultado exato leva o prêmio."}
          </p>
        </div>
      )}

      {yourStatus && you && (
        <div
          className="mt-4 rounded-2xl p-4 animate-rise"
          style={{ background: yourStatus.bg, border: `1px solid ${yourStatus.border}` }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-display font-bold" style={{ color: yourStatus.color }}>
              {yourStatus.emoji} {yourStatus.label}
            </div>
            <div className="font-display font-bold tabular-nums">{formatScore(you.guess)}</div>
          </div>
        </div>
      )}

      <div className="mt-6 animate-rise">
        <h2 className="font-display font-semibold text-sm mb-2">
          {isAdminLive ? "Ranking completo" : "Ranking"}
        </h2>
        {ranking.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Nenhum participante aprovado ainda.
            {!isAdminLive && " Aguarde o administrador confirmar os palpites."}
          </div>
        ) : (
          <ScrollableListPanel>
            {ranking.map((p, i) => (
              <ParticipantRow
                key={`${p.name}-${i}`}
                participant={p}
                isLeader={leaders.some(
                  (leader) =>
                    leader.name === p.name &&
                    leader.guess[0] === p.guess[0] &&
                    leader.guess[1] === p.guess[1],
                )}
              />
            ))}
          </ScrollableListPanel>
        )}
      </div>

      {isAdminLive && (
        <PrimaryButton
          onClick={isEnded ? undefined : handleEndGame}
          to={isEnded ? "/final" : undefined}
          search={isEnded ? { bolao: slug } : undefined}
          variant="gold"
          className={`mt-6 animate-rise ${endingGame ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Lock className="size-5 shrink-0" />
          <span>{isEnded ? "Ver resultado encerrado" : endingGame ? "Encerrando..." : "Encerrar partida com cuidado"}</span>
        </PrimaryButton>
      )}
    </Shell>
  );
}

function GoalControl({
  team,
  code,
  disabled,
  onAdd,
  onRemove,
}: {
  team: string;
  code: string;
  disabled?: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <TeamFlag code={code} size="sm" className="shrink-0" />
      <div className="flex-1 min-w-0 font-display font-bold text-sm">{team}</div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="size-10 rounded-xl border border-border bg-surface/60 grid place-items-center active:scale-95 transition disabled:opacity-50"
          aria-label={`Remover gol ${team}`}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="h-10 px-3 rounded-xl font-display font-bold text-xs flex items-center gap-1 active:scale-95 transition disabled:opacity-50"
          style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}
        >
          <Plus className="size-4" /> Gol
        </button>
      </div>
    </div>
  );
}
