import { createFileRoute, isRedirect, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";
import { MatchHeader } from "@/components/bolao/match-header";
import { getBolaoBySlug, reabrirBolaoAoVivo } from "@/lib/api/boloes.server";
import { useAuth } from "@/lib/auth/use-auth";
import { useBolaoRealtime } from "@/lib/bolao/use-bolao-realtime";
import { buildBolaoGuestFinalSearch, buildBolaoGuestFinalUrl, buildBolaoGuestJoinSearch } from "@/lib/bolao/share-url";
import {
  bolaoFeePercent,
  calcPrizeShare,
  findFinalPrizeWinners,
  formatMoney,
  formatScore,
  formatScoreDisplay,
} from "@/lib/bolao";
import type { Bolao, Score } from "@/lib/bolao/types";
import { Share2, Trophy, Sparkles, RotateCcw } from "lucide-react";

function parseScoreParam(raw: string | undefined): Score | null {
  if (!raw) return null;
  const m = raw.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

export const Route = createFileRoute("/final")({
  validateSearch: (search: Record<string, unknown>) => ({
    bolao: typeof search.bolao === "string" ? search.bolao : undefined,
    slug: typeof search.slug === "string" ? search.slug : undefined,
    score: typeof search.score === "string" ? search.score : undefined,
    guest: search.guest === "1" ? ("1" as const) : undefined,
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
        finalScore: null as Score | null,
        guestMode: false,
        error: "Informe o bolão.",
      };
    }
    try {
      const result = await getBolaoBySlug({ data: { slug } });
      if (!result) {
        return {
          slug,
          bolao: null,
          bolaoId: null,
          partidaId: null,
          ownerId: null,
          finalScore: null,
          guestMode: false,
          error: "Bolão não encontrado.",
        };
      }
      const fromQuery = parseScoreParam(location.search.score as string | undefined);
      const guestMode = location.search.guest === "1";
      const isEnded = result.bolao.status === "encerrado";

      if (guestMode && !isEnded && !fromQuery && result.bolao.isStarted) {
        const finalScore = result.bolao.finalScore;
        return {
          slug,
          bolao: result.bolao,
          bolaoId: result.bolaoId,
          partidaId: result.partidaId,
          ownerId: result.ownerId,
          finalScore,
          guestMode: true,
          error: null,
        };
      }

      if (!isEnded && !fromQuery) {
        throw redirect({ to: "/join", search: buildBolaoGuestJoinSearch(slug) });
      }
      const finalScore = fromQuery ?? result.bolao.finalScore;
      return {
        slug,
        bolao: result.bolao,
        bolaoId: result.bolaoId,
        partidaId: result.partidaId,
        ownerId: result.ownerId,
        finalScore,
        guestMode,
        error: null,
      };
    } catch (err) {
      if (isRedirect(err)) throw err;
      return {
        slug,
        bolao: null,
        bolaoId: null,
        partidaId: null,
        ownerId: null,
        finalScore: null,
        guestMode: false,
        error: err instanceof Error ? err.message : "Erro",
      };
    }
  },
  head: () => ({ meta: [{ title: "Resultado — Palpite Gol" }] }),
  component: Final,
});

function Final() {
  const { guest: guestModeFromSearch } = Route.useSearch();
  const {
    slug,
    bolao: loaderBolao,
    bolaoId,
    partidaId,
    ownerId,
    finalScore,
    guestMode: guestModeFromLoader,
    error,
  } = Route.useLoaderData();
  const isGuestView = guestModeFromSearch === "1" || guestModeFromLoader;
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuth();
  const getBolaoFn = useServerFn(getBolaoBySlug);
  const reabrirFn = useServerFn(reabrirBolaoAoVivo);
  const [bolao, setBolao] = useState(loaderBolao);
  const [reabrindo, setReabrindo] = useState(false);
  const [reabrirError, setReabrirError] = useState<string | null>(null);
  const isOwner = Boolean(!isGuestView && user?.id && ownerId && user.id === ownerId);

  useEffect(() => {
    setBolao(loaderBolao);
  }, [loaderBolao]);

  const refreshBolao = useCallback(async () => {
    if (!slug) return;
    try {
      const result = await getBolaoFn({ data: { slug } });
      if (result?.bolao) setBolao(result.bolao);
    } catch {
      // Mantém a última versão carregada se houver falha temporária de rede.
    }
  }, [getBolaoFn, slug]);

  const activeBolao = bolao ?? loaderBolao;

  useBolaoRealtime({
    slug,
    bolaoId,
    partidaId,
    enabled: Boolean(slug && bolaoId && (activeBolao?.status === "encerrado" || isGuestView)),
    onRefresh: refreshBolao,
  });

  if (!slug || error || !activeBolao || !finalScore) {
    return (
      <Shell>
        <TopBar title="Resultado" back="/create" backSearch={{ aba: "meus" }} />
        <div className="glass rounded-2xl p-6 text-center text-sm text-red-400">
          {error ?? (!activeBolao ? "Carregando bolão..." : "Placar final indisponível.")}
        </div>
      </Shell>
    );
  }

  const feePercent = bolaoFeePercent(activeBolao.settings);
  const winners = findFinalPrizeWinners(activeBolao.participants, finalScore, activeBolao.settings.exclusiveScore);
  const { totalPrize, perWinner } = calcPrizeShare(
    activeBolao.participants.length,
    activeBolao.stake,
    feePercent,
    winners.length,
  );
  const winnerGuess = winners[0]?.guess ?? activeBolao.winnerGuess;
  const winnerTitle =
    winners.length === 0
      ? activeBolao.participants.length === 0
        ? "🏆 FIM DE JOGO"
        : "🏆 FIM DE JOGO"
      : winners.length === 1
        ? `🏆 ${winners[0].name}`
        : `🏆 ${winners.length} vencedores`;
  const winnerSubtitle =
    winners.length === 0
      ? activeBolao.participants.length === 0
        ? "Nenhum participante aprovado."
        : "Ninguém cravou o placar final."
      : winners.length === 1
        ? "Venceu o bolão desta partida."
        : `${winners.map((w) => w.name).join(", ")} dividem o prêmio.`;

  const handleReabrir = async () => {
    const token = getAccessToken();
    if (!token || !slug) {
      setReabrirError("Sessão expirada. Entre novamente para reabrir a partida.");
      return;
    }

    const ok = window.confirm(
      "Reabrir esta partida ao vivo? Use apenas se o encerramento foi feito por engano.",
    );
    if (!ok) return;

    setReabrindo(true);
    setReabrirError(null);
    try {
      await reabrirFn({ data: { accessToken: token, slug } });
      await navigate({ to: "/live", search: { bolao: slug, admin: "1" } });
    } catch (err) {
      setReabrirError(err instanceof Error ? err.message : "Erro ao reabrir partida");
    } finally {
      setReabrindo(false);
    }
  };

  return (
    <Shell className="pb-32">
      <TopBar title="Resultado" hideBack />

      <div className="relative text-center animate-rise">
        <div
          className="absolute inset-x-0 -top-6 h-48 -z-0 opacity-70 blur-3xl hidden sm:block"
          style={{ background: "radial-gradient(ellipse at center, var(--gold), transparent 70%)" }}
        />
        <div className="relative">
          <div className="inline-grid place-items-center size-24 rounded-full mb-4 wc-final-trophy">
            <Trophy className="size-12" style={{ color: "var(--gold-foreground)" }} />
          </div>
          <div className="chip mx-auto">
            <Sparkles className="size-3.5 text-gold" /> Fim de jogo
          </div>
          <h1 className="font-display text-4xl font-black mt-3">{winnerTitle}</h1>
          <p className="text-lg mt-1">{winnerSubtitle}</p>
        </div>
      </div>

      <div className="mt-7 rounded-3xl glass p-5 relative overflow-hidden animate-rise">
        <div className="absolute inset-0 opacity-50 demo-pitch-bg" style={{ background: "var(--gradient-pitch)" }} />
        <MatchHeader match={activeBolao.match} score={finalScore} label="Placar final" ended />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 animate-rise">
        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Palpite vencedor</div>
          <div className="font-display text-2xl font-bold mt-1 tabular-nums">
            {winners.length > 0 ? formatScoreDisplay(winnerGuess) : "—"}
          </div>
          <div className="text-xs text-success mt-0.5">
            {winners.length === 0 ? "Sem vencedor" : "Placar cravado"}
          </div>
        </div>
        <div className="rounded-2xl p-4 demo-prize-banner">
          <div className="text-[10px] uppercase tracking-wider text-gold">Prêmio</div>
          <div className="font-display text-2xl font-bold mt-1 text-gradient-gold">
            {winners.length > 1 ? formatMoney(perWinner) : formatMoney(totalPrize)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {winners.length > 1
              ? `${formatMoney(totalPrize)} total · ${winners.length} vencedores`
              : `${activeBolao.participants.length} confirmados`}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <PrimaryButton
          variant="gold"
          onClick={() => {
            const shareUrl = isGuestView && slug
              ? buildBolaoGuestFinalUrl(slug)
              : window.location.href;
            const text = `${activeBolao.match.home} ${formatScore(finalScore)} ${activeBolao.match.away} — bolão Palpite Gol`;
            navigator.share?.({ text, url: shareUrl }) ?? navigator.clipboard?.writeText(`${text}\n${shareUrl}`);
          }}
        >
          <Share2 className="size-5" /> Compartilhar resultado
        </PrimaryButton>
        {isOwner && (
          <PrimaryButton variant="primary" to="/admin" search={{ bolao: slug }}>
            Voltar ao painel do bolão
          </PrimaryButton>
        )}
        {isOwner && (
          <>
            {reabrirError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
                {reabrirError}
              </div>
            )}
            <PrimaryButton
              variant="outline"
              onClick={handleReabrir}
              className={`border-red-400/40 text-red-400 ${reabrindo ? "opacity-50 pointer-events-none" : ""}`}
            >
              <RotateCcw className="size-5" />
              {reabrindo ? "Reabrindo..." : "Reabrir partida ao vivo"}
            </PrimaryButton>
          </>
        )}
        <PrimaryButton variant="outline" to="/create" search={{ aba: "meus" }}>
          Voltar ao início
        </PrimaryButton>
      </div>

      <div className="mt-10 text-center text-xs text-muted-foreground">Que venha o próximo jogo. 🔥</div>
    </Shell>
  );
}
