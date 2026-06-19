import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserFromAccessToken } from "./auth.server";
import { getSupabaseAsUser, getSupabaseServer } from "./supabase.server";
import { buildBolaoJoinPath } from "../bolao/share-url";
import { resolveServerShareOrigin } from "../bolao/share-origin.server";
import {
  CAMPEONATO_OWNER_COLUMNS,
  CAMPEONATO_OWNER_COLUMNS_FALLBACK,
  PARTIDA_OWNER_COLUMNS,
  deterministicCampeonatoSlug,
  ensureSlugOnCampeonato,
  fetchPartidasForCampeonato,
  insertPartidasForOwner,
} from "./campeonato-owner-helpers";
import type {
  CampeonatoAdminData,
  CampeonatoBolaoInfo,
  DbCampeonatoRow,
  DbPartidaRow,
  DbParticipanteAdmin,
} from "../bolao/db-types";
import { resolveApostasAbertas } from "../bolao/campeonato-meta";

const CAMPEONATO_COLUMNS = CAMPEONATO_OWNER_COLUMNS;
const CAMPEONATO_COLUMNS_FALLBACK = CAMPEONATO_OWNER_COLUMNS_FALLBACK;
const PARTIDA_COLUMNS = PARTIDA_OWNER_COLUMNS;

const authCampRefBase = z.object({
  accessToken: z.string().min(1),
  slug: z.string().trim().min(1).optional(),
  campeonatoId: z.number().int().positive().optional(),
});

function refineCampRef<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine((d: { slug?: string; campeonatoId?: number }) => !!(d.slug || d.campeonatoId), {
    message: "Informe slug ou campeonatoId",
  });
}

const authCampRefInput = refineCampRef(authCampRefBase);

const jogoInput = z.object({
  fase: z.string().trim().max(80).optional(),
  timeCasa: z.string().trim().min(1).max(80),
  timeFora: z.string().trim().min(1).max(80),
  escudoCasaUrl: z.string().url().optional().nullable(),
  escudoForaUrl: z.string().url().optional().nullable(),
  dataPartida: z.string().optional().nullable(),
  ordem: z.number().int().nonnegative(),
});

function buildBolaoShareUrl(slug: string) {
  return `${resolveServerShareOrigin()}${buildBolaoJoinPath(slug)}`;
}

function buildCampeonatoBolaoSlug(campeonatoSlug: string) {
  return `bolao-${campeonatoSlug}`;
}

function formatSupabaseError(context: string, error: { message: string; code?: string } | null) {
  if (!error) return `${context}: erro desconhecido`;
  if (error.code === "PGRST204") {
    return `${context}: coluna ausente no banco. Execute docs/supabase/migration-campeonato-admin.sql`;
  }
  if (error.code === "42501" || error.message.includes("row-level security")) {
    return `${context}: bloqueado por RLS. Verifique as policies no Supabase.`;
  }
  return `${context}: ${error.message}${error.code ? ` (${error.code})` : ""}`;
}

async function fetchCampeonatoForOwner(
  supabase: ReturnType<typeof getSupabaseAsUser>,
  slug: string,
  userId: string,
): Promise<DbCampeonatoRow | null> {
  let { data, error } = await supabase
    .from("campeonatos")
    .select(CAMPEONATO_COLUMNS)
    .eq("slug", slug)
    .eq("tipo", "personalizado")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error?.code === "PGRST204") {
    const fallback = await supabase
      .from("campeonatos")
      .select(CAMPEONATO_COLUMNS_FALLBACK)
      .eq("slug", slug)
      .eq("tipo", "personalizado")
      .eq("owner_id", userId)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(formatSupabaseError("Erro ao carregar campeonato", error));
  return (data as DbCampeonatoRow | null) ?? null;
}

async function resolveCampeonatoForOwner(
  supabase: ReturnType<typeof getSupabaseAsUser>,
  userId: string,
  opts: { slug?: string; campeonatoId?: number },
): Promise<DbCampeonatoRow | null> {
  if (opts.campeonatoId) {
    let { data, error } = await supabase
      .from("campeonatos")
      .select(CAMPEONATO_COLUMNS)
      .eq("id", opts.campeonatoId)
      .eq("tipo", "personalizado")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error?.code === "PGRST204") {
      const fallback = await supabase
        .from("campeonatos")
        .select(CAMPEONATO_COLUMNS_FALLBACK)
        .eq("id", opts.campeonatoId)
        .eq("tipo", "personalizado")
        .eq("owner_id", userId)
        .maybeSingle();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw new Error(formatSupabaseError("Erro ao carregar campeonato", error));
    if (!data) return null;
    return ensureSlugOnCampeonato(supabase, data as DbCampeonatoRow);
  }

  if (opts.slug) {
    return fetchCampeonatoForOwner(supabase, opts.slug, userId);
  }

  return null;
}

