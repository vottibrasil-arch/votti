import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin, getSupabaseAsUser, getSupabaseForRead } from "./supabase.server";
import type { DbPartidaRow } from "../bolao/db-types";
import { WORLD_CUP_2026_CATALOG } from "../bolao/official-catalog";
import { getServerConfig } from "../config.server";
import { getUserFromAccessToken } from "./auth.server";

const listPartidasInput = z.object({
  campeonatoId: z.number().int().positive(),
  accessToken: z.string().min(1).optional(),
});

const resolveOfficialCatalogMatchInput = z.object({
  timeCasa: z.string().trim().min(1),
  timeFora: z.string().trim().min(1),
  dataPartida: z.string().trim().min(1),
  accessToken: z.string().min(1).optional(),
});

const getOfficialCatalogStatusMapInput = z.object({
  accessToken: z.string().min(1).optional(),
});

function catalogSignature(timeCasa: string, timeFora: string, dataPartida: string) {
  const timestamp = new Date(dataPartida).getTime();
  return `${timeCasa}__${timeFora}__${timestamp}`;
}

const OFFICIAL_CAMP_NAME = "Copa do Mundo 2026";
const PERSONAL_CAMP_NAME = "Copa do Mundo 2026 · Meu catálogo";

type PersistedCatalogTarget = {
  campeonatoId: number;
  readAsUser: boolean;
};

function isPolicyOrConstraintError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("row-level security") ||
    lower.includes("violates check constraint") ||
    lower.includes("permission denied") ||
    lower.includes("not allowed")
  );
}

