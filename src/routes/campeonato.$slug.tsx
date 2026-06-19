import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { useState } from "react";

import { useServerFn } from "@tanstack/react-start";

import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";

import { CampeonatoAdminJogos } from "@/components/campeonato-admin/campeonato-admin-jogos";

import { CriarBolaoPersonalConfig } from "@/components/criar-bolao-personal-config";

import { deleteCampeonatoPersonalizado } from "@/lib/api/campeonato-admin.server";

import { getCampeonatoBySlug } from "@/lib/api/campeonatos.server";

import { useAuth } from "@/lib/auth/use-auth";

import { campeonatoDescricaoTexto } from "@/lib/bolao/campeonato-meta";

import { ownerRefPayload } from "@/lib/bolao/campeonato-owner-ref";

import { resolveBannerStyle } from "@/lib/bolao/campeonato-ui";

import { formatPartidaDateTime, groupPartidasByFase } from "@/lib/bolao/partidas-ui";

import { PARTIDA_STATUS_LABELS, type CampeonatoAdminData } from "@/lib/bolao/db-types";

import { formatUserFacingError } from "@/lib/errors";

import { LogIn, MapPin, Trash2 } from "lucide-react";



type OwnerTab = "jogos" | "bolao" | "campeonato";



export const Route = createFileRoute("/campeonato/$slug")({

  validateSearch: (search: Record<string, unknown>) => {

    const abaRaw = search.aba;

    const aba: OwnerTab =

      abaRaw === "campeonato" || abaRaw === "configuracoes"

        ? "campeonato"

        : abaRaw === "bolao"

          ? "bolao"

          : "jogos";

    return { aba };

  },

  loader: async ({ params }) => {

    try {

      const result = await getCampeonatoBySlug({ data: { slug: params.slug } });

      return { result, error: null as string | null };

    } catch (err) {

      return {

        result: null,

        error: err instanceof Error ? err.message : "Erro ao carregar campeonato",

      };

    }

  },

  head: ({ loaderData }) => ({

    meta: [

      {

        title: loaderData?.result?.campeonato.nome

          ? `${loaderData.result.campeonato.nome} — Palpite Gol`

          : "Campeonato — Palpite Gol",

      },

    ],

  }),

  component: CampeonatoPage,

});



function TeamBadge({ escudo, nome }: { escudo: string | null; nome: string }) {

  if (escudo) {

    return <img src={escudo} alt={nome} className="size-10 rounded-xl object-cover shrink-0 ring-2 ring-background" />;

  }

  return (

    <div className="size-10 rounded-xl bg-surface-2 grid place-items-center text-sm shrink-0 ring-2 ring-background">

      ⚽

    </div>

  );

}



