import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserFromAccessToken } from "./auth.server";
import { getSupabaseAdmin, getSupabaseAsUser, getSupabaseForRead, getSupabaseServer } from "./supabase.server";
import { getServerConfig } from "../config.server";
import { buildBolaoJoinUrl } from "../bolao/share-url";
import { resolveServerShareOrigin } from "../bolao/share-origin.server";
import { buildBolaoSlug } from "../bolao/slug";
import { rankingLiderFromParticipantes } from "../bolao/campeonato-ui";
import { normalizeBolaoWithPartida, resolveBolaoEffectiveStatus, resolvePartidaRow } from "../bolao/bolao-status";
import { mapDbBolaoToFlowView, type BolaoDbRow } from "../bolao/bolao-view";
import type { Bolao } from "../bolao/types";
import type { CreateBolaoResult, DbBolaoWithPartida } from "../bolao/db-types";

const BOLAO_SELECT = `
  id,
  slug,
  usuario_id,
  partida_id,
  stake,
  modo_exclusivo,
  taxa_percent,
  cobra_taxa,
  status,
  created_at,
  partidas (
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
    campeonatos ( id, nome, tipo, banner_url )
  ),
  participantes ( id, nome, cidade, palpite_casa, palpite_fora, status, created_at )
`;

function buildShareUrl(slug: string) {
  return buildBolaoJoinUrl(slug, resolveServerShareOrigin());
}

async function persistBolaoStatus(row: BolaoDbRow, nextStatus: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("boloes").update({ status: nextStatus }).eq("id", row.id);
  if (error) {
    throw new Error(`Erro ao sincronizar status do bolão: ${error.message}`);
  }
}

async function countOtherAoVivoBoloes(partidaId: number, bolaoId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const { count, error } = await admin
    .from("boloes")
    .select("id", { count: "exact", head: true })
    .eq("partida_id", partidaId)
    .eq("status", "ao_vivo")
    .neq("id", bolaoId);

  if (error) {
    throw new Error(`Erro ao verificar outros bolões: ${error.message}`);
  }
  return count ?? 0;
}

async function closeBolaoAsUser(
  accessToken: string,
  row: BolaoDbRow,
  placarCasa: number,
  placarFora: number,
): Promise<boolean> {
  if (!row.partida_id) return false;

  const supabase = getSupabaseAsUser(accessToken);

  const { data: bolaoUpdated, error: bolaoError } = await supabase
    .from("boloes")
    .update({ status: "encerrado" })
    .eq("id", row.id)
    .select("id")
    .maybeSingle();

  if (bolaoError || !bolaoUpdated) return false;

  await supabase
    .from("partidas")
    .update({
      placar_casa: placarCasa,
      placar_fora: placarFora,
    })
    .eq("id", row.partida_id);

  return true;
}

async function reopenBolaoAsUser(accessToken: string, row: BolaoDbRow): Promise<boolean> {
  if (!row.partida_id) return false;

  const supabase = getSupabaseAsUser(accessToken);

  const { data: bolaoUpdated, error: bolaoError } = await supabase
    .from("boloes")
    .update({ status: "ao_vivo" })
    .eq("id", row.id)
    .select("id")
    .maybeSingle();

  if (bolaoError || !bolaoUpdated) return false;

  await supabase.from("partidas").update({ status: "ao_vivo" }).eq("id", row.partida_id);

  return true;
}

async function reopenBolaoAndPartida(row: BolaoDbRow): Promise<void> {
  if (!row.partida_id) throw new Error("Bolão sem partida vinculada");

  const admin = getSupabaseAdmin();

  const { data: partidaUpdated, error: partidaError } = await admin
    .from("partidas")
    .update({ status: "ao_vivo" })
    .eq("id", row.partida_id)
    .select("id")
    .maybeSingle();

  if (partidaError) {
    throw new Error(`Erro ao reabrir partida: ${partidaError.message}`);
  }
  if (!partidaUpdated) {
    throw new Error("Não foi possível reabrir a partida. Verifique a configuração do Supabase no servidor.");
  }

  const { data: bolaoUpdated, error: bolaoError } = await admin
    .from("boloes")
    .update({ status: "ao_vivo" })
    .eq("id", row.id)
    .select("id, status")
    .maybeSingle();

  if (bolaoError) {
    throw new Error(`Erro ao reabrir bolão: ${bolaoError.message}`);
  }
  if (!bolaoUpdated) {
    throw new Error("Não foi possível reabrir o bolão. Verifique a configuração do Supabase no servidor.");
  }
}