async function ensureUniquePersonalSlug(supabase: ReturnType<typeof getSupabaseAsUser>, userId: string) {
  const base = `copa-2026-${userId.slice(0, 8)}`.toLowerCase();
  const candidates = [base, `${base}-1`, `${base}-2`, `${base}-${Date.now().toString().slice(-5)}`];

  for (const slug of candidates) {
    const { data } = await supabase.from("campeonatos").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  throw new Error("Não foi possível gerar slug para o catálogo pessoal.");
}

async function ensurePersonalCatalogPersisted(
  accessToken: string,
  userId: string,
): Promise<PersistedCatalogTarget> {
  const supabase = getSupabaseAsUser(accessToken);

  const { data: existingCampRows, error: campLookupError } = await supabase
    .from("campeonatos")
    .select("id")
    .eq("tipo", "personalizado")
    .eq("owner_id", userId)
    .eq("nome", PERSONAL_CAMP_NAME)
    .order("id", { ascending: true })
    .limit(1);

  if (campLookupError) {
    throw new Error(`Erro ao buscar catálogo pessoal: ${campLookupError.message}`);
  }

  let campeonatoId = existingCampRows?.[0]?.id as number | undefined;

  if (!campeonatoId) {
    const slug = await ensureUniquePersonalSlug(supabase, userId);
    const { data: insertedCamp, error: insertCampError } = await supabase
      .from("campeonatos")
      .insert({
        nome: PERSONAL_CAMP_NAME,
        api_league_id: null,
        ativo: true,
        tipo: "personalizado",
        owner_id: userId,
        slug,
        descricao: "Catálogo pessoal sincronizado da Copa do Mundo FIFA 2026",
        cidade: "Estados Unidos · México · Canadá",
      })
      .select("id")
      .single();

    if (insertCampError || !insertedCamp) {
      throw new Error(`Erro ao criar catálogo pessoal: ${insertCampError?.message ?? "desconhecido"}`);
    }
    campeonatoId = insertedCamp.id as number;
  }

  const { data: existingMatches, error: existingMatchesError } = await supabase
    .from("partidas")
    .select("id, time_casa, time_fora, data_partida")
    .eq("campeonato_id", campeonatoId);

  if (existingMatchesError) {
    throw new Error(`Erro ao ler partidas do catálogo pessoal: ${existingMatchesError.message}`);
  }

  const existingKeys = new Set<string>();
  for (const row of existingMatches ?? []) {
    if (!row.data_partida) continue;
    existingKeys.add(catalogSignature(row.time_casa as string, row.time_fora as string, row.data_partida));
  }

  const missingPayload = WORLD_CUP_2026_CATALOG.filter((match) => {
    const key = catalogSignature(match.timeCasa, match.timeFora, match.dataPartida);
    return !existingKeys.has(key);
  }).map((match) => ({
    campeonato_id: campeonatoId,
    fase: match.grupo,
    ordem: match.ordem,
    time_casa: match.timeCasa,
    time_fora: match.timeFora,
    status: "agendado",
    data_partida: match.dataPartida,
  }));

  if (missingPayload.length > 0) {
    const { error: insertMatchesError } = await supabase.from("partidas").insert(missingPayload);
    if (insertMatchesError) {
      throw new Error(`Erro ao salvar partidas no catálogo pessoal: ${insertMatchesError.message}`);
    }
  }

  return { campeonatoId, readAsUser: true };
}

async function ensureOfficialCatalogPersisted(accessToken?: string): Promise<PersistedCatalogTarget> {
  const hasServiceRole = Boolean(getServerConfig().supabase.serviceRoleKey);
  const user = accessToken ? await getUserFromAccessToken(accessToken) : null;
  const supabase = hasServiceRole
    ? getSupabaseAdmin()
    : accessToken
      ? getSupabaseAsUser(accessToken)
      : getSupabaseForRead();

  const { data: existingCampRows, error: campLookupError } = await supabase
    .from("campeonatos")
    .select("id, nome")
    .eq("tipo", "oficial")
    .eq("nome", OFFICIAL_CAMP_NAME)
    .order("id", { ascending: true })
    .limit(1);

  if (campLookupError) {
    throw new Error(`Erro ao buscar campeonato oficial: ${campLookupError.message}`);
  }

  let campeonatoId = existingCampRows?.[0]?.id as number | undefined;

  if (!campeonatoId) {
    if (!hasServiceRole && !accessToken) {
      throw new Error(
        "Catálogo oficial ainda não foi salvo no banco e falta permissão para criar automaticamente.",
      );
    }

    const { data: insertedCamp, error: insertCampError } = await supabase
      .from("campeonatos")
      .insert({
        nome: OFFICIAL_CAMP_NAME,
        api_league_id: 1,
        ativo: true,
        tipo: "oficial",
        owner_id: null,
        descricao: "Catálogo oficial da Copa do Mundo FIFA 2026",
        cidade: "Estados Unidos · México · Canadá",
      })
      .select("id")
      .single();

    if (insertCampError || !insertedCamp) {
      if (accessToken && user?.id && isPolicyOrConstraintError(insertCampError?.message ?? "")) {
        return ensurePersonalCatalogPersisted(accessToken, user.id);
      }
      throw new Error(
        `Erro ao criar campeonato oficial: ${insertCampError?.message ?? "desconhecido"}`,
      );
    }
    campeonatoId = insertedCamp.id as number;
  }

  const { data: existingMatches, error: existingMatchesError } = await supabase
    .from("partidas")
    .select("id, time_casa, time_fora, data_partida")
    .eq("campeonato_id", campeonatoId);

  if (existingMatchesError) {
    if (accessToken && user?.id && isPolicyOrConstraintError(existingMatchesError.message)) {
      return ensurePersonalCatalogPersisted(accessToken, user.id);
    }
    throw new Error(`Erro ao ler partidas oficiais: ${existingMatchesError.message}`);
  }

  const existingKeys = new Set<string>();
  for (const row of existingMatches ?? []) {
    if (!row.data_partida) continue;
    existingKeys.add(catalogSignature(row.time_casa as string, row.time_fora as string, row.data_partida));
  }

  const missingPayload = WORLD_CUP_2026_CATALOG.filter((match) => {
    const key = catalogSignature(match.timeCasa, match.timeFora, match.dataPartida);
    return !existingKeys.has(key);
  }).map((match) => ({
    campeonato_id: campeonatoId,
    fase: match.grupo,
    ordem: match.ordem,
    time_casa: match.timeCasa,
    time_fora: match.timeFora,
    status: "agendado",
    data_partida: match.dataPartida,
  }));

  if (missingPayload.length > 0) {
    const { error: insertMatchesError } = await supabase.from("partidas").insert(missingPayload);
    if (insertMatchesError) {
      if (accessToken && user?.id && isPolicyOrConstraintError(insertMatchesError.message)) {
        return ensurePersonalCatalogPersisted(accessToken, user.id);
      }
      throw new Error(
        `Erro ao salvar partidas oficiais da Copa 2026: ${insertMatchesError.message}. Verifique as policies de INSERT em campeonatos/partidas para usuário autenticado.`,
      );
    }
  }

  return { campeonatoId, readAsUser: false };
}

const PARTIDA_SELECT = `
  id,
  campeonato_id,
  time_casa,
  time_fora,
  placar_casa,
  placar_fora,
  status,
  data_partida,
  fase,
  escudo_casa,
  escudo_fora,
  ordem,
  created_at,
  campeonatos (
    id,
    nome,
    api_league_id,
    ativo,
    owner_id,
    tipo,
    banner_url,
    descricao
  )
`;

export const listMatches = createServerFn({ method: "GET" })
  .validator((data: unknown) => listPartidasInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    // Campeonatos personalizados exigem JWT do dono (RLS partidas_select_own).
    const supabase = data.accessToken ? getSupabaseAsUser(data.accessToken) : getSupabaseForRead();

    const { data: rows, error } = await supabase
      .from("partidas")
      .select(PARTIDA_SELECT)
      .eq("campeonato_id", data.campeonatoId)
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("data_partida", { ascending: true });

    if (error) {
      throw new Error(
        `Erro ao carregar partidas: ${error.message} (${error.code ?? "sem código"})`,
      );
    }

    return (rows ?? []) as DbPartidaRow[];
  });