function CampeonatoPage() {

  const { slug } = Route.useParams();

  const { result, error } = Route.useLoaderData();

  const navigate = useNavigate();

  const { user, getAccessToken } = useAuth();

  const deleteCampeonatoFn = useServerFn(deleteCampeonatoPersonalizado);



  const [bolaoPartidaId, setBolaoPartidaId] = useState<number | null>(null);

  const [deletingCampeonato, setDeletingCampeonato] = useState(false);

  const [deleteError, setDeleteError] = useState<string | null>(null);



  const handleDeleteCampeonato = async () => {
    if (!result) return;
    const token = getAccessToken();
    if (!token) {
      setDeleteError("Sessão expirada. Entre de novo.");
      return;
    }

    const ok = confirm(
      `Excluir "${result.campeonato.nome}" permanentemente? Todos os jogos e bolões vinculados também serão excluídos.`,
    );
    if (!ok) return;

    setDeletingCampeonato(true);
    setDeleteError(null);
    try {
      await deleteCampeonatoFn({
        data: ownerRefPayload(
          { campeonatoId: result.campeonato.id, slug: result.campeonato.slug ?? undefined },
          token,
        ),
      });
      navigate({ to: "/create", search: { aba: "meus" }, replace: true });
    } catch (err) {
      setDeleteError(formatUserFacingError(err, "Erro ao excluir campeonato"));
      setDeletingCampeonato(false);
    }
  };



  if (error) {

    return (

      <Shell>

        <TopBar title="Campeonato" useHistoryBack />

        <div className="glass rounded-2xl p-6 text-center text-sm text-red-400">{error}</div>

      </Shell>

    );

  }



  if (!result) {

    return (

      <Shell>

        <TopBar title="Campeonato" useHistoryBack />

        <div className="text-center space-y-4 py-12 animate-rise">

          <div className="text-5xl">🔍</div>

          <h1 className="font-display text-xl font-bold">Campeonato não encontrado</h1>

          <PrimaryButton to="/" variant="primary">Voltar ao início</PrimaryButton>

        </div>

      </Shell>

    );

  }



  const { campeonato, partidas } = result;

  const descricao = campeonatoDescricaoTexto(campeonato.descricao);

  const isOwner = Boolean(user?.id && campeonato.owner_id === user.id);

  const adminData: CampeonatoAdminData = {
    campeonato,
    partidas,
    participantes_count: 0,
    bolao: null,
    participantes: [],
  };



  const grupos = groupPartidasByFase(partidas);

  const bolaoPartida = bolaoPartidaId ? partidas.find((p) => p.id === bolaoPartidaId) : null;

  if (isOwner && bolaoPartida) {
    return (
      <Shell className="pb-32">
        <TopBar title="Configurar bolão" onBack={() => setBolaoPartidaId(null)} />
        <div className="max-w-lg mx-auto">
          <CriarBolaoPersonalConfig
            campeonatoId={campeonato.id}
            campeonatoNome={campeonato.nome}
            partida={bolaoPartida}
            boloesExistentes={result.bolaoCountByPartidaId[bolaoPartida.id] ?? 0}
            onBack={() => setBolaoPartidaId(null)}
          />
        </div>
      </Shell>
    );
  }



  return (

    <Shell className="pb-32">

      <TopBar title="Campeonato" useHistoryBack />



      <div className="animate-rise space-y-5 max-w-lg mx-auto">

        {!user && (

          <Link

            to="/login"

            search={{ redirect: `/campeonato/${slug}` }}

            className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 active:scale-[0.99] transition"

          >

            <LogIn className="size-5 text-primary shrink-0" />

            <div className="min-w-0">

              <div className="font-semibold text-sm">É o organizador?</div>

              <div className="text-xs text-muted-foreground">Entre para editar jogos, times e criar bolão.</div>

            </div>

          </Link>

        )}



        <GuestHero campeonato={campeonato} partidasCount={partidas.length} descricao={descricao} />



        {isOwner ? (
          <>
            <CampeonatoAdminJogos
              campRef={{ campeonatoId: campeonato.id, slug: campeonato.slug ?? undefined }}
              data={adminData}
              onReload={() => window.location.reload()}
              showBolaoAction
              showBolaoCopyLink={false}
              bolaoStats={result.bolaoStats}
              bolaoSlugByPartidaId={result.bolaoSlugByPartidaId}
              bolaoCountByPartidaId={result.bolaoCountByPartidaId}
              onOpenBolao={(partida) => {
                setBolaoPartidaId(partida.id);
              }}
            />

            <div className="rounded-2xl border border-red-400/30 bg-red-500/5 p-4 space-y-3">
              <div>
                <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wide">Zona de perigo</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Exclui o campeonato, jogos, bolões vinculados e participantes.
                </p>
              </div>
              <PrimaryButton
                onClick={handleDeleteCampeonato}
                variant="outline"
                className={`h-12 border-red-400/40 text-red-400 ${deletingCampeonato ? "opacity-50 pointer-events-none" : ""}`}
              >
                <Trash2 className="size-5" />
                {deletingCampeonato ? "Excluindo..." : "Excluir campeonato"}
              </PrimaryButton>
              {deleteError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
                  {deleteError}
                </div>
              )}
            </div>
          </>
        ) : grupos.length > 0 ? (

          <section className="space-y-3">

            {grupos.map((grupo, gi) => (

              <div key={gi} className="space-y-2">

                {grupo.fase && (

                  <h2 className="text-[10px] font-bold uppercase tracking-wider text-gold px-1">

                    {grupo.fase}

                  </h2>

                )}

                {grupo.partidas.map((p) => (

                  <div key={p.id} className="rounded-2xl overflow-hidden border border-border/70 bg-surface/30">

                    <div className="relative p-4">

                      <div className="absolute inset-0 opacity-20 demo-pitch-bg" style={{ background: "var(--gradient-pitch)" }} />

                      <div className="relative flex items-center gap-3">

                        <TeamBadge escudo={p.escudo_casa} nome={p.time_casa} />

                        <div className="min-w-0 flex-1 text-center">

                          <div className="font-display font-bold text-sm truncate">{p.time_casa}</div>

                          <div className="text-[10px] text-gold font-bold my-1">VS</div>

                          <div className="font-display font-bold text-sm truncate">{p.time_fora}</div>

                        </div>

                        <TeamBadge escudo={p.escudo_fora} nome={p.time_fora} />

                      </div>

                    </div>

                    <div className="px-4 py-2 border-t border-border/50 flex justify-between text-[10px] text-muted-foreground">

                      <span>{formatPartidaDateTime(p.data_partida) ?? "Sem data"}</span>

                      <span className="chip">{PARTIDA_STATUS_LABELS[p.status] ?? p.status}</span>

                    </div>

                  </div>

                ))}

              </div>

            ))}

          </section>

        ) : (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Nenhum jogo cadastrado ainda.
          </div>
        )}

      </div>

    </Shell>

  );

}



function GuestHero({

  campeonato,

  partidasCount,

  descricao,

}: {

  campeonato: { nome: string; cidade: string | null; banner_url: string | null; escudo_url: string | null };

  partidasCount: number;

  descricao: string | null;

}) {

  return (

    <article className="rounded-2xl overflow-hidden border border-gold/25 bg-surface/20">

      <div className="relative h-28" style={resolveBannerStyle(campeonato.banner_url)}>

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

        {campeonato.escudo_url && (

          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 size-16 rounded-2xl overflow-hidden ring-4 ring-background shadow-lg">

            <img src={campeonato.escudo_url} alt="" className="w-full h-full object-cover" />

          </div>

        )}

      </div>

      <div className="text-center px-4 pt-10 pb-4 space-y-1">

        <span className="chip text-[9px] border-gold/40 text-gold">Campeonato personalizado</span>

        <h1 className="font-display text-xl font-bold">{campeonato.nome}</h1>

        {campeonato.cidade && (

          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">

            <MapPin className="size-3" /> {campeonato.cidade}

          </p>

        )}

        {descricao && <p className="text-xs text-muted-foreground">{descricao}</p>}

        <p className="text-[10px] text-muted-foreground">{partidasCount} jogo{partidasCount !== 1 ? "s" : ""}</p>

      </div>

    </article>

  );

}




