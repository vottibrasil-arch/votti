import type { DbPartidaRow } from "./db-types";
import { teamNameToCode } from "./team-codes";

export function formatPartidaDate(dataPartida: string | null) {
  if (!dataPartida) return "Data a definir";
  const date = new Date(dataPartida);
  const day = date.toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return `${day} · ${time}`;
}

export function dbPartidaToCard(partida: DbPartidaRow) {
  const campeonato = partida.campeonatos?.nome ?? "Copa do Mundo 2026";
  return {
    id: partida.id,
    home: partida.time_casa,
    away: partida.time_fora,
    homeCode: teamNameToCode(partida.time_casa),
    awayCode: teamNameToCode(partida.time_fora),
    homeEscudo: partida.escudo_casa,
    awayEscudo: partida.escudo_fora,
    date: formatPartidaDate(partida.data_partida),
    stage: campeonato,
    status: partida.status,
    isPersonalizado: partida.campeonatos?.tipo === "personalizado",
  };
}

export type MatchCard = ReturnType<typeof dbPartidaToCard>;
