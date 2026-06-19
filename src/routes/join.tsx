import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";
import { GuestRankingScreen } from "@/components/bolao/guest-ranking-screen";
import { MatchHeader } from "@/components/bolao/match-header";
import { ScorePicker } from "@/components/bolao/score-picker";
import { TakenScoresList } from "@/components/bolao/taken-scores-list";
import { StatCard } from "@/components/bolao/stat-card";
import { FormField } from "@/components/bolao/form-primitives";
import { getBolaoBySlug, submitBolaoPalpite } from "@/lib/api/boloes.server";
import { getGuestEntryStatus } from "@/lib/bolao/guest-entry-status";
import { loadGuestPick, saveGuestPick, type GuestPickSession } from "@/lib/bolao/guest-session";
import { formatMoney, formatScore, scoreKey } from "@/lib/bolao";
import { useBolaoRealtime } from "@/lib/bolao/use-bolao-realtime";
import { buildBolaoGuestFinalSearch } from "@/lib/bolao/share-url";
import type { Bolao } from "@/lib/bolao/types";
import { Check, Clock, Users, Wallet, X } from "lucide-react";

/** Link público de participação — sempre fluxo de convidado, nunca painel admin. */

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>) => ({
    bolao: typeof search.bolao === "string" ? search.bolao : undefined,
    guest: search.guest === "1" ? ("1" as const) : undefined,
  }),
  loader: async ({ location }) => {
    const slug = location.search.bolao as string | undefined;
    if (!slug) {
      return {
        slug: null,
        bolao: null as Bolao | null,
        bolaoId: null as string | null,
        partidaId: null as number | null,
        error: "Link inválido.",
      };
    }
    try {
      const result = await getBolaoBySlug({ data: { slug } });
      if (!result) {
        return { slug, bolao: null, bolaoId: null, partidaId: null, error: "Bolão não encontrado." };
      }
      return {
        slug,
        bolao: result.bolao,
        bolaoId: result.bolaoId,
        partidaId: result.partidaId,
        error: null,
      };
    } catch (err) {
      return {
        slug,
        bolao: null,
        bolaoId: null,
        partidaId: null,
        error: err instanceof Error ? err.message : "Erro",
      };
    }
  },
  head: () => ({ meta: [{ title: "Entrar no bolão" }] }),
  component: Join,
});

