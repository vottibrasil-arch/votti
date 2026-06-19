import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { resolveBannerStyle } from "@/lib/bolao/campeonato-ui";
import type { CampeonatoAdminData } from "@/lib/bolao/db-types";
import { resolveApostasAbertas } from "@/lib/bolao/campeonato-meta";
import { formatMoney } from "@/lib/bolao";
import {
  BarChart3,
  MapPin,
  Settings,
  Swords,
  Target,
  Trophy,
  Users,
} from "lucide-react";

export type CampeonatoAdminTab = "jogos" | "participantes" | "classificacao" | "configuracoes";

const TABS: { id: CampeonatoAdminTab; label: string; icon: typeof Swords }[] = [
  { id: "jogos", label: "Jogos", icon: Swords },
  { id: "participantes", label: "Participantes", icon: Users },
  { id: "classificacao", label: "Classificação", icon: BarChart3 },
  { id: "configuracoes", label: "Campeonato", icon: Settings },
];

type Props = {
  slug: string;
  data: CampeonatoAdminData;
  aba: CampeonatoAdminTab;
  onReload: () => void;
};

export function CampeonatoAdminShell({ slug, data, aba, onReload, children }: Props & { children: ReactNode }) {
  const { campeonato, partidas, participantes_count, bolao } = data;
  const apostasAbertas = resolveApostasAbertas(campeonato);

  return (
    <div className="animate-rise space-y-5">
      <article className="relative rounded-2xl overflow-hidden border-2 border-gold/35 bg-gradient-to-b from-gold/8 to-transparent shadow-[0_8px_32px_-12px_rgba(212,175,55,0.2)]">
        <div className="relative h-36" style={resolveBannerStyle(campeonato.banner_url)}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
          <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 justify-end">
            <span className="chip text-[9px] bg-gold/20 text-gold border-gold/30 font-bold uppercase">
              Personalizado
            </span>
            <span
              className={`chip text-[9px] font-bold uppercase ${
                apostasAbertas
                  ? "text-primary border-primary/40 bg-primary/10"
                  : "text-muted-foreground border-border"
              }`}
            >
              {apostasAbertas ? "Aberto" : "Fechado"}
            </span>
            {bolao ? (
              <span className="chip text-[9px] text-gold border-gold/40 bg-gold/10 font-bold uppercase">
                Bolão ativo
              </span>
            ) : (
              <span className="chip text-[9px] text-muted-foreground font-bold uppercase">Só campeonato</span>
            )}
          </div>
          {campeonato.escudo_url && (
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 size-20 rounded-2xl overflow-hidden ring-4 ring-background shadow-xl z-10">
              <img src={campeonato.escudo_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-12 text-center space-y-1">
          <h1 className="font-display text-2xl font-bold leading-tight">{campeonato.nome}</h1>
          {campeonato.cidade && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <MapPin className="size-3.5" /> {campeonato.cidade}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          <div className="glass rounded-xl p-3 text-center">
            <Swords className="size-4 mx-auto text-primary mb-1" />
            <div className="font-display font-bold text-lg">{partidas.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Jogos</div>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <Users className="size-4 mx-auto text-primary mb-1" />
            <div className="font-display font-bold text-lg">{participantes_count}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Participantes</div>
          </div>
          <div className="rounded-xl p-3 text-center demo-prize-banner">
            <Trophy className="size-4 mx-auto text-gold mb-1" />
            <div className="font-display font-bold text-lg text-gradient-gold">
              {bolao ? formatMoney(bolao.stake) : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">Aposta</div>
          </div>
        </div>
      </article>

      {!bolao && aba !== "configuracoes" && (
        <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="size-5 text-primary" />
            <h2 className="font-display font-semibold text-sm">Criar bolão deste campeonato</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            O campeonato organiza os jogos. O bolão é criado à parte — mesmo fluxo da demonstração:
            escolher jogo, configurar e compartilhar.
          </p>
          <Link
            to="/create"
            search={{ aba: "campeonato", campeonatoId: campeonato.id }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-display font-semibold text-sm w-full"
            style={{ background: "var(--gradient-green)", color: "var(--primary-foreground)" }}
          >
            <Target className="size-4" /> Criar bolão
          </Link>
        </div>
      )}

      <nav className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl glass">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = aba === tab.id;
          return (
            <Link
              key={tab.id}
              to="/campeonato/$slug/admin"
              params={{ slug }}
              search={{ aba: tab.id }}
              className={`rounded-xl py-2.5 px-1 flex flex-col items-center gap-1 transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2/60"
              }`}
            >
              <Icon className="size-4" />
              <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="min-h-[12rem]">{children}</div>
    </div>
  );
}