function mapBolaoInfo(row: { id: string; slug: string; stake: number; status: string }): CampeonatoBolaoInfo {
  return {
    id: row.id,
    slug: row.slug,
    shareUrl: buildBolaoShareUrl(row.slug),
    stake: Number(row.stake) || 10,
    status: row.status,
  };
}

async function fetchCampeonatoBolao(
  supabase: ReturnType<typeof getSupabaseAsUser>,
  campeonato: DbCampeonatoRow,
): Promise<CampeonatoBolaoInfo | null> {
  const campSlug = campeonato.slug ?? deterministicCampeonatoSlug(campeonato.id);
  const bolaoSlug = buildCampeonatoBolaoSlug(campSlug);

  const { data: bySlug } = await supabase
    .from("boloes")
    .select("id, slug, stake, status")
    .eq("slug", bolaoSlug)
    .maybeSingle();

  if (bySlug) return mapBolaoInfo(bySlug);

  const { data: byCamp, error } = await supabase
    .from("boloes")
    .select("id, slug, stake, status")
    .eq("campeonato_id", campeonato.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error?.code === "PGRST204") return null;
  if (!byCamp) return null;

  return mapBolaoInfo(byCamp);
}

async function createCampeonatoBolao(
  supabase: ReturnType<typeof getSupabaseAsUser>,
  campeonato: DbCampeonatoRow,
  userId: string,
  primeiraPartidaId: number | null,
  stake: number,
  modoExclusivo: boolean,
): Promise<CampeonatoBolaoInfo> {
  if (!campeonato.slug) throw new Error("Campeonato sem link válido.");

  const existing = await fetchCampeonatoBolao(supabase, campeonato);
  if (existing) return existing;

  const bolaoSlug = buildCampeonatoBolaoSlug(campeonato.slug);

  const payloadWithCamp: Record<string, unknown> = {
    slug: bolaoSlug,
    usuario_id: userId,
    campeonato_id: campeonato.id,
    partida_id: primeiraPartidaId,
    stake,
    modo_exclusivo: modoExclusivo,
    status: "aberto",
  };

  let { data: created, error } = await supabase
    .from("boloes")
    .insert(payloadWithCamp)
    .select("id, slug, stake, status")
    .single();

  if (error?.code === "PGRST204") {
    const fallback = await supabase
      .from("boloes")
      .insert({
        slug: bolaoSlug,
        usuario_id: userId,
        partida_id: primeiraPartidaId,
        stake,
        modo_exclusivo: modoExclusivo,
        status: "aberto",
      })
      .select("id, slug, stake, status")
      .single();
    created = fallback.data;
    error = fallback.error;
  }

  if (error || !created) {
    throw new Error(formatSupabaseError("Erro ao ativar bolão", error));
  }

  return mapBolaoInfo(created);
}

async function loadParticipantes(
  supabase: ReturnType<typeof getSupabaseAsUser>,
  campeonatoId: number,
  bolaoId: string | null,
  partidaIds: number[],
): Promise<DbParticipanteAdmin[]> {
  const bolaoIds = new Set<string>();
  if (bolaoId) bolaoIds.add(bolaoId);

  if (partidaIds.length > 0) {
    const { data: boloesPartida } = await supabase
      .from("boloes")
      .select("id")
      .in("partida_id", partidaIds);
    for (const b of boloesPartida ?? []) bolaoIds.add(b.id);
  }

  const { data: boloesCamp, error: boloesCampError } = await supabase
    .from("boloes")
    .select("id")
    .eq("campeonato_id", campeonatoId);
  if (!boloesCampError) {
    for (const b of boloesCamp ?? []) bolaoIds.add(b.id);
  }

  if (bolaoIds.size === 0) return [];

  const { data: rows, error } = await supabase
    .from("participantes")
    .select("id, nome, cidade, status, created_at, bolao_id")
    .in("bolao_id", [...bolaoIds])
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "PGRST204") return [];
    throw new Error(formatSupabaseError("Erro ao carregar participantes", error));
  }

  const byNome = new Map<string, DbParticipanteAdmin>();
  for (const row of rows ?? []) {
    const key = row.nome.trim().toLowerCase();
    const existing = byNome.get(key);
    if (existing) {
      existing.palpites_count += 1;
      if (new Date(row.created_at) < new Date(existing.created_at)) {
        existing.created_at = row.created_at;
      }
      if (!existing.cidade && row.cidade) existing.cidade = row.cidade;
    } else {
      byNome.set(key, {
        id: row.id,
        nome: row.nome,
        cidade: row.cidade ?? null,
        created_at: row.created_at,
        palpites_count: 1,
        status: row.status,
      });
    }
  }

  return [...byNome.values()];
}

