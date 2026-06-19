import { Link } from "@tanstack/react-router";

import { useEffect, useState } from "react";

import { useServerFn } from "@tanstack/react-start";

import { CampeonatoPersonalCard } from "@/components/campeonato-personal-card";

import { PrimaryButton } from "@/components/ui-kit";

import { TeamFlag } from "@/components/bolao/team-flag";

import { useAuth } from "@/lib/auth/use-auth";
import { getSupabaseBrowser } from "@/lib/api/supabase-browser";

import { formatUserFacingError } from "@/lib/errors";
import { deleteBolao, listMyBoloes } from "@/lib/api/boloes.server";
import { listMyAtividade, listMyCampeonatos } from "@/lib/api/campeonatos.server";

import { buildBolaoGuestJoinSearch } from "@/lib/bolao/share-url";

import { BOLAO_STATUS_LABELS, type AtividadeRecente, type DbBolaoWithPartida, type DbCampeonatoWithStats } from "@/lib/bolao/db-types";

import { getBolaoDisplayName, isBolaoEnded } from "@/lib/bolao/bolao-status";

import { dbPartidaToCard } from "@/lib/bolao/db-match";

import { formatScore } from "@/lib/bolao";

import { Activity, Calendar, ChevronRight, Medal, Settings2, Sparkles, Trash2, Trophy, Users } from "lucide-react";



function formatDate(iso: string | null) {

  if (!iso) return "Sem data";

  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

}



