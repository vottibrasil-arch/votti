import { Link } from "@tanstack/react-router";

import { campeonatoDescricaoTexto } from "@/lib/bolao/campeonato-meta";

import { resolveBannerStyle } from "@/lib/bolao/campeonato-ui";

import type { DbCampeonatoWithStats } from "@/lib/bolao/db-types";

import { ChevronRight, MapPin, Swords, Trophy } from "lucide-react";

export function CampeonatoPersonalCard({ camp }: { camp: DbCampeonatoWithStats }) {
  const descricao = campeonatoDescricaoTexto(camp.descricao);
  const slug = camp.slug ?? `camp-${camp.id}`;
  const isJogoUnico = camp.partidas_count <= 1;
  const tipoLabel = isJogoUnico ? "Jogo único personalizado" : "Campeonato personalizado";
  const acaoLabel = isJogoUnico ? "Abrir jogo único" : "Abrir campeonato";

  return (
    <Link
      to="/campeonato/$slug"
      params={{ slug }}
      search={{ aba: "jogos" }}
      className={`block rounded-2xl overflow-hidden border-2 active:scale-[0.99] transition ${
        isJogoUnico
          ? "border-primary/35 bg-gradient-to-b from-primary/10 via-surface/20 to-transparent"
          : "border-gold/30 bg-gradient-to-b from-gold/8 via-surface/20 to-transparent"
      }`}
    >
      <div className="relative h-24" style={resolveBannerStyle(camp.banner_url)}>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        {camp.escudo_url && (
          <div className="absolute -bottom-7 left-4 size-14 rounded-xl overflow-hidden ring-4 ring-background shadow-md">
            <img src={camp.escudo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <span
          className={`absolute top-2.5 right-2.5 chip text-[8px] font-bold uppercase ${
            isJogoUnico ? "bg-primary/20 text-primary border-primary/35" : "bg-gold/20 text-gold border-gold/30"
          }`}
        >
          {isJogoUnico ? "Jogo único" : "Campeonato"}
        </span>
      </div>

      <div className="p-4 pt-9 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 ${
                isJogoUnico ? "text-primary" : "text-gold"
              }`}
            >
              {isJogoUnico ? <Swords className="size-3" /> : <Trophy className="size-3" />}
              {tipoLabel}
            </div>
            <h3 className="font-display font-bold text-lg leading-tight">{camp.nome}</h3>
            {camp.cidade && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="size-3 shrink-0" /> {camp.cidade}
              </p>
            )}
            {descricao && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{descricao}</p>}
          </div>
          <ChevronRight className="size-5 text-muted-foreground shrink-0 mt-1" />
        </div>

        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <span className="chip flex items-center gap-1">
            <Swords className="size-3" /> {isJogoUnico ? "1 jogo" : `${camp.partidas_count} jogos`}
          </span>
          <span className="chip">{camp.status_label}</span>
          <span className="chip">{acaoLabel}</span>
        </div>
      </div>
    </Link>
  );
}