export const getCampeonatoAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => authCampRefInput.parse(data))
  .handler(async ({ data }): Promise<CampeonatoAdminData | null> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const campeonato = await resolveCampeonatoForOwner(supabase, user.id, data);
    if (!campeonato) return null;

    const partidasRows = await fetchPartidasForCampeonato(supabase, campeonato.id);

    let bolao: CampeonatoBolaoInfo | null = null;
    try {
      bolao = await fetchCampeonatoBolao(supabase, campeonato);
    } catch {
      bolao = null;
    }

    let participantes: DbParticipanteAdmin[] = [];
    try {
      participantes = await loadParticipantes(
        supabase,
        campeonato.id,
        bolao?.id ?? null,
        partidasRows.map((p) => p.id),
      );
    } catch {
      participantes = [];
    }

    return {
      campeonato: { ...campeonato, apostas_abertas: resolveApostasAbertas(campeonato) },
      partidas: partidasRows,
      participantes_count: participantes.length,
      bolao,
      participantes,
    };
  });

const addPartidaInput = refineCampRef(
  authCampRefBase.extend({
    jogo: jogoInput,
  }),
);

export const addPartidaToCampeonato = createServerFn({ method: "POST" })
  .validator((data: unknown) => addPartidaInput.parse(data))
  .handler(async ({ data }): Promise<DbPartidaRow> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const campeonato = await resolveCampeonatoForOwner(supabase, user.id, data);
    if (!campeonato) throw new Error("Campeonato não encontrado");

    const { count } = await supabase
      .from("partidas")
      .select("id", { count: "exact", head: true })
      .eq("campeonato_id", campeonato.id);

    const ordem = data.jogo.ordem ?? (count ?? 0) + 1;
    const rows = await insertPartidasForOwner(supabase, campeonato.id, user.id, [{ ...data.jogo, ordem }]);
    return rows[0];
  });

const updatePartidaInput = refineCampRef(
  authCampRefBase.extend({
    partidaId: z.number().int().positive(),
    jogo: jogoInput,
  }),
);

export const updatePartidaInCampeonato = createServerFn({ method: "POST" })
  .validator((data: unknown) => updatePartidaInput.parse(data))
  .handler(async ({ data }): Promise<DbPartidaRow> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const campeonato = await resolveCampeonatoForOwner(supabase, user.id, data);
    if (!campeonato) throw new Error("Campeonato não encontrado");

    const { data: updated, error } = await supabase
      .from("partidas")
      .update({
        time_casa: data.jogo.timeCasa,
        time_fora: data.jogo.timeFora,
        fase: data.jogo.fase?.trim() || null,
        escudo_casa: data.jogo.escudoCasaUrl ?? null,
        escudo_fora: data.jogo.escudoForaUrl ?? null,
        ordem: data.jogo.ordem,
        data_partida: data.jogo.dataPartida || null,
      })
      .eq("id", data.partidaId)
      .eq("campeonato_id", campeonato.id)
      .select(PARTIDA_COLUMNS)
      .single();

    if (error || !updated) throw new Error(formatSupabaseError("Erro ao atualizar jogo", error));
    return updated as DbPartidaRow;
  });

const deletePartidaInput = refineCampRef(
  authCampRefBase.extend({
    partidaId: z.number().int().positive(),
  }),
);

export const deletePartidaFromCampeonato = createServerFn({ method: "POST" })
  .validator((data: unknown) => deletePartidaInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const campeonato = await resolveCampeonatoForOwner(supabase, user.id, data);
    if (!campeonato) throw new Error("Campeonato não encontrado");

    const { error } = await supabase
      .from("partidas")
      .delete()
      .eq("id", data.partidaId)
      .eq("campeonato_id", campeonato.id);

    if (error) throw new Error(formatSupabaseError("Erro ao excluir jogo", error));
    return { ok: true };
  });

