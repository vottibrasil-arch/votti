import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CampeonatoAdminJogos } from "@/components/campeonato-admin/campeonato-admin-jogos";
import { CriarBolaoPersonalConfig } from "@/components/criar-bolao-personal-config";
import { PrimaryButton } from "@/components/ui-kit";
import { getSupabaseBrowser } from "@/lib/api/supabase-browser";
import { useAuth } from "@/lib/auth/use-auth";
import { campeonatoDescricaoTexto } from "@/lib/bolao/campeonato-meta";
import {
  loadCampeonatoJogos,
  type CampeonatoJogosData,
} from "@/lib/bolao/campeonato-jogos-load";
import { resolveBannerStyle } from "@/lib/bolao/campeonato-ui";
import type { CampeonatoAdminData } from "@/lib/bolao/db-types";
import { formatUserFacingError } from "@/lib/errors";
import { MapPin, Swords } from "lucide-react";

type Props = {
  campeonatoId: number;
  partidaId?: number;
};

export function CampeonatoJogosPanel({ campeonatoId, partidaId }: Props) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<CampeonatoJogosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [configPartidaId, setConfigPartidaId] = useState<number | null>(partidaId ?? null);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (partidaId) setConfigPartidaId(partidaId);
  }, [partidaId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setError("Faça login para ver seus jogos.");
      return;
    }
    if (typeof window === "undefined") return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseBrowser();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        let session = sessionData.session;
        if (!session) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          session = refreshed.session;
        }
        if (!session) {
          throw new Error(sessionError?.message ?? "Sessão expirada. Entre de novo.");
        }

        const result = await loadCampeonatoJogos(supabase, campeonatoId, user.id);
        if (cancelled) return;

        if (!result) {
          setData(null);
          setError("Campeonato não encontrado ou você não é o dono.");
        } else {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(formatUserFacingError(err, "Erro ao carregar jogos"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, campeonatoId, reloadKey]);

  if (authLoading || loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Carregando jogos...</p>;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="glass rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-red-400">{error ?? "Campeonato não encontrado."}</p>
          <PrimaryButton onClick={reload} variant="primary" className="h-11">
            Tentar novamente
          </PrimaryButton>
        </div>
        <PrimaryButton to="/create" search={{ aba: "meus" }} variant="outline">
          Voltar para Meus
        </PrimaryButton>
      </div>
    );
  }

  const activePartidaId = configPartidaId ?? partidaId ?? null;

  if (activePartidaId) {
    const partida = data.partidas.find((p) => p.id === activePartidaId);
    if (!partida) {
      return (
        <div className="glass rounded-2xl p-4 text-center text-sm text-red-400">
          Jogo não encontrado.
        </div>
      );
    }
    return (
      <CriarBolaoPersonalConfig
        campeonatoId={campeonatoId}
        campeonatoNome={data.campeonato.nome}
        partida={partida}
        boloesExistentes={partida.bolao_count}
        onBack={() => {
          setConfigPartidaId(null);
          if (partidaId) {
            navigate({
              to: "/create",
              search: { aba: "campeonato", campeonatoId },
            });
          }
        }}
      />
    );
  }

  const descricao = campeonatoDescricaoTexto(data.campeonato.descricao);

  const adminData: CampeonatoAdminData = {
    campeonato: data.campeonato,
    partidas: data.partidas,
    participantes_count: 0,
    bolao: null,
    participantes: [],
  };

  return (
    <div className="animate-rise space-y-5">
      <header className="rounded-2xl overflow-hidden border border-gold/30">
        <div className="relative h-20" style={resolveBannerStyle(data.campeonato.banner_url)}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          {data.campeonato.escudo_url && (
            <div className="absolute -bottom-6 left-4 size-12 rounded-xl overflow-hidden ring-4 ring-background shadow-md">
              <img src={data.campeonato.escudo_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div className="p-4 pt-8 space-y-1">
          <h1 className="font-display text-xl font-bold leading-tight">{data.campeonato.nome}</h1>
          {data.campeonato.cidade && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3" /> {data.campeonato.cidade}
            </p>
          )}
          {descricao && <p className="text-xs text-muted-foreground line-clamp-2">{descricao}</p>}
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
            <Swords className="size-3" />
            {data.partidas.length} jogo{data.partidas.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <CampeonatoAdminJogos
        campRef={{ campeonatoId: data.campeonato.id, slug: data.campeonato.slug ?? undefined }}
        data={adminData}
        onReload={reload}
        showBolaoAction
        bolaoStats={data.bolaoStats}
        bolaoSlugByPartidaId={data.bolaoSlugByPartidaId}
        bolaoCountByPartidaId={data.bolaoCountByPartidaId}
        onOpenBolao={(partida) => setConfigPartidaId(partida.id)}
      />
    </div>
  );
}
