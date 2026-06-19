import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserFromAccessToken } from "./auth.server";
import { getSupabaseAsUser, getSupabaseForRead, getSupabaseServer } from "./supabase.server";
import { getServerConfig } from "../config.server";
import { buildCampeonatoSlug } from "../bolao/slug";
import {
  CAMPEONATO_OWNER_COLUMNS,
  CAMPEONATO_OWNER_COLUMNS_FALLBACK,
  ensureSlugOnCampeonato,
  fetchPartidasForCampeonato,
  formatPartidaSupabaseError,
  insertPartidasForOwner,
  PARTIDA_OWNER_COLUMNS,
} from "./campeonato-owner-helpers";
import { loadCampeonatoJogos } from "../bolao/campeonato-jogos-load";
import { enrichCampeonatoWithBoloes } from "../bolao/campeonato-bolao-stats";
import type { CampeonatoJogosData } from "../bolao/campeonato-jogos-load";
import type {
  AtividadeRecente,
  CreateCampeonatoResult,
  DbCampeonatoRow,
  DbCampeonatoWithStats,
  DbPartidaRow,
} from "../bolao/db-types";

export type { CampeonatoJogosData };
export type CreateCampeonatoPersonalizadoResult = CreateCampeonatoResult;

const CAMPEONATO_COLUMNS = CAMPEONATO_OWNER_COLUMNS;
const PARTIDA_COLUMNS = PARTIDA_OWNER_COLUMNS;

function buildCampeonatoShareUrl(slug: string) {
  const { appUrl } = getServerConfig();
  const base = appUrl.replace(/\/$/, "");
  return `${base}/campeonato/${slug}`;
}

async function ensureUniqueCampeonatoSlug(nome: string) {
  const supabase = getSupabaseServer();
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = buildCampeonatoSlug(nome);
    const { data } = await supabase.from("campeonatos").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  throw new Error("Não foi possível gerar um link único. Tente novamente.");
}

function countUniqueTeams(partidas: Array<{ time_casa: string; time_fora: string }>) {
  const teams = new Set<string>();
  for (const p of partidas) {
    teams.add(p.time_casa.trim());
    teams.add(p.time_fora.trim());
  }
  return teams.size;
}

function mapCampeonatoWithStats(
  row: DbCampeonatoRow & {
    partidas?: Array<{
      id: number;
      time_casa: string;
      time_fora: string;
      data_partida: string | null;
      status: string;
    }>;
  },
): DbCampeonatoWithStats {
  const partidas = Array.isArray(row.partidas) ? row.partidas : [];
  const datas = partidas
    .map((p) => p.data_partida)
    .filter((d): d is string => Boolean(d))
    .sort();

  return {
    ...row,
    partidas_count: partidas.length,
    times_count: countUniqueTeams(partidas),
    proxima_data: datas[0] ?? null,
    status_label: row.ativo ? "Ativo" : "Inativo",
  };
}