const updateCampeonatoInput = refineCampRef(
  authCampRefBase.extend({
    nome: z.string().trim().min(2).max(80).optional(),
    descricao: z.string().trim().max(500).optional().nullable(),
    bannerUrl: z.string().url().optional().nullable(),
    escudoUrl: z.string().url().optional().nullable(),
    cidade: z.string().trim().max(80).optional().nullable(),
  }),
);

export const updateCampeonatoPersonalizado = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateCampeonatoInput.parse(data))
  .handler(async ({ data }): Promise<DbCampeonatoRow> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const campeonato = await resolveCampeonatoForOwner(supabase, user.id, data);
    if (!campeonato) throw new Error("Campeonato não encontrado");

    const patch: Record<string, unknown> = {};
    if (data.nome !== undefined) patch.nome = data.nome;
    if (data.descricao !== undefined) patch.descricao = data.descricao;
    if (data.bannerUrl !== undefined) patch.banner_url = data.bannerUrl;
    if (data.escudoUrl !== undefined) patch.escudo_url = data.escudoUrl;
    if (data.cidade !== undefined) patch.cidade = data.cidade;

    const { data: updated, error } = await supabase
      .from("campeonatos")
      .update(patch)
      .eq("id", campeonato.id)
      .select(CAMPEONATO_COLUMNS)
      .single();

    if (error?.code === "PGRST204") {
      const fallback = await supabase
        .from("campeonatos")
        .update(patch)
        .eq("id", campeonato.id)
        .select(CAMPEONATO_COLUMNS_FALLBACK)
        .single();
      if (fallback.error || !fallback.data) {
        throw new Error(formatSupabaseError("Erro ao atualizar campeonato", fallback.error));
      }
      return fallback.data as DbCampeonatoRow;
    }

    if (error || !updated) {
      const hint =
        error && (error.code === "42501" || error.message.includes("row-level security"))
          ? " Execute docs/supabase/migration-campeonatos-owner.sql no Supabase."
          : "";
      throw new Error(`${formatSupabaseError("Erro ao atualizar campeonato", error)}${hint}`);
    }
    return updated as DbCampeonatoRow;
  });

const toggleApostasInput = refineCampRef(
  authCampRefBase.extend({
    abertas: z.boolean(),
  }),
);

export const toggleCampeonatoApostas = createServerFn({ method: "POST" })
  .validator((data: unknown) => toggleApostasInput.parse(data))
  .handler(async ({ data }): Promise<DbCampeonatoRow> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const campeonato = await resolveCampeonatoForOwner(supabase, user.id, data);
    if (!campeonato) throw new Error("Campeonato não encontrado");

    let { data: updated, error } = await supabase
      .from("campeonatos")
      .update({ apostas_abertas: data.abertas })
      .eq("id", campeonato.id)
      .select(CAMPEONATO_COLUMNS)
      .single();

    if (error?.code === "PGRST204") {
      const fallback = await supabase
        .from("campeonatos")
        .update({ ativo: data.abertas })
        .eq("id", campeonato.id)
        .select(CAMPEONATO_COLUMNS_FALLBACK)
        .single();
      updated = fallback.data;
      error = fallback.error;
    }

    if (error || !updated) throw new Error(formatSupabaseError("Erro ao alterar apostas", error));
    return { ...(updated as DbCampeonatoRow), apostas_abertas: data.abertas };
  });

