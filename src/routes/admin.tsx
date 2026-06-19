import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";
import { LeaveToMeusButton } from "@/components/auth-sign-out";
import { ScorePicker } from "@/components/bolao/score-picker";
import { FormField, SettingsToggle } from "@/components/bolao/form-primitives";
import { PlacarRulePicker } from "@/components/bolao/placar-rule-picker";
import { ScrollableListPanel } from "@/components/bolao/scrollable-list-panel";
import {
  getBolaoBySlug,
  updateParticipanteStatus,
  addParticipanteManual,
  updateBolao,
  startBolaoAoVivo,
  reabrirBolaoAoVivo,
  deleteBolao,
} from "@/lib/api/boloes.server";
import { useAuth } from "@/lib/auth/use-auth";
import { useBolaoOwnerGuard } from "@/lib/bolao/use-bolao-owner";
import { useBolaoRealtime } from "@/lib/bolao/use-bolao-realtime";
import { isParticipantePending } from "@/lib/bolao/guest-entry-status";
import { buildBolaoGuestJoinSearch, buildBolaoJoinPath, buildBolaoJoinUrl, getShareUrlMobileWarning } from "@/lib/bolao/share-url";
import { STAKE_PRESETS, bolaoFeePercent, calcPrize, formatScore, scoreKey } from "@/lib/bolao";
import type { Bolao } from "@/lib/bolao/types";
import {
  Check, X, Lock, Users, Wallet, UserPlus, ClipboardList, Settings2, Trash2, Copy, Radio, RotateCcw,
} from "lucide-react";

type ParticipanteRow = {
  id: string;
  nome: string;
  palpite_casa: number;
  palpite_fora: number;
  status: string;
};

type AdminTab = "convite" | "solicitacoes" | "adicionar" | "bolao";

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => ({
    bolao: typeof search.bolao === "string" ? search.bolao : undefined,
    slug: typeof search.slug === "string" ? search.slug : undefined,
    aba:
      search.aba === "adicionar"
        ? ("adicionar" as const)
        : search.aba === "bolao"
          ? ("bolao" as const)
          : search.aba === "solicitacoes"
            ? ("solicitacoes" as const)
            : ("convite" as const),
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
        participantes: [] as ParticipanteRow[],
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
          participantes: [],
          error: "Bolão não encontrado.",
        };
      }
      return {
        slug,
        bolao: result.bolao,
        bolaoId: result.bolaoId,
        partidaId: result.partidaId,
        ownerId: result.ownerId,
        participantes: result.participantes,
        error: null,
      };
    } catch (err) {
      return {
        slug,
        bolao: null,
        bolaoId: null,
        partidaId: null,
        ownerId: null,
        participantes: [],
        error: err instanceof Error ? err.message : "Erro",
      };
    }
  },
  head: () => ({ meta: [{ title: "Administrador — Palpite Gol" }] }),
  component: Admin,
});

