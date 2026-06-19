import type { DbPartidaRow } from "./db-types";

export type PartidaFaseGroup = {
  fase: string | null;
  partidas: DbPartidaRow[];
};

export function groupPartidasByFase(partidas: DbPartidaRow[]): PartidaFaseGroup[] {
  const sorted = [...partidas].sort((a, b) => {
    const ordemA = a.ordem ?? 0;
    const ordemB = b.ordem ?? 0;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return a.id - b.id;
  });

  const groups: PartidaFaseGroup[] = [];
  for (const partida of sorted) {
    const fase = partida.fase?.trim() || null;
    const last = groups[groups.length - 1];
    if (last && last.fase === fase) {
      last.partidas.push(partida);
    } else {
      groups.push({ fase, partidas: [partida] });
    }
  }
  return groups;
}

export function formatPartidaDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