function Join() {
  const { bolao: slugFromSearch } = Route.useSearch();
  const { slug: loaderSlug, bolao: loaderBolao, bolaoId: loaderBolaoId, partidaId: loaderPartidaId, error } =
    Route.useLoaderData();
  const slug = slugFromSearch ?? loaderSlug ?? undefined;
  const getBolaoFn = useServerFn(getBolaoBySlug);
  const submitFn = useServerFn(submitBolaoPalpite);

  const [bolao, setBolao] = useState<Bolao | null>(loaderBolao);
  const [bolaoId, setBolaoId] = useState<string | null>(loaderBolaoId);
  const [partidaId, setPartidaId] = useState<number | null>(loaderPartidaId);
  const [guest, setGuest] = useState<GuestPickSession | null>(null);
  const [mode, setMode] = useState<"convite" | "palpite">("convite");
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setBolao(loaderBolao);
    setBolaoId(loaderBolaoId);
    setPartidaId(loaderPartidaId);
  }, [loaderBolao, loaderBolaoId, loaderPartidaId]);

  useEffect(() => {
    if (!slug) return;
    const stored = loadGuestPick(slug);
    setGuest(stored);
    if (stored) {
      setNome(stored.nome);
      setHome(stored.guess[0]);
      setAway(stored.guess[1]);
    }
  }, [slug]);

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

  if (!slug || error) {
    return (
      <Shell>
        <TopBar title="Bolão" useHistoryBack />
        <div className="glass rounded-2xl p-6 text-center text-sm text-red-400">{error ?? "Link inválido."}</div>
      </Shell>
    );
  }

  if (!activeBolao) {
    return (
      <Shell>
        <TopBar title="Bolão" useHistoryBack />
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Carregando bolão...</div>
      </Shell>
    );
  }

  const takenBy = activeBolao.takenScores[scoreKey([home, away])];
  const guestEntryStatus = guest ? getGuestEntryStatus(activeBolao, guest) : null;
  const confirmedCount = activeBolao.participants.length;

  const handleSubmit = async () => {
    if (!nome.trim()) {
      setSubmitError("Informe seu nome.");
      return;
    }
    if (activeBolao.settings.exclusiveScore && takenBy) {
      setSubmitError("Este placar já foi escolhido. Tente outro.");
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      await submitFn({
        data: {
          slug,
          nome: nome.trim(),
          cidade: cidade.trim() || undefined,
          palpiteCasa: home,
          palpiteFora: away,
        },
      });
      const nextGuest = { nome: nome.trim(), guess: [home, away] as [number, number] };
      saveGuestPick(slug, nextGuest);
      setGuest(nextGuest);
      setMode("convite");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao enviar palpite");
    } finally {
      setSaving(false);
    }
  };

  const showLiveRanking =
    activeBolao.isStarted &&
    activeBolao.status !== "encerrado" &&
    guest &&
    guestEntryStatus === "approved";

  if (activeBolao.status === "encerrado") {
    return <Navigate to="/final" search={buildBolaoGuestFinalSearch(slug)} replace />;
  }

  if (showLiveRanking) {
    return (
      <Shell className="pb-32">
        <TopBar title="Ranking ao vivo" useHistoryBack />
        {realtimeFallback}
        <GuestRankingScreen slug={slug} bolao={activeBolao} />
      </Shell>
    );
  }

  return (
    <Shell className="pb-32">
      <TopBar title="Link do bolão" useHistoryBack />

      {realtimeFallback}

      <div className="space-y-5">
        {activeBolao.isStarted && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm text-center text-muted-foreground animate-rise">
            O jogo já começou. Envie seu palpite e aguarde o organizador confirmar sua entrada.
          </div>
        )}
        <div className="rounded-3xl glass p-5 relative overflow-hidden animate-rise">
          <div className="absolute inset-0 opacity-50" style={{ background: "var(--gradient-pitch)" }} />
          <div className="relative">
            <MatchHeader match={activeBolao.match} size="sm" variant="invite" label="Você foi convidado" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 animate-rise">
          <StatCard icon={<Wallet className="size-5" />} label="Prêmio atual" value={formatMoney(activeBolao.prize)} gold />
          <StatCard icon={<Users className="size-5" />} label="Confirmados" value={String(confirmedCount)} />
        </div>

        {guest && mode === "convite" ? (
          <div className="space-y-4 animate-rise">
            <div className="glass rounded-2xl p-5 text-center space-y-3">
              <div
                className={`inline-grid place-items-center size-14 rounded-full ${
                  guestEntryStatus === "approved"
                    ? "bg-primary/20"
                    : guestEntryStatus === "rejected"
                      ? "bg-destructive/15"
                      : "bg-primary/15"
                }`}
              >
                {guestEntryStatus === "approved" ? (
                  <Check className="size-7 text-primary" />
                ) : guestEntryStatus === "rejected" ? (
                  <X className="size-7 text-destructive" />
                ) : (
                  <Clock className="size-7 text-primary" />
                )}
              </div>
              <div>
                <h1 className="font-display text-xl font-bold">
                  {guestEntryStatus === "approved"
                    ? "Entrada confirmada!"
                    : guestEntryStatus === "rejected"
                      ? "Entrada não aprovada"
                      : "Palpite enviado"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {guestEntryStatus === "approved"
                    ? "Seu palpite está valendo. Quando o jogo começar, este link abre o ranking ao vivo."
                    : guestEntryStatus === "rejected"
                      ? "O organizador não confirmou sua entrada neste bolão. Fale com quem te convidou."
                      : "Aguarde o organizador confirmar sua entrada. Quando o jogo começar, este mesmo link abre o ranking."}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-2/60 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Seu palpite</div>
                <div className="font-display text-3xl font-bold tabular-nums mt-1">{formatScore(guest.guess)}</div>
                <div className="text-sm text-muted-foreground mt-1">{guest.nome}</div>
              </div>
            </div>

            {guestEntryStatus !== "rejected" && (
              <PrimaryButton onClick={() => setMode("palpite")} variant="outline">
                Alterar palpite
              </PrimaryButton>
            )}
          </div>
        ) : mode === "palpite" ? (
          <div className="space-y-5 animate-rise">
            <div>
              <h1 className="font-display text-2xl font-bold">Escolha seu placar</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeBolao.settings.exclusiveScore
                  ? "Escolha seu placar acima e confira abaixo quais já foram pegos."
                  : "Preencha seu nome e palpite. Depois o organizador confirma sua entrada."}
              </p>
            </div>

            <div className="space-y-3">
              <FormField label="Seu nome *">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como te chamam no bolão"
                  className="w-full bg-transparent outline-none font-semibold text-sm"
                />
              </FormField>
              <FormField label="Cidade (opcional)">
                <input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                />
              </FormField>
            </div>

            <ScorePicker match={activeBolao.match} home={home} away={away} onHomeChange={setHome} onAwayChange={setAway} />

            {activeBolao.settings.exclusiveScore && (takenBy ? (
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
            ))}

            {activeBolao.settings.exclusiveScore && (
              <TakenScoresList
                requests={activeBolao.requests}
                showStatus={false}
                highlightGuess={takenBy ? formatScore([home, away]) : undefined}
              />
            )}

            {submitError && <p className="text-sm text-red-400 text-center">{submitError}</p>}

            <PrimaryButton
              onClick={handleSubmit}
              variant="gold"
              className={
                saving || (activeBolao.settings.exclusiveScore && Boolean(takenBy))
                  ? "opacity-50 pointer-events-none"
                  : ""
              }
            >
              {saving ? "Enviando..." : "Enviar palpite"}
            </PrimaryButton>
            <PrimaryButton onClick={() => setMode("convite")} variant="outline">
              Voltar
            </PrimaryButton>
          </div>
        ) : (
          <div className="space-y-4 animate-rise">
            <div className="glass rounded-2xl p-4 text-center">
              <h2 className="font-display font-semibold text-sm">Como funciona</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Escolha seu placar, envie seu nome e aguarde o organizador confirmar sua entrada.
              </p>
            </div>

            <PrimaryButton onClick={() => setMode("palpite")} variant="gold">
              Escolher meu placar
            </PrimaryButton>
            <p className="text-xs text-center text-muted-foreground">Entrada: R$ {activeBolao.stake}</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