function Admin() {
  const {
    slug,
    bolao: loaderBolao,
    bolaoId: loaderBolaoId,
    partidaId: loaderPartidaId,
    ownerId,
    participantes: loaderParticipantes,
    error,
  } = Route.useLoaderData();
  const { aba: initialAba } = Route.useSearch();
  const router = useRouter();
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const getBolaoFn = useServerFn(getBolaoBySlug);
  const updateFn = useServerFn(updateParticipanteStatus);
  const addManualFn = useServerFn(addParticipanteManual);
  const updateBolaoFn = useServerFn(updateBolao);
  const startBolaoFn = useServerFn(startBolaoAoVivo);
  const reabrirBolaoFn = useServerFn(reabrirBolaoAoVivo);
  const deleteBolaoFn = useServerFn(deleteBolao);

  const [bolao, setBolao] = useState(loaderBolao);
  const [bolaoId, setBolaoId] = useState(loaderBolaoId);
  const [partidaId, setPartidaId] = useState(loaderPartidaId);
  const [participantes, setParticipantes] = useState(loaderParticipantes);
  const [updating, setUpdating] = useState<string | null>(null);
  const [aba, setAba] = useState<AdminTab>(initialAba);
  const prevAbaRef = useRef(aba);

  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [aprovarDireto, setAprovarDireto] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editStake, setEditStake] = useState(bolao?.stake ?? 10);
  const [editExclusive, setEditExclusive] = useState(bolao?.settings.exclusiveScore ?? true);
  const [editTaxaPercent, setEditTaxaPercent] = useState(bolao?.settings.taxaPercent ?? 0);
  const [savingBolao, setSavingBolao] = useState(false);
  const [startingLive, setStartingLive] = useState(false);
  const [reabrindoLive, setReabrindoLive] = useState(false);
  const [deletingBolao, setDeletingBolao] = useState(false);
  const [bolaoFormError, setBolaoFormError] = useState<string | null>(null);
  const [participanteError, setParticipanteError] = useState<string | null>(null);
  const [copiedConvite, setCopiedConvite] = useState(false);
  const prevPendingRef = useRef(0);
  const [highlightPedidos, setHighlightPedidos] = useState(false);

  const pendingCount = useMemo(
    () => participantes.filter((p) => isParticipantePending(p.status)).length,
    [participantes],
  );

  useEffect(() => {
    if (pendingCount > prevPendingRef.current) {
      setHighlightPedidos(true);
      const t = window.setTimeout(() => setHighlightPedidos(false), 5000);
      prevPendingRef.current = pendingCount;
      return () => window.clearTimeout(t);
    }
    prevPendingRef.current = pendingCount;
  }, [pendingCount]);

  const { loading: authLoading, isOwner } = useBolaoOwnerGuard(ownerId, slug ?? "");

  useEffect(() => {
    setBolao(loaderBolao);
    setBolaoId(loaderBolaoId);
    setPartidaId(loaderPartidaId);
    setParticipantes(loaderParticipantes);
  }, [loaderBolao, loaderBolaoId, loaderPartidaId, loaderParticipantes]);

  useEffect(() => {
    if (bolao && aba === "bolao" && prevAbaRef.current !== "bolao") {
      setEditStake(bolao.stake);
      setEditExclusive(bolao.settings.exclusiveScore);
      setEditTaxaPercent(bolao.settings.taxaPercent);
    }
    prevAbaRef.current = aba;
  }, [bolao, aba]);

  const refreshAdmin = useCallback(async () => {
    if (!slug) return;
    try {
      const result = await getBolaoFn({ data: { slug } });
      if (result?.bolao) {
        setBolao(result.bolao);
        setBolaoId(result.bolaoId);
        setPartidaId(result.partidaId);
        setParticipantes(result.participantes);
      }
    } catch {
      // Mantem a ultima versao carregada se houver falha temporaria de rede.
    }
  }, [getBolaoFn, slug]);

  useEffect(() => {
    if (!isOwner) return;
    void refreshAdmin();
  }, [isOwner, refreshAdmin]);

  const activeBolao = bolao ?? loaderBolao;
  const activeBolaoId = bolaoId ?? loaderBolaoId;
  const activePartidaId = partidaId ?? loaderPartidaId;
  const activeParticipantes = participantes.length > 0 ? participantes : loaderParticipantes;

  const { status: realtimeStatus, refreshManual } = useBolaoRealtime({
    slug,
    bolaoId: activeBolaoId,
    partidaId: activePartidaId,
    enabled: Boolean(slug && activeBolaoId && isOwner),
    onRefresh: refreshAdmin,
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

  if (!authLoading && slug && ownerId && !isOwner) {
    return <Navigate to="/join" search={buildBolaoGuestJoinSearch(slug)} replace />;
  }

  if (!slug || error) {
    return (
      <Shell>
        <TopBar title="Admin" back="/create" backSearch={{ aba: "meus" }} right={<LeaveToMeusButton compact />} />
        <div className="glass rounded-2xl p-6 text-center text-sm text-red-400">{error ?? "Informe o bolão."}</div>
        <PrimaryButton to="/create" search={{ aba: "bolao", passo: 1 }} variant="primary" className="mt-4">
          Criar bolão
        </PrimaryButton>
      </Shell>
    );
  }

  if (!activeBolao) {
    return (
      <Shell>
        <TopBar title="Admin" back="/create" backSearch={{ aba: "meus" }} />
        <p className="text-sm text-muted-foreground text-center py-8">Carregando bolão...</p>
      </Shell>
    );
  }

  if (authLoading) {
    return (
      <Shell>
        <TopBar title="Admin" back="/create" backSearch={{ aba: "meus" }} />
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      </Shell>
    );
  }

  if (!isOwner) {
    return (
      <Shell>
        <TopBar title="Bolão" hideBack />
        <p className="text-sm text-muted-foreground text-center py-8">Abrindo link de participação...</p>
      </Shell>
    );
  }

  const reqs = activeParticipantes.map((p) => ({
    id: p.id,
    name: p.nome,
    palpiteCasa: p.palpite_casa,
    palpiteFora: p.palpite_fora,
    guess: formatScore([p.palpite_casa, p.palpite_fora]),
    status:
      p.status === "aprovado" || p.status === "approved"
        ? ("approved" as const)
        : p.status === "rejeitado" || p.status === "rejected"
          ? ("rejected" as const)
          : ("pending" as const),
  }));

  const approved = reqs.filter((r) => r.status === "approved").length;
  const total = approved * activeBolao.stake;
  const feePercent = bolaoFeePercent(activeBolao.settings);
  const prize = calcPrize(approved, activeBolao.stake, feePercent);
  const takenBy = activeBolao.takenScores[scoreKey([home, away])];
  const conviteUrl = buildBolaoJoinUrl(slug);
  const convitePath = buildBolaoJoinPath(slug);
  const conviteMobileWarning = getShareUrlMobileWarning(conviteUrl);
  const isEnded = activeBolao.status === "encerrado";

  const copyConviteLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(conviteUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = conviteUrl;
        ta.setAttribute("readonly", "");
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedConvite(true);
      window.setTimeout(() => setCopiedConvite(false), 1500);
    } catch {
      window.prompt("Copie o link do bolão:", conviteUrl);
    }
  };

  const updateStatus = async (
    participante: { id: string; name: string; palpiteCasa: number; palpiteFora: number },
    status: "aprovado" | "rejeitado",
  ) => {
    const token = getAccessToken();
    if (!token) {
      setParticipanteError("Sua sessão expirou. Entre novamente para administrar o bolão.");
      return;
    }
    setUpdating(participante.id);
    setParticipanteError(null);
    try {
      await updateFn({
        data: {
          accessToken: token,
          slug,
          participanteId: participante.id,
          nome: participante.name,
          palpiteCasa: participante.palpiteCasa,
          palpiteFora: participante.palpiteFora,
          status,
        },
      });
      setParticipantes((prev) =>
        prev.map((p) => (p.id === participante.id ? { ...p, status } : p)),
      );
      await router.invalidate();
    } catch (err) {
      setParticipanteError(err instanceof Error ? err.message : "Erro ao atualizar participante");
    } finally {
      setUpdating(null);
    }
  };

  const handleAddManual = async () => {
    const token = getAccessToken();
    if (!token || !nome.trim()) {
      setFormError("Informe o nome do participante.");
      return;
    }
    if (takenBy) {
      setFormError("Este placar já foi escolhido.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const result = await addManualFn({
        data: {
          accessToken: token,
          slug,
          nome: nome.trim(),
          cidade: cidade.trim() || undefined,
          palpiteCasa: home,
          palpiteFora: away,
          aprovarDireto,
        },
      });
      setParticipantes((prev) => [
        ...prev,
        {
          id: result.id,
          nome: nome.trim(),
          palpite_casa: home,
          palpite_fora: away,
          status: aprovarDireto ? "aprovado" : "pendente",
        },
      ]);
      setNome("");
      setCidade("");
      setHome(0);
      setAway(0);
      setAba("solicitacoes");
      await router.invalidate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBolao = async () => {
    const token = getAccessToken();
    if (!token || !slug) return;
    if (editStake < 1) {
      setBolaoFormError("Informe um valor de entrada válido.");
      return;
    }
    setSavingBolao(true);
    setBolaoFormError(null);
    try {
      await updateBolaoFn({
        data: {
          accessToken: token,
          slug,
          stake: editStake,
          modoExclusivo: editExclusive,
          taxaPercent: editTaxaPercent,
        },
      });
      await router.invalidate();
    } catch (err) {
      setBolaoFormError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingBolao(false);
    }
  };

  const handleDeleteBolao = async () => {
    const token = getAccessToken();
    if (!token || !slug) return;
    const ok = window.confirm(
      "Excluir este bolão? Participantes e palpites serão removidos. Esta ação não pode ser desfeita.",
    );
    if (!ok) return;
    setDeletingBolao(true);
    setBolaoFormError(null);
    try {
      await deleteBolaoFn({ data: { accessToken: token, slug } });
      navigate({ to: "/create", search: { aba: "meus" } });
    } catch (err) {
      setBolaoFormError(err instanceof Error ? err.message : "Erro ao excluir");
      setDeletingBolao(false);
    }
  };

  const handleStartLive = async () => {
    const token = getAccessToken();
    if (!token || !slug) return;
    if (isEnded) {
      navigate({ to: "/final", search: { bolao: slug } });
      return;
    }
    if (activeBolao.isStarted) {
      navigate({ to: "/live", search: { bolao: slug, admin: "1" } });
      return;
    }
    setStartingLive(true);
    setBolaoFormError(null);
    try {
      await startBolaoFn({ data: { accessToken: token, slug } });
      navigate({ to: "/live", search: { bolao: slug, admin: "1" } });
    } catch (err) {
      setBolaoFormError(err instanceof Error ? err.message : "Erro ao iniciar partida");
      setStartingLive(false);
    }
  };

  const handleReabrirLive = async () => {
    const token = getAccessToken();
    if (!token || !slug) return;
    const ok = window.confirm(
      "Reabrir esta partida ao vivo? Use apenas se o encerramento foi feito por engano.",
    );
    if (!ok) return;

    setReabrindoLive(true);
    setBolaoFormError(null);
    try {
      await reabrirBolaoFn({ data: { accessToken: token, slug } });
      await router.invalidate();
      navigate({ to: "/live", search: { bolao: slug, admin: "1" } });
    } catch (err) {
      setBolaoFormError(err instanceof Error ? err.message : "Erro ao reabrir partida");
    } finally {
      setReabrindoLive(false);
    }
  };

  return (
    <Shell className="pb-32">
      <TopBar title="Administrar bolão" back="/create" backSearch={{ aba: "meus" }} right={<LeaveToMeusButton compact />} />

      {realtimeFallback}

      {highlightPedidos && aba !== "solicitacoes" && pendingCount > 0 && (
        <button
          type="button"
          onClick={() => setAba("solicitacoes")}
          className="mb-4 w-full rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-left animate-rise"
        >
          <span className="font-semibold text-primary">Novo pedido de entrada</span>
          <span className="text-muted-foreground"> — toque para ver em Pedidos ({pendingCount} pendente{pendingCount === 1 ? "" : "s"})</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2.5 animate-rise">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Users className="size-4" /> Arrecadado
          </div>
          <div className="font-display text-2xl font-bold mt-1">R$ {total},00</div>
          <div className="text-xs text-muted-foreground">{approved} confirmados</div>
        </div>
        <div className="rounded-2xl p-4 demo-prize-banner">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-gold">
            <Wallet className="size-4" /> Prêmio
          </div>
          <div className="font-display text-2xl font-bold mt-1 text-gradient-gold">R$ {prize},00</div>
          <div className="text-xs text-muted-foreground">
            {feePercent > 0 ? `após taxa de ${feePercent}%` : "sem taxa — 100% para o(s) vencedor(es)"}
          </div>
        </div>
      </div>

      <nav className="mt-6 grid grid-cols-4 gap-1.5 p-1 rounded-2xl glass animate-rise">
        <button
          type="button"
          onClick={() => setAba("convite")}
          className={`rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition ${
            aba === "convite" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Copy className="size-4" /> Links
        </button>
        <button
          type="button"
          onClick={() => setAba("solicitacoes")}
          className={`rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition relative ${
            aba === "solicitacoes" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          } ${highlightPedidos && aba !== "solicitacoes" ? "ring-2 ring-primary/60" : ""}`}
        >
          <ClipboardList className="size-4" /> Pedidos
          {pendingCount > 0 && (
            <span
              className={`min-w-5 h-5 px-1 rounded-full text-[10px] font-bold grid place-items-center ${
                aba === "solicitacoes" ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
              } ${highlightPedidos ? "animate-pulse" : ""}`}
            >
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setAba("adicionar")}
          className={`rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition ${
            aba === "adicionar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <UserPlus className="size-4" /> Add
        </button>
        <button
          type="button"
          onClick={() => setAba("bolao")}
          className={`rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition ${
            aba === "bolao" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Settings2 className="size-4" /> Bolão
        </button>
      </nav>

      {aba === "convite" && (
        <div className="mt-5 space-y-4 animate-rise">
          <div className="glass rounded-2xl p-4 text-sm text-muted-foreground">
            Compartilhe este link com quem vai palpitar. Quando o jogo começar, o mesmo link abre o ranking ao vivo.
          </div>

          <PublicLinkCard
            label="Link do bolão"
            description="Participante entra, escolhe placar e aguarda sua aprovação."
            url={conviteUrl}
            path={convitePath}
            copied={copiedConvite}
            mobileWarning={conviteMobileWarning}
            onCopy={() => void copyConviteLink()}
          />

          <div className="grid grid-cols-2 gap-2">
            <PrimaryButton
              to="/join"
              search={buildBolaoGuestJoinSearch(slug)}
              target="_blank"
              variant="outline"
              className="h-12 text-sm"
            >
              Ver como convidado
            </PrimaryButton>
            <PrimaryButton to="/live" search={{ bolao: slug, admin: "1" }} variant="outline" className="h-12 text-sm">
              <Radio className="size-4" /> Painel ao vivo
            </PrimaryButton>
          </div>
        </div>
      )}

      {aba === "solicitacoes" && (
        <div className="mt-5 animate-rise">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold">Participantes</h2>
            <span className="chip">{reqs.filter((r) => r.status === "pending").length} pendentes</span>
          </div>
          {participanteError && (
            <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
              {participanteError}
            </div>
          )}
          <ScrollableListPanel>
            {reqs.length === 0 && (
              <li className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
                Nenhum participante ainda. Compartilhe o link ou adicione manualmente.
              </li>
            )}
            {reqs.map((r) => (
              <li key={r.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-surface-2 grid place-items-center font-display font-bold">
                  {r.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Palpite: <span className="text-foreground font-medium tabular-nums">{r.guess}</span>
                  </div>
                </div>
                {r.status === "pending" ? (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={updating === r.id}
                      onClick={() => updateStatus(r, "rejeitado")}
                      className="size-10 rounded-xl bg-destructive/15 text-destructive grid place-items-center"
                    >
                      <X className="size-5" />
                    </button>
                    <button
                      type="button"
                      disabled={updating === r.id}
                      onClick={() => updateStatus(r, "aprovado")}
                      className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center"
                    >
                      <Check className="size-5" />
                    </button>
                  </div>
                ) : (
                  <span className="chip shrink-0">
                    {r.status === "approved" ? "Aprovado" : "Rejeitado"}
                  </span>
                )}
              </li>
            ))}
          </ScrollableListPanel>
        </div>
      )}

      {aba === "adicionar" && (
        <div className="mt-5 space-y-4 animate-rise">
          <p className="text-sm text-muted-foreground">
            Cadastre quem pagou presencialmente ou não usou o link. Pode já entrar como aprovado.
          </p>
          <FormField label="Nome *">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome no bolão"
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
          <ScorePicker
            match={activeBolao.match}
            home={home}
            away={away}
            onHomeChange={setHome}
            onAwayChange={setAway}
          />
          <label className="flex items-center gap-3 glass rounded-2xl p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={aprovarDireto}
              onChange={(e) => setAprovarDireto(e.target.checked)}
              className="size-4 accent-primary"
            />
            <div>
              <div className="font-semibold text-sm">Aprovar na hora</div>
              <div className="text-xs text-muted-foreground">Entra direto no ranking ao vivo</div>
            </div>
          </label>
          {formError && <p className="text-sm text-red-400 text-center">{formError}</p>}
          <PrimaryButton
            onClick={handleAddManual}
            variant="primary"
            className={saving || takenBy ? "opacity-50 pointer-events-none" : ""}
          >
            <UserPlus className="size-5" /> {saving ? "Salvando..." : "Adicionar participante"}
          </PrimaryButton>
        </div>
      )}

      {aba === "bolao" && (
        <div className="mt-5 space-y-4 animate-rise">
          <p className="text-sm text-muted-foreground">
            Edite as regras do bolão. O prêmio (arrecadado − taxa) vai para quem vencer — você só administra.
          </p>

          <FormField label="Valor da entrada (R$)">
            <input
              value={String(editStake)}
              onChange={(e) => setEditStake(Number(e.target.value.replace(/\D/g, "")) || 0)}
              inputMode="numeric"
              className="w-full bg-transparent outline-none font-display text-2xl font-bold tabular-nums"
            />
          </FormField>
          <div className="flex gap-2 flex-wrap">
            {STAKE_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setEditStake(Number(v))}
                className="chip"
                style={
                  String(editStake) === v
                    ? { background: "var(--gradient-green)", color: "var(--primary-foreground)", border: "none" }
                    : undefined
                }
              >
                R$ {v}
              </button>
            ))}
          </div>

          <PlacarRulePicker exclusive={editExclusive} onChange={setEditExclusive} />

          <FormField label="Taxa da plataforma (%)">
            <input
              value={String(editTaxaPercent)}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setEditTaxaPercent(raw === "" ? 0 : Math.min(100, Number(raw)));
              }}
              inputMode="numeric"
              className="w-full bg-transparent outline-none font-display text-2xl font-bold tabular-nums"
              placeholder="0"
            />
          </FormField>
          <p className="text-xs text-muted-foreground -mt-2 px-1">
            0 = sem taxa. Prêmio líquido vai para o(s) vencedor(es).
          </p>

          {bolaoFormError && (
            <p className="text-sm text-red-400 text-center">{bolaoFormError}</p>
          )}

          <PrimaryButton
            onClick={handleSaveBolao}
            variant="primary"
            className={savingBolao ? "opacity-50 pointer-events-none" : ""}
          >
            {savingBolao ? "Salvando..." : "Salvar alterações"}
          </PrimaryButton>

          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
            <div className="font-display font-semibold text-sm text-destructive">Zona de perigo</div>
            <p className="text-xs text-muted-foreground">
              Exclui o bolão, todos os participantes e palpites. Use só se criou por engano.
            </p>
            <button
              type="button"
              onClick={handleDeleteBolao}
              disabled={deletingBolao}
              className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-destructive/50 text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              {deletingBolao ? "Excluindo..." : "Excluir bolão"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8">
        {bolaoFormError && aba !== "bolao" && (
          <p className="mb-3 text-sm text-red-400 text-center">{bolaoFormError}</p>
        )}
        <PrimaryButton
          variant="gold"
          onClick={handleStartLive}
          className={startingLive ? "opacity-50 pointer-events-none" : ""}
        >
          <Lock className="size-5" />{" "}
          {startingLive
            ? "Iniciando..."
            : isEnded
              ? "Ver resultado encerrado"
              : activeBolao.isStarted
                ? "Abrir controle ao vivo"
                : "Iniciar partida ao vivo"}
        </PrimaryButton>
        {isEnded && (
          <PrimaryButton
            variant="outline"
            onClick={handleReabrirLive}
            className={`mt-3 border-red-400/40 text-red-400 ${reabrindoLive ? "opacity-50 pointer-events-none" : ""}`}
          >
            <RotateCcw className="size-5" />
            {reabrindoLive ? "Reabrindo..." : "Reabrir partida ao vivo"}
          </PrimaryButton>
        )}
      </div>
    </Shell>
  );
}

function PublicLinkCard({
  label,
  description,
  url,
  path,
  copied,
  mobileWarning,
  onCopy,
}: {
  label: string;
  description: string;
  url: string;
  path: string;
  copied: boolean;
  mobileWarning?: string | null;
  onCopy: () => void;
}) {
  return (
    <div className="glass rounded-2xl p-4 ring-1 ring-primary/40 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-sm font-semibold text-primary break-all leading-snug hover:underline"
        >
          {url}
        </a>
        <div className="mt-1 text-[11px] text-muted-foreground truncate">{path}</div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
        {mobileWarning && (
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200/90 leading-relaxed">
            {mobileWarning}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="h-11 rounded-xl border border-border bg-surface/40 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-surface-2 transition"
        >
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
          {copied ? "Copiado!" : "Copiar link"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
          style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}
        >
          Abrir link
        </a>
      </div>
    </div>
  );
}
