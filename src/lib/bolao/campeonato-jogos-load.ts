import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichCampeonatoWithBoloes } from "@/lib/bolao/campeonato-bolao-stats";
import type { CampeonatoBolaoStats, DbCampeonatoRow, DbPartidaRow } from "@/lib/bolao/db-types";

export type CampeonatoJogosData = {
  campeonato: DbCampeonatoRow;
  partidas: Array<DbPartidaRow & { bolao_slug: string | null; bolao_count: number }>;
  bolaoStats: CampeonatoBolaoStats;
  bolaoSlugByPartidaId: Record<number, string>;
  bolaoCountByPartidaId: Record<number, number>;
};

const CAMP_COLS =
  "id, nome, api_league_id, ativo, apostas_abertas, owner_id, tipo, banner_url, escudo_url, descricao, cidade, slug, data_inicio, data_fim, created_at";

const CAMP_COLS_FB =
  "id, nome, api_league_id, ativo, owner_id, tipo, banner_url, escudo_url, descricao, cidade, slug, data_inicio, data_fim, created_at";

const PART_COLS =
  "id, campeonato_id, time_casa, time_fora, placar_casa, placar_fora, status, data_partida, fase, escudo_casa, escudo_fora, ordem, created_at";

const PART_COLS_FB =
  "id, campeonato_id, time_casa, time_fora, placar_casa, placar_fora, status, data_partida, created_at";

function normalizeCamp(row: Record<string, unknown>): DbCampeonatoRow {
  return {
    id: Number(row.id),
    nome: String(row.nome ?? ""),
    api_league_id: (row.api_league_id as number | null) ?? null,
    ativo: Boolean(row.ativo ?? true),
    apostas_abertas: row.apostas_abertas == null ? true : Boolean(row.apostas_abertas),
    owner_id: (row.owner_id as string | null) ?? null,
    tipo: (row.tipo as DbCampeonatoRow["tipo"]) ?? "personalizado",
    banner_url: (row.banner_url as string | null) ?? null,
    escudo_url: (row.escudo_url as string | null) ?? null,
    descricao: (row.descricao as string | null) ?? null,
    cidade: (row.cidade as string | null) ?? null,
    slug: (row.slug as string | null) ?? null,
    data_inicio: (row.data_inicio as string | null) ?? null,
    data_fim: (row.data_fim as string | null) ?? null,
    created_at: (row.created_at as string | undefined) ?? undefined,
  };
}

function normalizePartida(row: Record<string, unknown>, index: number): DbPartidaRow {
  return {
    id: Number(row.id),
    campeonato_id: row.campeonato_id == null ? null : Number(row.campeonato_id),
    time_casa: String(row.time_casa ?? ""),
    time_fora: String(row.time_fora ?? ""),
    placar_casa: Number(row.placar_casa ?? 0),
    placar_fora: Number(row.placar_fora ?? 0),
    status: String(row.status ?? "agendado"),
    data_partida: (row.data_partida as string | null) ?? null,
    fase: (row.fase as string | null) ?? null,
    escudo_casa: (row.escudo_casa as string | null) ?? null,
    escudo_fora: (row.escudo_fora as string | null) ?? null,
    ordem: row.ordem == null ? index + 1 : Number(row.ordem),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function loadCampeonatoJogos(
  supabase: SupabaseClient,
  campeonatoId: number,
  userId: string,
): Promise<CampeonatoJogosData | null> {
  let { data: campRow, error: campError } = await supabase
    .from("campeonatos")
    .select(CAMP_COLS)
    .eq("id", campeonatoId)
    .eq("tipo", "personalizado")
    .eq("owner_id", userId)
    .maybeSingle();

  if (campError?.code === "PGRST204") {
    const fallback = await supabase
      .from("campeonatos")
      .select(CAMP_COLS_FB)
      .eq("id", campeonatoId)
      .eq("tipo", "personalizado")
      .eq("owner_id", userId)
      .maybeSingle();
    campRow = fallback.data;
    campError = fallback.error;
  }

  if (campError) {
    throw new Error(`Erro ao carregar campeonato: ${campError.message}`);
  }
  if (!campRow) return null;

  const campeonato = normalizeCamp(campRow as Record<string, unknown>);

  let { data: partidasRaw, error: partidasError } = await supabase
    .from("partidas")
    .select(PART_COLS)
    .eq("campeonato_id", campeonatoId)
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });

  if (partidasError?.code === "PGRST204") {
    const fallback = await supabase
      .from("partidas")
      .select(PART_COLS_FB)
      .eq("campeonato_id", campeonatoId)
      .order("id", { ascending: true });
    partidasRaw = fallback.data;
    partidasError = fallback.error;
  }

  if (partidasError) {
    throw new Error(`Erro ao carregar jogos: ${partidasError.message}`);
  }

  let partidas = (partidasRaw ?? []).map((row, i) =>
    normalizePartida(row as Record<string, unknown>, i),
  );

  if (partidas.length === 0 && campeonato.slug) {
    const { data: rpcPartidas, error: rpcError } = await supabase.rpc("get_partidas_por_link", {
      p_slug: campeonato.slug,
    });
    if (!rpcError && rpcPartidas?.length) {
      partidas = (rpcPartidas as Record<string, unknown>[]).map((row, i) =>
        normalizePartida(row, i),
      );
    }
  }

  const { bolaoStats, bolaoSlugByPartidaId, bolaoCountByPartidaId } =
    await enrichCampeonatoWithBoloes(supabase, campeonatoId, partidas);

  return {
    campeonato,
    partidas: partidas.map((p) => ({
      ...p,
      bolao_slug: bolaoSlugByPartidaId[p.id] ?? null,
      bolao_count: bolaoCountByPartidaId[p.id] ?? 0,
    })),
    bolaoStats,
    bolaoSlugByPartidaId,
    bolaoCountByPartidaId,
  };
}