async function closeBolaoAndPartida(
  row: BolaoDbRow,
  placarCasa: number,
  placarFora: number,
): Promise<void> {
  if (!row.partida_id) throw new Error("Bolão sem partida vinculada");

  const admin = getSupabaseAdmin();
  const outrosAoVivo = await countOtherAoVivoBoloes(row.partida_id, row.id);

  const partidaPatch: { placar_casa: number; placar_fora: number; status?: string } = {
    placar_casa: placarCasa,
    placar_fora: placarFora,
  };
  if (outrosAoVivo === 0) {
    partidaPatch.status = "encerrado";
  }

  const { data: partidaUpdated, error: partidaError } = await admin
    .from("partidas")
    .update(partidaPatch)
    .eq("id", row.partida_id)
    .select("id")
    .maybeSingle();

  if (partidaError) {
    throw new Error(`Erro ao encerrar partida: ${partidaError.message}`);
  }
  if (!partidaUpdated) {
    throw new Error("Não foi possível encerrar a partida. Verifique a configuração do Supabase no servidor.");
  }

  const { data: bolaoUpdated, error: bolaoError } = await admin
    .from("boloes")
    .update({ status: "encerrado" })
    .eq("id", row.id)
    .select("id, status")
    .maybeSingle();

  if (bolaoError) {
    throw new Error(`Erro ao encerrar bolão: ${bolaoError.message}`);
  }
  if (!bolaoUpdated) {
    throw new Error("Não foi possível encerrar o bolão. Verifique a configuração do Supabase no servidor.");
  }
}

async function syncBolaoStatusFromPartida(row: BolaoDbRow): Promise<BolaoDbRow> {
  const partida = resolvePartidaRow(row.partidas);
  if (!partida) return row;

  if (row.status === "aberto" || row.status === "ao_vivo") {
    return row;
  }

  const nextStatus = resolveBolaoEffectiveStatus(row.status, partida.status);
  if (nextStatus === row.status) return row;

  try {
    await persistBolaoStatus(row, nextStatus);
  } catch {
    // UI usa status efetivo mesmo se a gravação falhar (ex.: sem service role).
  }

  return { ...row, status: nextStatus };
}

