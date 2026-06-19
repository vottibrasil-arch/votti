import { getSupabaseAdmin } from "./supabase.server";
import { getServerConfig } from "../config.server";
import type { DbCampeonatoRow, DbPartidaRow } from "../bolao/db-types";
import type { getSupabaseAsUser } from "./supabase.server";

export const CAMPEONATO_OWNER_COLUMNS =
  "id, nome, api_league_id, ativo, apostas_abertas, owner_id, tipo, banner_url, escudo_url, descricao, cidade, slug, data_inicio, data_fim, created_at";

export const CAMPEONATO_OWNER_COLUMNS_FALLBACK =
  "id, nome, api_league_id, ativo, owner_id, tipo, banner_url, escudo_url, descricao, cidade, slug, data_inicio, data_fim, created_at";

export const PARTIDA_OWNER_COLUMNS =
  "id, campeonato_id, time_casa, time_fora, placar_casa, placar_fora, status, data_partida, fase, escudo_casa, escudo_fora, ordem, created_at";

export const PARTIDA_OWNER_COLUMNS_FALLBACK =
  "id, campeonato_id, time_casa, time_fora, placar_casa, placar_fora, status, data_partida, created_at";

export async function fetchPartidasForCampeonato(
  supabase: ReturnType<typeof getSupabaseAsUser>,
  campeonatoId: number,
): Promise<DbPartidaRow[]> {
  let { data, error } = await supabase
    .from("partidas")
    .select(PARTIDA_OWNER_COLUMNS)
    .eq("campeonato_id", campeonatoId)
    .order("ordem", { ascending: true })
    .order("id", { ascending: true });

  if (error?.code === "PGRST204") {
    const fallback = await supabase
      .from("partidas")
      .select(PARTIDA_OWNER_COLUMNS_FALLBACK)
      .eq("campeonato_id", campeonatoId)
      .order("id", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(formatPartidaSupabaseError("Erro ao carregar jogos", error));
  }

  return ((data ?? []) as DbPartidaRow[]).map((row, index) => ({
    ...row,
    fase: row.fase ?? null,
    escudo_casa: row.escudo_casa ?? null,
    escudo_fora: row.escudo_fora ?? null,
    ordem: row.ordem ?? index + 1,
  }));
}

export type JogoInsertInput = {
  fase?: string;
  timeCasa: string;
  timeFora: string;
  escudoCasaUrl?: string | null;
  escudoForaUrl?: string | null;
  dataPartida?: string | null;
  ordem: number;
};

export function deterministicCampeonatoSlug(id: number) {
  return `camp-${id}`;
}

export function formatPartidaSupabaseError(
  context: string,
  error: { message: string; code?: string } | null,
) {
  if (!error) return `${context}: erro desconhecido`;
  if (error.code === "PGRST204") {
    return `${context}: coluna ausente no banco. Execute docs/supabase/migration-partidas-jogos.sql`;
  }
  if (error.code === "42501" || error.message.includes("row-level security")) {
    return `${context}: bloqueado por RLS. Execute docs/supabase/fix-partidas-rls.sql no Supabase.`;
  }
  return `${context}: ${error.message}${error.code ? ` (${error.code})` : ""}`;
}

export async function ensureSlugOnCampeonato(
  supabase: ReturnType<typeof getSupabaseAsUser>,
  row: DbCampeonatoRow,
): Promise<DbCampeonatoRow> {
  if (row.slug) return row;

  const slug = deterministicCampeonatoSlug(row.id);
  let { data, error } = await supabase
    .from("campeonatos")
    .update({ slug })
    .eq("id", row.id)
    .select(CAMPEONATO_OWNER_COLUMNS)
    .single();

  if (error?.code === "PGRST204") {
    const fallback = await supabase
      .from("campeonatos")
      .update({ slug })
      .eq("id", row.id)
      .select(CAMPEONATO_OWNER_COLUMNS_FALLBACK)
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (!error && data) {
    return data as DbCampeonatoRow;
  }

  return { ...row, slug };
}

export async function insertPartidasForOwner(
  supabaseUser: ReturnType<typeof getSupabaseAsUser>,
  campeonatoId: number,
  userId: string,
  jogos: JogoInsertInput[],
): Promise<DbPartidaRow[]> {
  const partidasPayload = jogos.map((jogo) => ({
    campeonato_id: campeonatoId,
    time_casa: jogo.timeCasa,
    time_fora: jogo.timeFora,
    fase: jogo.fase?.trim() || null,
    escudo_casa: jogo.escudoCasaUrl ?? null,
    escudo_fora: jogo.escudoForaUrl ?? null,
    ordem: jogo.ordem,
    status: "agendado",
    data_partida: jogo.dataPartida || null,
  }));

  const rpcPayload = jogos.map((jogo) => ({
    time_casa: jogo.timeCasa,
    time_fora: jogo.timeFora,
    fase: jogo.fase?.trim() || null,
    escudo_casa: jogo.escudoCasaUrl ?? null,
    escudo_fora: jogo.escudoForaUrl ?? null,
    ordem: jogo.ordem,
    status: "agendado",
    data_partida: jogo.dataPartida || null,
  }));

  const { data: rpcRows, error: rpcError } = await supabaseUser.rpc("insert_partidas_para_dono", {
    p_campeonato_id: campeonatoId,
    p_partidas: rpcPayload,
  });

  if (!rpcError && rpcRows) {
    return rpcRows as DbPartidaRow[];
  }

  const rpcMissing =
    rpcError?.code === "PGRST202" ||
    rpcError?.code === "42883" ||
    rpcError?.message?.includes("insert_partidas_para_dono") ||
    rpcError?.message?.includes("Could not find the function");

  if (!rpcMissing && rpcError) {
    throw new Error(formatPartidaSupabaseError("Erro ao criar jogos", rpcError));
  }

  const { data: directRows, error: directError } = await supabaseUser
    .from("partidas")
    .insert(partidasPayload)
    .select(PARTIDA_OWNER_COLUMNS);

  if (!directError && directRows) {
    return directRows as DbPartidaRow[];
  }

  const { supabase } = getServerConfig();
  if (supabase.serviceRoleKey) {
    const admin = getSupabaseAdmin();
    const { data: camp } = await admin
      .from("campeonatos")
      .select("owner_id")
      .eq("id", campeonatoId)
      .maybeSingle();

    if (camp?.owner_id !== userId) {
      throw new Error("Erro ao criar jogos: campeonato não pertence ao usuário logado.");
    }

    const { data: adminRows, error: adminError } = await admin
      .from("partidas")
      .insert(partidasPayload)
      .select(PARTIDA_OWNER_COLUMNS);

    if (!adminError && adminRows) {
      return adminRows as DbPartidaRow[];
    }

    throw new Error(formatPartidaSupabaseError("Erro ao criar jogos", adminError ?? directError));
  }

  throw new Error(formatPartidaSupabaseError("Erro ao criar jogos", directError ?? rpcError));
}
