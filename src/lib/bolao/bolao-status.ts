import type { DbBolaoWithPartida, DbPartidaRow } from "./db-types";
import { dbPartidaToCard } from "./db-match";

export function resolvePartidaRow(
  partidas: DbPartidaRow | DbPartidaRow[] | null | undefined,
): DbPartidaRow | null {
  if (!partidas) return null;
  return Array.isArray(partidas) ? partidas[0] ?? null : partidas;
}

/** Status efetivo do bolão — cada bolão tem ciclo próprio; partida compartilhada não encerra bolão aberto. */
export function resolveBolaoEffectiveStatus(
  bolaoStatus: string,
  partidaStatus?: string | null,
): string {
  const status = bolaoStatus?.trim() || "aberto";

  if (status === "aberto") {
    return "aberto";
  }

  if (status === "ao_vivo") {
    return "ao_vivo";
  }

  if (status === "encerrado") {
    return "encerrado";
  }

  if (partidaStatus === "encerrado" || partidaStatus === "finalizado") {
    return "encerrado";
  }

  if (partidaStatus === "ao_vivo") {
    return "ao_vivo";
  }

  return status;
}

export function isBolaoEnded(bolaoStatus: string, partidaStatus?: string | null): boolean {
  return resolveBolaoEffectiveStatus(bolaoStatus, partidaStatus) === "encerrado";
}

export function getBolaoDisplayName(
  bolao: Pick<DbBolaoWithPartida, "slug" | "partidas">,
): string {
  const partida = resolvePartidaRow(bolao.partidas);
  if (!partida) return bolao.slug;

  const card = dbPartidaToCard(partida);
  const campeonato = partida.campeonatos?.nome?.trim();
  const jogo = `${card.home} × ${card.away}`;

  return campeonato ? `Bolão ${campeonato} · ${jogo}` : `Bolão ${jogo}`;
}

export function normalizeBolaoWithPartida<T extends DbBolaoWithPartida>(row: T): T {
  const partida = resolvePartidaRow(row.partidas);
  return {
    ...row,
    status: resolveBolaoEffectiveStatus(row.status, partida?.status),
  };
}