async function fetchBolaoBySlug(slug: string): Promise<BolaoDbRow | null> {
  const supabase = getSupabaseForRead();
  const { data, error } = await supabase
    .from("boloes")
    .select(BOLAO_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar bolão: ${error.message}`);
  }
  if (!data) return null;
  return syncBolaoStatusFromPartida(data as BolaoDbRow);
}
const createBolaoInput = z.object({
  accessToken: z.string().min(1),
  partidaId: z.number().int().positive(),
  stake: z.number().min(1).max(10000),
  modoExclusivo: z.boolean(),
  taxaPercent: z.number().min(0).max(100).default(0),
});

const authInput = z.object({
  accessToken: z.string().min(1),
});

async function ensureUniqueSlug(homeTeam: string, awayTeam: string) {
  const supabase = getSupabaseServer();

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = buildBolaoSlug(homeTeam, awayTeam);
    const { data } = await supabase.from("boloes").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }

  throw new Error("Não foi possível gerar um link único. Tente novamente.");
}

function isInsertBolaoRpcRetriable(rpcError: { code?: string; message?: string } | null) {
  if (!rpcError) return false;
  const msg = rpcError.message?.toLowerCase() ?? "";
  return (
    rpcError.code === "PGRST202" ||
    rpcError.code === "PGRST203" ||
    rpcError.code === "42883" ||
    msg.includes("insert_bolao_para_usuario") ||
    msg.includes("could not choose the best candidate function")
  );
}

async function patchBolaoCampeonatoId(
  supabase: ReturnType<typeof getSupabaseAsUser>,
  bolaoId: string,
  campeonatoId?: number | null,
) {
  if (!campeonatoId) return;
  await supabase.from("boloes").update({ campeonato_id: campeonatoId }).eq("id", bolaoId);
}

async function insertBolaoRow(
  supabase: ReturnType<typeof getSupabaseAsUser>,
  userId: string,
  partidaId: number,
  slug: string,
  stake: number,
  modoExclusivo: boolean,
  taxaPercent: number,
  campeonatoId?: number | null,
): Promise<{ id: string; slug: string }> {
  const { data: rpcRows, error: rpcError } = await supabase.rpc("insert_bolao_para_usuario", {
    p_partida_id: partidaId,
    p_slug: slug,
    p_stake: stake,
    p_modo_exclusivo: modoExclusivo,
    p_taxa_percent: taxaPercent,
  });

  const rpcRow = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  if (!rpcError && rpcRow?.id && rpcRow?.slug) {
    await patchBolaoCampeonatoId(supabase, rpcRow.id as string, campeonatoId);
    return { id: rpcRow.id as string, slug: rpcRow.slug as string };
  }

  if (rpcError && !isInsertBolaoRpcRetriable(rpcError)) {
    throw new Error(`Erro ao criar bolão: ${rpcError.message}`);
  }

  const insertAttempts: Record<string, unknown>[] = [
    {
      slug,
      partida_id: partidaId,
      campeonato_id: campeonatoId ?? null,
      usuario_id: userId,
      stake,
      modo_exclusivo: modoExclusivo,
      taxa_percent: taxaPercent,
      status: "aberto",
    },
    {
      slug,
      partida_id: partidaId,
      campeonato_id: campeonatoId ?? null,
      usuario_id: userId,
      stake,
      modo_exclusivo: modoExclusivo,
      status: "aberto",
    },
    {
      slug,
      partida_id: partidaId,
      usuario_id: userId,
      stake,
      modo_exclusivo: modoExclusivo,
      status: "aberto",
    },
  ];

  let lastError: { code?: string; message?: string } | null = null;

  for (const payload of insertAttempts) {
    const { data: bolao, error } = await supabase.from("boloes").insert(payload).select("id, slug").single();
    if (!error && bolao) {
      return bolao;
    }
    lastError = error;
    if (error?.code !== "PGRST204") break;
  }

  const hint =
    lastError?.code === "42501"
      ? " Execute docs/supabase/fix-boloes-rls.sql no SQL Editor do Supabase."
      : "";
  throw new Error(`Erro ao criar bolão: ${lastError?.message ?? "desconhecido"}${hint}`);
}

const slugInput = z.object({
  slug: z.string().trim().min(1),
});

export const getBolaoBySlug = createServerFn({ method: "GET" })
  .validator((data: unknown) => slugInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    const row = await fetchBolaoBySlug(data.slug);
    if (!row) return null;
    const shareUrl = buildShareUrl(row.slug);
    const participantes = (row.participantes ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      palpite_casa: p.palpite_casa,
      palpite_fora: p.palpite_fora,
      status: p.status,
    }));
    return {
      bolao: mapDbBolaoToFlowView(row, shareUrl),
      bolaoId: row.id,
      partidaId: row.partida_id ?? null,
      ownerId: row.usuario_id,
      participantes,
    };
  });

const submitPalpiteInput = z.object({
  slug: z.string().trim().min(1),
  nome: z.string().trim().min(2).max(80),
  cidade: z.string().trim().max(80).optional(),
  palpiteCasa: z.number().int().min(0).max(20),
  palpiteFora: z.number().int().min(0).max(20),
});

export const submitBolaoPalpite = createServerFn({ method: "POST" })
  .validator((data: unknown) => submitPalpiteInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const row = await fetchBolaoBySlug(data.slug);
    if (!row) throw new Error("Bolão não encontrado");
    const partida = Array.isArray(row.partidas) ? row.partidas[0] : row.partidas;
    const bolaoAberto = resolveBolaoEffectiveStatus(row.status, partida?.status) === "aberto";
    if (!bolaoAberto) {
      throw new Error("Este bolão já começou. Não é mais possível enviar palpite.");
    }

    const supabase = getSupabaseServer();
    const participantes = row.participantes ?? [];

    if (row.modo_exclusivo) {
      const taken = participantes.some(
        (p) => p.palpite_casa === data.palpiteCasa && p.palpite_fora === data.palpiteFora,
      );
      if (taken) throw new Error("Este placar já foi escolhido. Tente outro.");
    }

    const { error } = await supabase.from("participantes").insert({
      bolao_id: row.id,
      nome: data.nome,
      cidade: data.cidade?.trim() || null,
      palpite_casa: data.palpiteCasa,
      palpite_fora: data.palpiteFora,
      status: "pendente",
    });

    if (error) throw new Error(`Erro ao enviar palpite: ${error.message}`);
    return { ok: true };
  });

const updateStatusInput = z.object({
  accessToken: z.string().min(1),
  slug: z.string().trim().min(1),
  participanteId: z.string().trim().min(1),
  nome: z.string().trim().min(1).optional(),
  palpiteCasa: z.number().int().min(0).max(20).optional(),
  palpiteFora: z.number().int().min(0).max(20).optional(),
  status: z.enum(["aprovado", "rejeitado"]),
});

export const updateParticipanteStatus = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateStatusInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const row = await fetchBolaoBySlug(data.slug);
    if (!row) throw new Error("Bolão não encontrado");
    if (row.usuario_id !== user.id) throw new Error("Sem permissão para administrar este bolão");

    const participantes = row.participantes ?? [];
    const target =
      participantes.find((p) => String(p.id) === String(data.participanteId)) ??
      participantes.find(
        (p) =>
          data.nome &&
          p.nome.trim().toLowerCase() === data.nome.trim().toLowerCase() &&
          p.palpite_casa === data.palpiteCasa &&
          p.palpite_fora === data.palpiteFora,
      );

    if (!target) {
      throw new Error("Participante não encontrado na lista deste bolão.");
    }

    const supabase = getSupabaseAsUser(data.accessToken);
    const { error: rpcError } = await supabase.rpc("update_participante_status_dono", {
      p_bolao_slug: data.slug,
      p_participante_id: target.id,
      p_status: data.status,
    });

    const rpcMissing =
      rpcError?.code === "PGRST202" ||
      rpcError?.code === "42883" ||
      rpcError?.message?.toLowerCase().includes("update_participante_status_dono");

    if (!rpcError) {
      return { ok: true };
    }

    if (!rpcMissing) {
      throw new Error(`Erro ao atualizar participante: ${rpcError.message}`);
    }

    const admin = getSupabaseAdmin();
    const { data: updated, error } = await admin
      .from("participantes")
      .update({ status: data.status })
      .eq("id", target.id)
      .select("id, status")
      .maybeSingle();

    if (error) {
      const hint = error.code === "42501" ? " Execute docs/supabase/fix-participantes-update.sql no Supabase." : "";
      throw new Error(`Erro ao atualizar participante: ${error.message}${hint}`);
    }
    if (!updated) {
      throw new Error(
        "O Supabase bloqueou a aprovação por falta de UPDATE em participantes. Execute docs/supabase/fix-participantes-update.sql no SQL Editor.",
      );
    }

    return { ok: true };
  });

const addManualInput = z.object({
  accessToken: z.string().min(1),
  slug: z.string().trim().min(1),
  nome: z.string().trim().min(2).max(80),
  cidade: z.string().trim().max(80).optional(),
  palpiteCasa: z.number().int().min(0).max(20),
  palpiteFora: z.number().int().min(0).max(20),
  aprovarDireto: z.boolean().default(true),
});

export const addParticipanteManual = createServerFn({ method: "POST" })
  .validator((data: unknown) => addManualInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true; id: string }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const row = await fetchBolaoBySlug(data.slug);
    if (!row) throw new Error("Bolão não encontrado");
    if (row.usuario_id !== user.id) throw new Error("Sem permissão para administrar este bolão");

    const participantes = row.participantes ?? [];
    if (row.modo_exclusivo) {
      const taken = participantes.some(
        (p) => p.palpite_casa === data.palpiteCasa && p.palpite_fora === data.palpiteFora,
      );
      if (taken) throw new Error("Este placar já foi escolhido.");
    }

    const supabase = getSupabaseAsUser(data.accessToken);
    const { data: inserted, error } = await supabase
      .from("participantes")
      .insert({
        bolao_id: row.id,
        nome: data.nome,
        cidade: data.cidade?.trim() || null,
        palpite_casa: data.palpiteCasa,
        palpite_fora: data.palpiteFora,
        status: data.aprovarDireto ? "aprovado" : "pendente",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      throw new Error(`Erro ao adicionar participante: ${error?.message ?? "desconhecido"}`);
    }

    return { ok: true, id: inserted.id };
  });

export const createBolao = createServerFn({ method: "POST" })
  .validator((data: unknown) => createBolaoInput.parse(data))
  .handler(async ({ data }): Promise<CreateBolaoResult> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const { data: partida, error: partidaError } = await supabase
      .from("partidas")
      .select("id, time_casa, time_fora, campeonato_id")
      .eq("id", data.partidaId)
      .maybeSingle();

    if (partidaError || !partida) {
      throw new Error("Partida não encontrada");
    }

    const slug = await ensureUniqueSlug(partida.time_casa, partida.time_fora);

    const bolao = await insertBolaoRow(
      supabase,
      user.id,
      data.partidaId,
      slug,
      data.stake,
      data.modoExclusivo,
      data.taxaPercent,
      partida.campeonato_id,
    );

    return {
      id: bolao.id,
      slug: bolao.slug,
      shareUrl: buildShareUrl(bolao.slug),
    };
  });

export { buildShareUrl as buildBolaoShareUrl };
export { buildBolaoJoinPath, buildBolaoJoinUrl, buildBolaoLivePath, buildBolaoLiveUrl, buildBolaoAdminPath, buildBolaoAdminUrl, buildBolaoGuestJoinSearch, buildBolaoGuestFinalSearch, buildBolaoGuestFinalUrl } from "../bolao/share-url";

const updateBolaoInput = z.object({
  accessToken: z.string().min(1),
  slug: z.string().trim().min(1),
  stake: z.number().min(1).max(10000).optional(),
  modoExclusivo: z.boolean().optional(),
  taxaPercent: z.number().min(0).max(100).optional(),
});

export const updateBolao = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateBolaoInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const row = await fetchBolaoBySlug(data.slug);
    if (!row) throw new Error("Bolão não encontrado");
    if (row.usuario_id !== user.id) throw new Error("Sem permissão para editar este bolão");

    const patch: Record<string, unknown> = {};
    if (data.stake !== undefined) patch.stake = data.stake;
    if (data.modoExclusivo !== undefined) patch.modo_exclusivo = data.modoExclusivo;
    if (data.taxaPercent !== undefined) patch.taxa_percent = data.taxaPercent;

    if (Object.keys(patch).length === 0) {
      throw new Error("Nenhuma alteração informada.");
    }

    const supabase = getSupabaseAsUser(data.accessToken);
    const { error } = await supabase.from("boloes").update(patch).eq("id", row.id).eq("usuario_id", user.id);

    if (error) {
      const hint =
        error.message.includes("taxa_percent") || error.message.includes("cobra_taxa")
          ? " Execute docs/supabase/migration-bolao-taxa-percent.sql no Supabase."
          : "";
      throw new Error(`Erro ao atualizar bolão: ${error.message}${hint}`);
    }

    return { ok: true };
  });

const startBolaoInput = z.object({
  accessToken: z.string().min(1),
  slug: z.string().trim().min(1),
});

const updatePlacarInput = z.object({
  accessToken: z.string().min(1),
  slug: z.string().trim().min(1),
  placarCasa: z.number().int().min(0).max(20),
  placarFora: z.number().int().min(0).max(20),
});

const encerrarBolaoInput = z.object({
  accessToken: z.string().min(1),
  slug: z.string().trim().min(1),
  placarCasa: z.number().int().min(0).max(20),
  placarFora: z.number().int().min(0).max(20),
});

const reabrirBolaoInput = z.object({
  accessToken: z.string().min(1),
  slug: z.string().trim().min(1),
});

export const startBolaoAoVivo = createServerFn({ method: "POST" })
  .validator((data: unknown) => startBolaoInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const row = await fetchBolaoBySlug(data.slug);
    if (!row) throw new Error("Bolão não encontrado");
    if (row.usuario_id !== user.id) throw new Error("Sem permissão para iniciar este bolão");

    const supabase = getSupabaseAsUser(data.accessToken);

    const { error: bolaoError } = await supabase
      .from("boloes")
      .update({ status: "ao_vivo" })
      .eq("id", row.id)
      .eq("usuario_id", user.id);

    if (bolaoError) {
      throw new Error(`Erro ao iniciar bolão: ${bolaoError.message}`);
    }

    if (row.partida_id) {
      const { error: partidaError } = await supabase
        .from("partidas")
        .update({ status: "ao_vivo" })
        .eq("id", row.partida_id);

      if (partidaError) {
        throw new Error(`Erro ao iniciar partida: ${partidaError.message}`);
      }
    }

    return { ok: true };
  });

export const updateBolaoPlacar = createServerFn({ method: "POST" })
  .validator((data: unknown) => updatePlacarInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const row = await fetchBolaoBySlug(data.slug);
    if (!row) throw new Error("Bolão não encontrado");
    if (row.usuario_id !== user.id) throw new Error("Sem permissão para atualizar este bolão");
    if (!row.partida_id) throw new Error("Bolão sem partida vinculada");

    const supabase = getSupabaseAsUser(data.accessToken);
    const { error: rpcError } = await supabase.rpc("update_bolao_placar_dono", {
      p_bolao_slug: data.slug,
      p_placar_casa: data.placarCasa,
      p_placar_fora: data.placarFora,
    });

    const rpcMissing =
      rpcError?.code === "PGRST202" ||
      rpcError?.code === "42883" ||
      rpcError?.message?.toLowerCase().includes("update_bolao_placar_dono");

    if (!rpcError) {
      return { ok: true };
    }

    if (!rpcMissing) {
      throw new Error(`Erro ao salvar placar: ${rpcError.message}`);
    }

    const admin = getSupabaseAdmin();
    const { data: updated, error } = await admin
      .from("partidas")
      .update({
        placar_casa: data.placarCasa,
        placar_fora: data.placarFora,
        status: "ao_vivo",
      })
      .eq("id", row.partida_id)
      .select("id")
      .maybeSingle();

    if (error) {
      const hint = error.code === "42501" ? " Execute docs/supabase/fix-bolao-placar.sql no Supabase." : "";
      throw new Error(`Erro ao salvar placar: ${error.message}${hint}`);
    }
    if (!updated) {
      throw new Error("O Supabase bloqueou salvar placar. Execute docs/supabase/fix-bolao-placar.sql no SQL Editor.");
    }

    const { error: bolaoError } = await admin
      .from("boloes")
      .update({ status: "ao_vivo" })
      .eq("id", row.id);

    if (bolaoError) {
      throw new Error(`Erro ao iniciar bolão: ${bolaoError.message}`);
    }

    return { ok: true };
  });

export const encerrarBolao = createServerFn({ method: "POST" })
  .validator((data: unknown) => encerrarBolaoInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const row = await fetchBolaoBySlug(data.slug);
    if (!row) throw new Error("Bolão não encontrado");
    if (row.usuario_id !== user.id) throw new Error("Sem permissão para encerrar este bolão");
    if (!row.partida_id) throw new Error("Bolão sem partida vinculada");

    try {
      await closeBolaoAndPartida(row, data.placarCasa, data.placarFora);
      return { ok: true };
    } catch (adminErr) {
      const closedAsUser = await closeBolaoAsUser(
        data.accessToken,
        row,
        data.placarCasa,
        data.placarFora,
      );
      if (closedAsUser) {
        return { ok: true };
      }
      throw adminErr instanceof Error
        ? adminErr
        : new Error("Não foi possível encerrar o bolão. Tente entrar de novo.");
    }
  });

export const reabrirBolaoAoVivo = createServerFn({ method: "POST" })
  .validator((data: unknown) => reabrirBolaoInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const row = await fetchBolaoBySlug(data.slug);
    if (!row) throw new Error("Bolão não encontrado");
    if (row.usuario_id !== user.id) throw new Error("Sem permissão para reabrir este bolão");
    if (!row.partida_id) throw new Error("Bolão sem partida vinculada");

    try {
      await reopenBolaoAndPartida(row);
      return { ok: true };
    } catch (adminErr) {
      const reopenedAsUser = await reopenBolaoAsUser(data.accessToken, row);
      if (reopenedAsUser) {
        return { ok: true };
      }
      throw adminErr instanceof Error
        ? adminErr
        : new Error("Não foi possível reabrir o bolão. Tente entrar de novo.");
    }
  });

const deleteBolaoInput = z.object({
  accessToken: z.string().min(1),
  slug: z.string().trim().min(1),
});

export const deleteBolao = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteBolaoInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const row = await fetchBolaoBySlug(data.slug);
    if (!row) throw new Error("Bolão não encontrado");
    if (row.usuario_id !== user.id) throw new Error("Sem permissão para excluir este bolão");

    const supabase = getSupabaseAsUser(data.accessToken);
    const { error } = await supabase.from("boloes").delete().eq("id", row.id).eq("usuario_id", user.id);

    if (error) {
      const hint = error.code === "42501" ? " Falta policy de DELETE — rode migration-bolao-taxa.sql." : "";
      throw new Error(`Erro ao excluir bolão: ${error.message}${hint}`);
    }

    return { ok: true };
  });

export const listMyBoloes = createServerFn({ method: "POST" })
  .validator((data: unknown) => authInput.parse(data))
  .handler(async ({ data }): Promise<DbBolaoWithPartida[]> => {
    const user = await getUserFromAccessToken(data.accessToken);
    const supabase = getSupabaseAsUser(data.accessToken);

    const { data: rows, error } = await supabase
      .from("boloes")
      .select(`
        id,
        slug,
        partida_id,
        usuario_id,
        stake,
        modo_exclusivo,
        status,
        created_at,
        partidas (
          id,
          campeonato_id,
          time_casa,
          time_fora,
          placar_casa,
          placar_fora,
          status,
          data_partida,
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
        ),
        participantes ( id, nome, palpite_casa, palpite_fora )
      `)
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Erro ao carregar bolões: ${error.message}`);
    }

    const criados = (rows ?? []).map((row) => {
      const participantes = Array.isArray(row.participantes) ? row.participantes : [];
      const partida = row.partidas;
      const placar: [number, number] = partida
        ? [partida.placar_casa ?? 0, partida.placar_fora ?? 0]
        : [0, 0];
      const { participantes: _ignored, ...rest } = row;
      return normalizeBolaoWithPartida({
        ...rest,
        participant_count: participantes.length,
        ranking_lider: rankingLiderFromParticipantes(participantes, placar, {
          partidaStatus: partida?.status,
          modoExclusivo: row.modo_exclusivo,
        }),
        papel: "criador" as const,
      } as DbBolaoWithPartida);
    });

    const { data: perfil } = await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle();
    const nomePerfil = perfil?.nome?.trim();

    if (!nomePerfil) return normalizeBolaoListForDisplay(criados);

    const { data: participandoRows, error: participandoError } = await supabase
      .from("participantes")
      .select(`
        bolao_id,
        boloes (
          id,
          slug,
          partida_id,
          usuario_id,
          stake,
          modo_exclusivo,
          status,
          created_at,
          partidas (
            id,
            campeonato_id,
            time_casa,
            time_fora,
            placar_casa,
            placar_fora,
            status,
            data_partida,
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
          ),
          participantes ( id, nome, palpite_casa, palpite_fora )
        )
      `)
      .eq("nome", nomePerfil)
      .order("created_at", { ascending: false });

    if (participandoError) return normalizeBolaoListForDisplay(criados);

    const idsCriados = new Set(criados.map((b) => b.id));
    const participando: DbBolaoWithPartida[] = [];

    for (const row of participandoRows ?? []) {
      const bolao = Array.isArray(row.boloes) ? row.boloes[0] : row.boloes;
      if (!bolao || idsCriados.has(bolao.id) || bolao.usuario_id === user.id) continue;

      const participantes = Array.isArray(bolao.participantes) ? bolao.participantes : [];
      const partida = Array.isArray(bolao.partidas) ? bolao.partidas[0] : bolao.partidas;
      const placar: [number, number] = partida
        ? [partida.placar_casa ?? 0, partida.placar_fora ?? 0]
        : [0, 0];

      participando.push(
        normalizeBolaoWithPartida({
          id: bolao.id,
          slug: bolao.slug,
          partida_id: bolao.partida_id,
          usuario_id: bolao.usuario_id,
          stake: bolao.stake,
          modo_exclusivo: bolao.modo_exclusivo,
          status: bolao.status,
          created_at: bolao.created_at,
          partidas: (partida ?? null) as DbBolaoWithPartida["partidas"],
          participant_count: participantes.length,
          ranking_lider: rankingLiderFromParticipantes(participantes, placar, {
            partidaStatus: partida?.status,
            modoExclusivo: bolao.modo_exclusivo,
          }),
          papel: "participante",
        }),
      );
    }

    return normalizeBolaoListForDisplay([...criados, ...participando]);
  });

/** Só normaliza status para exibição — sem gravar no banco (evita travar Meus bolões). */
function normalizeBolaoListForDisplay(rows: DbBolaoWithPartida[]): DbBolaoWithPartida[] {
  return rows.map((row) => normalizeBolaoWithPartida(row));
}