function BolaoCard({
  bolao,
  deleting,
  onDelete,
}: {
  bolao: DbBolaoWithPartida;
  deleting: boolean;
  onDelete: (bolao: DbBolaoWithPartida) => void;
}) {

  const partida = bolao.partidas ? dbPartidaToCard(bolao.partidas) : null;

  const displayName = getBolaoDisplayName(bolao);

  const ended = isBolaoEnded(bolao.status, bolao.partidas?.status);

  const statusLabel = BOLAO_STATUS_LABELS[bolao.status] ?? bolao.status;

  const papelLabel = bolao.papel === "participante" ? "Participando" : "Criador";

  const partidaRow = bolao.partidas;
  const finalScore =
    partidaRow && ended
      ? formatScore([partidaRow.placar_casa ?? 0, partidaRow.placar_fora ?? 0])
      : null;

  return (

    <div className="glass rounded-2xl p-4 space-y-3">

      <div className="flex items-start gap-3">

        {partida ? (

          <div className="flex -space-x-1.5 shrink-0">

            <TeamFlag code={partida.homeCode} size="sm" className="ring-2 ring-background" />

            <TeamFlag code={partida.awayCode} size="sm" className="ring-2 ring-background" />

          </div>

        ) : (

          <div className="size-10 rounded-xl bg-surface-2 grid place-items-center shrink-0">⚽</div>

        )}

        <div className="min-w-0 flex-1">

          <div className="font-semibold text-sm truncate">{displayName}</div>

          {partida && (

            <div className="text-xs text-muted-foreground mt-0.5 truncate">

              {ended && finalScore ? `Placar final ${finalScore}` : partida.stage}

            </div>

          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">

            <span className={`chip text-[10px] ${ended ? "border-red-400/40 text-red-300" : ""}`}>{statusLabel}</span>

            <span className="chip text-[10px]">{papelLabel}</span>

            <span className="text-[10px] text-muted-foreground flex items-center gap-1">

              <Users className="size-3" /> {bolao.participant_count}

            </span>

            {bolao.ranking_lider && (

              <span className="text-[10px] text-muted-foreground flex items-center gap-1">

                <Medal className="size-3" /> {ended ? "Resultado" : "Líder"}: {bolao.ranking_lider}

              </span>

            )}

          </div>

        </div>

      </div>

      <div className="flex gap-2">
        {ended ? (
          <PrimaryButton to="/final" search={{ bolao: bolao.slug }} variant="primary" className="flex-1 h-11 text-sm">
            Ver resultado
          </PrimaryButton>
        ) : bolao.papel === "criador" ? (
          <PrimaryButton to="/admin" search={{ bolao: bolao.slug }} variant="primary" className="flex-1 h-11 text-sm">
            <Settings2 className="size-4" /> Administrar
          </PrimaryButton>
        ) : (
          <PrimaryButton to="/join" search={buildBolaoGuestJoinSearch(bolao.slug)} variant="primary" className="flex-1 h-11 text-sm">
            Entrar no bolão
          </PrimaryButton>
        )}

        {bolao.papel === "criador" && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(bolao);
            }}
            disabled={deleting}
            className="h-11 px-3 rounded-xl border border-red-400/40 text-red-400 bg-red-500/5 hover:bg-red-500/10 transition disabled:opacity-50 shrink-0"
            aria-label="Excluir bolão"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

    </div>

  );

}



function AtividadeItem({ item }: { item: AtividadeRecente }) {

  const icon =

    item.tipo === "campeonato_criado" ? "🏆" : item.tipo === "bolao_criado" ? "🎯" : "✉️";



  return (

    <div className="flex items-center gap-3 py-2.5">

      <div className="size-9 rounded-xl bg-surface-2 grid place-items-center text-lg shrink-0">{icon}</div>

      <div className="min-w-0 flex-1">

        <div className="text-sm font-medium">{item.titulo}</div>

        <div className="text-xs text-muted-foreground truncate">{item.subtitulo}</div>

      </div>

      <div className="text-[10px] text-muted-foreground shrink-0">{formatDate(item.created_at)}</div>

    </div>

  );

}



export function MeusDashboard() {
  const { user, getAccessToken, loading: authLoading } = useAuth();

  const listCampeonatosFn = useServerFn(listMyCampeonatos);
  const listBoloesFn = useServerFn(listMyBoloes);
  const listAtividadeFn = useServerFn(listMyAtividade);
  const deleteBolaoFn = useServerFn(deleteBolao);

  const [campeonatos, setCampeonatos] = useState<DbCampeonatoWithStats[]>([]);
  const [boloes, setBoloes] = useState<DbBolaoWithPartida[]>([]);
  const [atividade, setAtividade] = useState<AtividadeRecente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadDashboard = async () => {
    let token = getAccessToken();
    if (!token) {
      const supabase = getSupabaseBrowser();
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token ?? getAccessToken();
    }
    if (!token || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [campsRes, boloesRes, atividadeRes] = await Promise.allSettled([
        listCampeonatosFn({ data: { accessToken: token } }),
        listBoloesFn({ data: { accessToken: token } }),
        listAtividadeFn({ data: { accessToken: token } }),
      ]);

      if (campsRes.status === "fulfilled") {
        setCampeonatos(campsRes.value);
      } else {
        setError(formatUserFacingError(campsRes.reason, "Erro ao carregar campeonatos"));
      }
      if (boloesRes.status === "fulfilled") {
        setBoloes(boloesRes.value);
      }
      if (atividadeRes.status === "fulfilled") {
        setAtividade(atividadeRes.value);
      }
    } catch (err: unknown) {
      setError(formatUserFacingError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void loadDashboard();
  }, [user?.id, authLoading]);

  const handleDeleteBolao = async (bolao: DbBolaoWithPartida) => {
    const displayName = getBolaoDisplayName(bolao);
    const ok = window.confirm(
      `Excluir o bolão "${displayName}"? Participantes e palpites serão removidos. Esta ação não pode ser desfeita.`,
    );
    if (!ok) return;

    setDeletingSlug(bolao.slug);
    setDeleteError(null);

    let token = getAccessToken();
    if (!token) {
      const supabase = getSupabaseBrowser();
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token ?? getAccessToken();
    }
    if (!token) {
      setDeleteError("Sessão expirada. Entre de novo.");
      setDeletingSlug(null);
      return;
    }

    try {
      await deleteBolaoFn({ data: { accessToken: token, slug: bolao.slug } });
      setBoloes((prev) => prev.filter((b) => b.slug !== bolao.slug));
    } catch (err) {
      setDeleteError(formatUserFacingError(err, "Erro ao excluir bolão"));
    } finally {
      setDeletingSlug(null);
    }
  };



  if (loading) {

    return <p className="text-sm text-muted-foreground text-center py-8">Carregando seu painel...</p>;

  }



  if (error) {

    return <div className="glass rounded-2xl p-4 text-center text-sm text-red-400">{error}</div>;

  }



  return (

    <div className="animate-rise space-y-8">

      <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-gold/10 via-transparent to-primary/5 p-4">

        <div className="flex items-center gap-2 mb-1">

          <Sparkles className="size-4 text-gold" />

          <span className="chip text-[9px] border-gold/40 text-gold">Sua área</span>

        </div>

        <h1 className="font-display text-xl font-bold">Meu painel</h1>

        <p className="text-muted-foreground mt-1 text-sm">
          Seus jogos únicos e campeonatos personalizados ficam aqui. Gerencie jogos, bolões e convites em cada card.
          Campeonatos oficiais do sistema estão na aba <strong className="text-foreground font-medium">Oficial</strong>.
        </p>

      </div>



      <section className="space-y-3">

        <div className="flex items-center justify-between">

          <h2 className="font-display font-semibold text-sm flex items-center gap-2">

            <Trophy className="size-4 text-gold" /> Meus jogos e campeonatos

          </h2>

          <Link to="/create" search={{ aba: "criar", etapa: 1 }} className="text-xs text-primary font-semibold">

            Criar novo

          </Link>

        </div>

        {campeonatos.length === 0 ? (

          <div className="glass rounded-2xl p-6 text-center space-y-2">

            <p className="text-sm text-muted-foreground">Nenhum jogo único ou campeonato personalizado ainda.</p>

            <Link to="/create" search={{ aba: "criar", etapa: 1 }} className="text-sm text-primary font-semibold">

              Criar o primeiro

            </Link>

          </div>

        ) : (

          <div className="space-y-4">

            {campeonatos.map((camp) => (

              <CampeonatoPersonalCard key={camp.id} camp={camp} />

            ))}

          </div>

        )}

      </section>



      <section className="space-y-3">

        <div className="flex items-center justify-between">

          <h2 className="font-display font-semibold text-sm flex items-center gap-2">

            <Users className="size-4 text-primary" /> Meus bolões

          </h2>

          <span className="text-xs text-muted-foreground">
            Toque no campeonato para ver e gerenciar os jogos
          </span>

        </div>

        {boloes.length === 0 ? (

          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">

            Nenhum bolão criado ou participação encontrada.

          </div>

        ) : (

          <div className="space-y-3">
            {deleteError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
                {deleteError}
              </div>
            )}

            {boloes.map((bolao) => (
              <BolaoCard
                key={`${bolao.id}-${bolao.papel}`}
                bolao={bolao}
                deleting={deletingSlug === bolao.slug}
                onDelete={handleDeleteBolao}
              />
            ))}

          </div>

        )}

      </section>



      <section className="space-y-3">

        <h2 className="font-display font-semibold text-sm flex items-center gap-2">

          <Activity className="size-4" /> Atividade recente

        </h2>

        {atividade.length === 0 ? (

          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">

            Nenhuma atividade recente.

          </div>

        ) : (

          <div className="glass rounded-2xl px-4 divide-y divide-border/60">

            {atividade.map((item) => (

              <AtividadeItem key={item.id} item={item} />

            ))}

          </div>

        )}

      </section>

    </div>

  );

}