async function fetchCampeonatosOficiais(): Promise<DbCampeonatoRow[]> {
  const supabase = getSupabaseForRead();
  const { data, error } = await supabase
    .from("campeonatos")
    .select(CAMPEONATO_COLUMNS)
    .eq("tipo", "oficial")
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Erro ao carregar campeonatos oficiais: ${error.message}`);
  }
  return (data ?? []) as DbCampeonatoRow[];
}

export const listCampeonatosOficiais = createServerFn({ method: "GET" }).handler(async () => {
  return fetchCampeonatosOficiais();
});

/** @deprecated Use listCampeonatosOficiais */
export const listCampeonatos = createServerFn({ method: "GET" }).handler(async () => {
  return fetchCampeonatosOficiais();
});

const authInput = z.object({
  accessToken: z.string().min(1),
});

const jogoInput = z.object({
  fase: z.string().trim().max(80).optional(),
  timeCasa: z.string().trim().min(1).max(80),
  timeFora: z.string().trim().min(1).max(80),
  escudoCasaUrl: z.string().url().optional(),
  escudoForaUrl: z.string().url().optional(),
  dataPartida: z.string().optional(),
  ordem: z.number().int().nonnegative(),
});

const createCampeonatoInput = z.object({
  accessToken: z.string().min(1),
  nome: z.string().trim().min(2).max(80),
  descricao: z.string().trim().max(500).optional(),
  bannerUrl: z.string().url().optional(),
  escudoUrl: z.string().url().optional(),
  cidade: z.string().trim().max(80).optional(),
  jogos: z.array(jogoInput).min(1).max(100),
});

async function listPersonalCampeonatosForUser(
  supabase: ReturnType<typeof getSupabaseAsUser>,
  userId: string,
): Promise<Array<DbCampeonatoRow & { partidas: Array<{ id: number; time_casa: string; time_fora: string; data_partida: string | null; status: string }> }>> {
  const embedSelect = `
    ${CAMPEONATO_COLUMNS},
    partidas ( id, time_casa, time_fora, data_partida, status )
  `;

  let { data: rows, error } = await supabase
    .from("campeonatos")
    .select(embedSelect)
    .eq("tipo", "personalizado")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error?.code === "PGRST204") {
    const fallback = await supabase
      .from("campeonatos")
      .select(CAMPEONATO_OWNER_COLUMNS_FALLBACK)
      .eq("tipo", "personalizado")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    rows = fallback.data?.map((camp) => ({ ...camp, partidas: [] })) ?? null;
    error = fallback.error;
  }

  if (error) {
    throw new Error(`Erro ao carregar seus campeonatos: ${error.message}`);
  }

  const result: Array<
    DbCampeonatoRow & {
      partidas: Array<{ id: number; time_casa: string; time_fora: string; data_partida: string | null; status: string }>;
    }
  > = [];

  for (const row of rows ?? []) {
    const camp = row as DbCampeonatoRow & {
      partidas?: Array<{ id: number; time_casa: string; time_fora: string; data_partida: string | null; status: string }>;
    };
    let partidas = Array.isArray(camp.partidas) ? camp.partidas : [];

    if (partidas.length === 0) {
      try {
        const loaded = await fetchPartidasForCampeonato(supabase, camp.id);
        partidas = loaded.map((p) => ({
          id: p.id,
          time_casa: p.time_casa,
          time_fora: p.time_fora,
          data_partida: p.data_partida,
          status: p.status,
        }));
      } catch {
        partidas = [];
      }
    }

    result.push({ ...camp, partidas });
  }

  return result;
}

export const listMyCampeonatos = createServerFn({ method: "POST" })
  .validator((data: unknown) => authInput.parse(data))
  .handler(async ({ data }): Promise<DbCampeonatoWithStats[]> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);
    const rows = await listPersonalCampeonatosForUser(supabase, user.id);

    const mapped: DbCampeonatoWithStats[] = [];
    for (const row of rows) {
      const campRow = await ensureSlugOnCampeonato(supabase, row);
      mapped.push(mapCampeonatoWithStats(campRow));
    }

    return mapped;
  });

const slugInput = z.object({
  slug: z.string().trim().min(1),
});

export const getCampeonatoBySlug = createServerFn({ method: "GET" })
  .validator((data: unknown) => slugInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    // RPC security definer: visitantes veem só pelo slug (sem listar personalizados alheios)
    const supabase = getSupabaseServer();

    const { data: campRows, error } = await supabase.rpc("get_campeonato_por_link", {
      p_slug: data.slug,
    });

    if (error) {
      throw new Error(`Erro ao carregar campeonato: ${error.message}`);
    }

    const campeonato = Array.isArray(campRows) && campRows.length > 0 ? campRows[0] : null;
    if (!campeonato) return null;

    const { data: partidas, error: partidasError } = await supabase.rpc("get_partidas_por_link", {
      p_slug: data.slug,
    });

    if (partidasError) {
      throw new Error(`Erro ao carregar partidas: ${partidasError.message}`);
    }

    const partidasList = (partidas ?? []) as DbPartidaRow[];
    const campeonatoRow = campeonato as DbCampeonatoRow;
    const { bolaoStats, bolaoSlugByPartidaId, bolaoCountByPartidaId } =
      await enrichCampeonatoWithBoloes(supabase, campeonatoRow.id, partidasList);

    return {
      campeonato: campeonatoRow,
      partidas: partidasList,
      bolaoStats,
      bolaoSlugByPartidaId,
      bolaoCountByPartidaId,
    };
  });

export const listMyAtividade = createServerFn({ method: "POST" })
  .validator((data: unknown) => authInput.parse(data))
  .handler(async ({ data }): Promise<AtividadeRecente[]> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const [campeonatosRes, boloesRes] = await Promise.all([
      supabase
        .from("campeonatos")
        .select("id, nome, created_at")
        .eq("tipo", "personalizado")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("boloes")
        .select("id, slug, created_at, partidas ( time_casa, time_fora )")
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (campeonatosRes.error) throw new Error(campeonatosRes.error.message);
    if (boloesRes.error) throw new Error(boloesRes.error.message);

    const atividade: AtividadeRecente[] = [];

    for (const camp of campeonatosRes.data ?? []) {
      atividade.push({
        id: `camp-${camp.id}`,
        tipo: "campeonato_criado",
        titulo: "Campeonato criado",
        subtitulo: camp.nome,
        created_at: camp.created_at,
      });
    }

    for (const bolao of boloesRes.data ?? []) {
      const partida = Array.isArray(bolao.partidas) ? bolao.partidas[0] : bolao.partidas;
      const jogo = partida ? `${partida.time_casa} × ${partida.time_fora}` : bolao.slug;
      atividade.push({
        id: `bolao-${bolao.id}`,
        tipo: "bolao_criado",
        titulo: "Bolão criado",
        subtitulo: jogo,
        created_at: bolao.created_at,
      });
    }

    return atividade
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  });

export const createCampeonatoPersonalizado = createServerFn({ method: "POST" })
  .validator((data: unknown) => createCampeonatoInput.parse(data))
  .handler(async ({ data }): Promise<CreateCampeonatoResult> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);
    const slug = await ensureUniqueCampeonatoSlug(data.nome);

    const campeonatoPayload = {
      nome: data.nome,
      ativo: true,
      api_league_id: null,
      owner_id: user.id,
      tipo: "personalizado" as const,
      slug,
      banner_url: data.bannerUrl ?? null,
      escudo_url: data.escudoUrl ?? null,
      descricao: data.descricao?.trim() || null,
      cidade: data.cidade?.trim() || null,
      data_inicio: null,
      data_fim: null,
    };

    const { data: campeonato, error: campError } = await supabase
      .from("campeonatos")
      .insert(campeonatoPayload)
      .select(CAMPEONATO_COLUMNS)
      .single();

    let campRow = campeonato;
    let campErr = campError;

    if (campErr?.code === "PGRST204") {
      const fallbackPayload = { ...campeonatoPayload };
      delete (fallbackPayload as Record<string, unknown>).apostas_abertas;
      const fallback = await supabase
        .from("campeonatos")
        .insert(fallbackPayload)
        .select(CAMPEONATO_OWNER_COLUMNS_FALLBACK)
        .single();
      campRow = fallback.data;
      campErr = fallback.error;
    }

    if (campErr || !campRow) {
      throw new Error(formatPartidaSupabaseError("Erro ao criar campeonato", campErr));
    }

    const partidasRows = await insertPartidasForOwner(
      supabase,
      campRow.id,
      user.id,
      data.jogos,
    );

    return {
      campeonato: campRow as DbCampeonatoRow,
      partidas: partidasRows,
      shareUrl: buildCampeonatoShareUrl(slug),
    };
  });

const campeonatoJogosInput = z.object({
  accessToken: z.string().min(1),
  campeonatoId: z.number().int().positive(),
});

export const getCampeonatoJogos = createServerFn({ method: "POST" })
  .validator((data: unknown) => campeonatoJogosInput.parse(data))
  .handler(async ({ data }) => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);
    return loadCampeonatoJogos(supabase, data.campeonatoId, user.id);
  });