export const resolveOfficialCatalogMatch = createServerFn({ method: "GET" })
  .validator((data: unknown) => resolveOfficialCatalogMatchInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const target = await ensureOfficialCatalogPersisted(data.accessToken);
    const supabase = target.readAsUser && data.accessToken
      ? getSupabaseAsUser(data.accessToken)
      : getSupabaseForRead();

    const { data: rows, error } = await supabase
      .from("partidas")
      .select("id, time_casa, time_fora, data_partida")
      .eq("campeonato_id", target.campeonatoId)
      .eq("time_casa", data.timeCasa)
      .eq("time_fora", data.timeFora)
      .order("data_partida", { ascending: true });

    if (error) {
      throw new Error(`Erro ao localizar partida oficial: ${error.message}`);
    }

    const expected = new Date(data.dataPartida).getTime();
    const exact = (rows ?? []).find((row) => {
      const timestamp = row.data_partida ? new Date(row.data_partida).getTime() : Number.NaN;
      return Number.isFinite(expected) && Number.isFinite(timestamp) && expected === timestamp;
    });

    const first = exact ?? rows?.[0];
    if (!first) {
      throw new Error("Partida oficial não encontrada após sincronizar o catálogo da Copa 2026.");
    }

    return { partidaId: first.id as number };
  });

export const getOfficialCatalogStatusMap = createServerFn({ method: "GET" })
  .validator((data: unknown) => getOfficialCatalogStatusMapInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const target = await ensureOfficialCatalogPersisted(data.accessToken);
    const supabase = target.readAsUser && data.accessToken
      ? getSupabaseAsUser(data.accessToken)
      : getSupabaseForRead();

    const { data: rows, error } = await supabase
      .from("partidas")
      .select("time_casa, time_fora, data_partida, status")
      .eq("campeonato_id", target.campeonatoId)
      .order("data_partida", { ascending: true });

    if (error) {
      throw new Error(`Erro ao carregar status do catálogo oficial: ${error.message}`);
    }

    const rowMap = new Map<string, string>();
    for (const row of rows ?? []) {
      if (!row.data_partida) continue;
      rowMap.set(
        catalogSignature(row.time_casa as string, row.time_fora as string, row.data_partida),
        row.status as string,
      );
    }

    const statusByCatalogId: Record<string, string> = {};
    for (const match of WORLD_CUP_2026_CATALOG) {
      const key = catalogSignature(match.timeCasa, match.timeFora, match.dataPartida);
      statusByCatalogId[match.id] = rowMap.get(key) ?? "agendado";
    }

    return statusByCatalogId;
  });