export const deleteCampeonatoPersonalizado = createServerFn({ method: "POST" })
  .validator((data: unknown) => authCampRefInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const campeonato = await resolveCampeonatoForOwner(supabase, user.id, data);
    if (!campeonato) throw new Error("Campeonato não encontrado");

    const slugForDelete = campeonato.slug ?? deterministicCampeonatoSlug(campeonato.id);

    const { error: rpcError } = await supabase.rpc("delete_campeonato_para_dono", {
      p_slug: slugForDelete,
    });

    if (!rpcError) return { ok: true };

    const rpcMissing =
      rpcError.code === "PGRST202" ||
      rpcError.code === "42883" ||
      rpcError.message?.includes("delete_campeonato_para_dono");

    if (!rpcMissing) {
      throw new Error(formatSupabaseError("Erro ao excluir campeonato", rpcError));
    }

    const { data: partidaIds } = await supabase
      .from("partidas")
      .select("id")
      .eq("campeonato_id", campeonato.id);

    const partidaIdList = (partidaIds ?? []).map((p) => p.id);

    if (partidaIdList.length > 0) {
      await supabase.from("boloes").delete().in("partida_id", partidaIdList);
    }

    await supabase.from("boloes").delete().eq("campeonato_id", campeonato.id);
    await supabase.from("partidas").delete().eq("campeonato_id", campeonato.id);

    const { error } = await supabase.from("campeonatos").delete().eq("id", campeonato.id);
    if (error) {
      const hint =
        error.code === "42501" || error.message.includes("row-level security")
          ? " Execute docs/supabase/migration-campeonato-delete.sql no Supabase."
          : "";
      throw new Error(`${formatSupabaseError("Erro ao excluir campeonato", error)}${hint}`);
    }

    return { ok: true };
  });

const classificacaoInput = refineCampRef(
  authCampRefBase.extend({
    partidaId: z.number().int().positive(),
  }),
);

export type ClassificacaoEntry = {
  posicao: number;
  nome: string;
  pontuacao: number;
  acertos: number;
  palpite: [number, number];
  vivo: boolean;
};

export const getCampeonatoClassificacao = createServerFn({ method: "POST" })
  .validator((data: unknown) => classificacaoInput.parse(data))
  .handler(async ({ data }): Promise<ClassificacaoEntry[]> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const campeonato = await resolveCampeonatoForOwner(supabase, user.id, data);
    if (!campeonato) throw new Error("Campeonato não encontrado");

    const { data: partida, error: partidaError } = await supabase
      .from("partidas")
      .select(PARTIDA_COLUMNS)
      .eq("id", data.partidaId)
      .eq("campeonato_id", campeonato.id)
      .maybeSingle();

    if (partidaError || !partida) throw new Error("Jogo não encontrado");

    const placar: [number, number] = [partida.placar_casa ?? 0, partida.placar_fora ?? 0];

    const { data: boloes } = await supabase
      .from("boloes")
      .select("id")
      .eq("partida_id", partida.id);

    const bolaoIds = (boloes ?? []).map((b) => b.id);
    if (bolaoIds.length === 0) return [];

    const { data: participantes, error } = await supabase
      .from("participantes")
      .select("nome, palpite_casa, palpite_fora, status")
      .in("bolao_id", bolaoIds)
      .in("status", ["aprovado", "approved", "confirmado"]);

    if (error) throw new Error(formatSupabaseError("Erro ao carregar classificação", error));

    const { rankParticipants, isAlive } = await import("../bolao/scoring");

    const mapped = (participantes ?? []).map((p) => ({
      name: p.nome,
      avatar: p.nome[0]?.toUpperCase() ?? "?",
      guess: [p.palpite_casa, p.palpite_fora] as [number, number],
      isYou: false,
    }));

    const ranked = rankParticipants(mapped, placar);

    return ranked.map((p, i) => ({
      posicao: i + 1,
      nome: p.name,
      pontuacao: p.alive ? Math.max(0, 10 - p.distance) : 0,
      acertos: p.distance === 0 && p.alive ? 1 : 0,
      palpite: p.guess,
      vivo: p.alive,
    }));
  });

const ativarBolaoInput = refineCampRef(
  authCampRefBase.extend({
    stake: z.number().min(1).max(10000).default(10),
    modoExclusivo: z.boolean().default(true),
  }),
);

export const ativarBolaoCampeonato = createServerFn({ method: "POST" })
  .validator((data: unknown) => ativarBolaoInput.parse(data))
  .handler(async ({ data }): Promise<CampeonatoBolaoInfo> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const campeonato = await resolveCampeonatoForOwner(supabase, user.id, data);
    if (!campeonato) throw new Error("Campeonato não encontrado");

    const { data: primeiraPartida } = await supabase
      .from("partidas")
      .select("id")
      .eq("campeonato_id", campeonato.id)
      .order("ordem", { ascending: true })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    return createCampeonatoBolao(
      supabase,
      campeonato,
      user.id,
      primeiraPartida?.id ?? null,
      data.stake,
      data.modoExclusivo,
    );
  });

export { buildBolaoShareUrl };
