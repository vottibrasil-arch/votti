import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveBolaoEffectiveStatus } from "./bolao-status";
import type { CampeonatoBolaoStats, DbPartidaRow } from "./db-types";

export type BolaoCampeonatoRow = {
  id: string;
  slug: string;
  status: string;
  partida_id: number | null;
};

export type CampeonatoBoloesEnrichment = {
  bolaoStats: CampeonatoBolaoStats;
  bolaoSlugByPartidaId: Record<number, string>;
  bolaoCountByPartidaId: Record<number, number>;
};

export function computeCampeonatoBolaoStats(
  boloes: BolaoCampeonatoRow[],
  partidaStatusById: Map<number, string>,
): CampeonatoBolaoStats {
  let ativos = 0;
  let encerrados = 0;

  for (const bolao of boloes) {
    const partidaStatus =
      bolao.partida_id != null ? partidaStatusById.get(bolao.partida_id) : undefined;
    const effective = resolveBolaoEffectiveStatus(bolao.status, partidaStatus);
    if (effective === "encerrado") encerrados += 1;
    else ativos += 1;
  }

  return { total: boloes.length, ativos, encerrados };
}

export async function fetchBoloesForCampeonato(
  supabase: SupabaseClient,
  campeonatoId: number,
  partidaIds: number[],
): Promise<BolaoCampeonatoRow[]> {
  const byId = new Map<string, BolaoCampeonatoRow>();

  if (partidaIds.length > 0) {
    const { data } = await supabase
      .from("boloes")
      .select("id, slug, status, partida_id")
      .in("partida_id", partidaIds);
    for (const row of data ?? []) {
      byId.set(row.id, row as BolaoCampeonatoRow);
    }
  }

  const { data: byCamp, error: campError } = await supabase
    .from("boloes")
    .select("id, slug, status, partida_id")
    .eq("campeonato_id", campeonatoId);

  if (!campError) {
    for (const row of byCamp ?? []) {
      byId.set(row.id, row as BolaoCampeonatoRow);
    }
  }

  return [...byId.values()];
}

export async function enrichCampeonatoWithBoloes(
  supabase: SupabaseClient,
  campeonatoId: number,
  partidas: DbPartidaRow[],
): Promise<CampeonatoBoloesEnrichment> {
  const partidaIds = partidas.map((p) => p.id);
  const partidaStatusById = new Map(partidas.map((p) => [p.id, p.status]));
  const boloes = await fetchBoloesForCampeonato(supabase, campeonatoId, partidaIds);
  const bolaoStats = computeCampeonatoBolaoStats(boloes, partidaStatusById);

  const bolaoCountByPartidaId: Record<number, number> = {};
  const bolaoSlugByPartidaId: Record<number, string> = {};

  for (const bolao of boloes) {
    if (bolao.partida_id == null) continue;
    bolaoCountByPartidaId[bolao.partida_id] = (bolaoCountByPartidaId[bolao.partida_id] ?? 0) + 1;
    if (!bolaoSlugByPartidaId[bolao.partida_id]) {
      bolaoSlugByPartidaId[bolao.partida_id] = bolao.slug;
    }
  }

  return { bolaoStats, bolaoSlugByPartidaId, bolaoCountByPartidaId };
}
