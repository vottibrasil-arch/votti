import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserFromAccessToken } from "./auth.server";
import { readPropagandaRodapeVisivel } from "./apoiadores.server";
import { getSupabaseAdmin, getSupabaseAsUser } from "./supabase.server";
import { getServerConfig } from "../config.server";

const authInput = z.object({
  accessToken: z.string().min(1),
});

const adminUserInput = authInput.extend({
  userId: z.string().uuid(),
});

const updateAdminNameInput = adminUserInput.extend({
  nome: z.string().trim().min(2).max(80),
});

const updateAdminPasswordInput = adminUserInput.extend({
  password: z.string().min(6).max(72),
});

const propagandaVisibilityInput = authInput.extend({
  visivel: z.boolean(),
});

type SuperAdminUserRow = {
  id: string;
  email: string | null;
  nome: string | null;
  created_at: string | null;
  boloes_count: number;
  is_super_admin: boolean;
};

type SuperAdminOfficialGameRow = {
  id: number;
  campeonato: string;
  casa: string;
  fora: string;
  status: string;
  data: string | null;
};

type SuperAdminSupporterRow = {
  id: string;
  nome: string;
  cidade: string | null;
  mensagem: string | null;
  status: string | null;
  valor: number | null;
  created_at: string | null;
};

type SuperAdminParticipantRow = {
  id: string;
  nome: string;
  cidade: string | null;
  status: string;
  bolao_slug: string | null;
  created_at: string | null;
};

export type SuperAdminPanelData = {
  stats: {
    usuarios: number;
    campeonatosOficiais: number;
    jogosOficiais: number;
    boloes: number;
    participantes: number;
    apoiadores: number;
  };
  participantesStats: {
    hoje: number;
    mes: number;
    total: number;
  };
  apoiadoresStats: {
    hoje: number;
    mes: number;
    ano: number;
    total: number;
  };
  propagandaRodapeVisivel: boolean;
  jogosOficiais: SuperAdminOfficialGameRow[];
  apoiadores: SuperAdminSupporterRow[];
  participantes: SuperAdminParticipantRow[];
  usuarios: SuperAdminUserRow[];
};

async function userHasSuperAdminFlag(userId: string, accessToken: string) {
  const supabase = getSupabaseAsUser(accessToken);
  const { data, error } = await supabase
    .from("super_admins")
    .select("user_id, ativo")
    .eq("user_id", userId)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    const missingTable =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message.toLowerCase().includes("super_admins");
    if (missingTable) return false;
    throw new Error(`Erro ao verificar Super ADM: ${error.message}`);
  }

  return Boolean(data);
}

async function requireSuperAdmin(accessToken: string) {
  const user = await getUserFromAccessToken(accessToken);
  const isSuperAdmin = await userHasSuperAdminFlag(user.id, accessToken);
  if (!isSuperAdmin) {
    throw new Error("Sem permissão de Super ADM.");
  }
  return user;
}

function assertServiceRoleConfigured() {
  const { supabase } = getServerConfig();
  if (!supabase.serviceRoleKey) {
    throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY para alterar senha, excluir conta ou atualizar usuários pelo Super ADM.");
  }
}

async function countRows(table: string, fallback = 0, filter?: { column: string; value: string }) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter) {
    query = query.eq(filter.column, filter.value);
  }
  const { count, error } = await query;
  if (error) return fallback;
  return count ?? fallback;
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1);
}

async function sumApoiadoresValorSince(since: Date | null) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("apoiadores").select("valor").in("status", ["ativo", "pendente"]);
  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data, error } = await query;
  if (error) return 0;

  return (data ?? []).reduce((sum, row) => sum + Number(row.valor ?? 0), 0);
}

async function getApoiadoresStats() {
  const now = new Date();
  const [hoje, mes, ano, total] = await Promise.all([
    sumApoiadoresValorSince(startOfDay(now)),
    sumApoiadoresValorSince(startOfMonth(now)),
    sumApoiadoresValorSince(startOfYear(now)),
    sumApoiadoresValorSince(null),
  ]);

  return { hoje, mes, ano, total };
}

async function countParticipantesSince(since: Date | null) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("participantes").select("id", { count: "exact", head: true });
  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

async function getParticipantesStats() {
  const now = new Date();
  const [hoje, mes, total] = await Promise.all([
    countParticipantesSince(startOfDay(now)),
    countParticipantesSince(startOfMonth(now)),
    countParticipantesSince(null),
  ]);

  return { hoje, mes, total };
}

async function listParticipantes(limit = 50): Promise<SuperAdminParticipantRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("participantes")
    .select("id, nome, cidade, status, created_at, boloes ( slug )")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];

  return (data ?? []).map((row) => {
    const bolao = row.boloes as { slug: string } | { slug: string }[] | null;
    const slug = Array.isArray(bolao) ? bolao[0]?.slug : bolao?.slug;
    return {
      id: row.id as string,
      nome: row.nome as string,
      cidade: (row.cidade as string | null) ?? null,
      status: row.status as string,
      bolao_slug: slug ?? null,
      created_at: (row.created_at as string | null) ?? null,
    };
  });
}

async function listAllAuthUsers(adminClient: ReturnType<typeof getSupabaseAdmin>) {
  const users: Awaited<ReturnType<typeof adminClient.auth.admin.listUsers>>["data"]["users"] = [];
  let page = 1;

  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data.users.length) break;
    users.push(...data.users);
    if (data.users.length < 1000) break;
    page += 1;
  }

  return users;
}

async function loadBoloesCountByUser(adminClient: ReturnType<typeof getSupabaseAdmin>) {
  const { data: boloes } = await adminClient.from("boloes").select("usuario_id");
  const boloesCountMap = new Map<string, number>();

  for (const bolao of boloes ?? []) {
    const userId = bolao.usuario_id as string | null;
    if (!userId) continue;
    boloesCountMap.set(userId, (boloesCountMap.get(userId) ?? 0) + 1);
  }

  return boloesCountMap;
}

async function loadSuperAdminIds() {
  const adminClient = getSupabaseAdmin();
  const { data, error } = await adminClient.from("super_admins").select("user_id").eq("ativo", true);
  if (error) return new Set<string>();
  return new Set((data ?? []).map((row) => row.user_id as string));
}

function withSuperAdminFlags(
  users: Array<Omit<SuperAdminUserRow, "is_super_admin"> & { is_super_admin?: boolean }>,
  superAdminIds: Set<string>,
): SuperAdminUserRow[] {
  return users.map((user) => ({
    ...user,
    is_super_admin: user.is_super_admin ?? superAdminIds.has(user.id),
  }));
}

async function listSystemUsers(accessToken: string): Promise<{ users: SuperAdminUserRow[]; total: number }> {
  const adminClient = getSupabaseAdmin();
  const userClient = getSupabaseAsUser(accessToken);
  const boloesCountMap = await loadBoloesCountByUser(adminClient);
  const superAdminIds = await loadSuperAdminIds();

  const { data: rpcUsers, error: rpcError } = await userClient.rpc("super_admin_list_users");
  if (!rpcError && rpcUsers?.length) {
    const users = withSuperAdminFlags(
      (rpcUsers as Array<{
        id: string;
        email: string | null;
        nome: string | null;
        created_at: string | null;
        is_super_admin?: boolean;
      }>).map((user) => ({
        id: user.id,
        email: user.email ?? null,
        nome: user.nome ?? null,
        created_at: user.created_at ?? null,
        boloes_count: boloesCountMap.get(user.id) ?? 0,
        is_super_admin: user.is_super_admin,
      })),
      superAdminIds,
    );

    return { users, total: users.length };
  }

  if (getServerConfig().supabase.serviceRoleKey) {
    const authUsers = await listAllAuthUsers(adminClient);
    const ids = authUsers.map((user) => user.id);
    const { data: profiles } = ids.length
      ? await userClient.from("profiles").select("id, nome, email, created_at").in("id", ids)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    const users = withSuperAdminFlags(
      authUsers
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        .map((user) => {
          const profile = profileMap.get(user.id);
          const metaName =
            (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
            (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
            null;

          return {
            id: user.id,
            email: profile?.email ?? user.email ?? null,
            nome: profile?.nome ?? metaName ?? null,
            created_at: profile?.created_at ?? user.created_at ?? null,
            boloes_count: boloesCountMap.get(user.id) ?? 0,
          };
        }),
      superAdminIds,
    );

    return { users, total: users.length };
  }

  const { data: profiles } = await userClient
    .from("profiles")
    .select("id, nome, email, created_at")
    .order("created_at", { ascending: false });

  const users = withSuperAdminFlags(
    (profiles ?? []).map((profile) => ({
      id: profile.id as string,
      email: (profile.email as string | null) ?? null,
      nome: (profile.nome as string | null) ?? null,
      created_at: (profile.created_at as string | null) ?? null,
      boloes_count: boloesCountMap.get(profile.id as string) ?? 0,
    })),
    superAdminIds,
  );

  return { users, total: users.length };
}

export const checkSuperAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => authInput.parse(data))
  .handler(async ({ data }): Promise<{ isSuperAdmin: boolean }> => {
    const user = await getUserFromAccessToken(data.accessToken);
    return { isSuperAdmin: await userHasSuperAdminFlag(user.id, data.accessToken) };
  });

export const getSuperAdminPanelData = createServerFn({ method: "POST" })
  .validator((data: unknown) => authInput.parse(data))
  .handler(async ({ data }): Promise<SuperAdminPanelData> => {
    await requireSuperAdmin(data.accessToken);
    const supabase = getSupabaseAdmin();

    const [systemUsers, campeonatosCount, jogosCount, boloesCount, participantesCount, apoiadoresCount, apoiadoresStats, participantesStats, propagandaRodapeVisivel, participantes] =
      await Promise.all([
        listSystemUsers(data.accessToken),
        countRows("campeonatos", 0, { column: "tipo", value: "oficial" }),
        countRows("partidas"),
        countRows("boloes"),
        countRows("participantes"),
        countRows("apoiadores"),
        getApoiadoresStats(),
        getParticipantesStats(),
        readPropagandaRodapeVisivel(),
        listParticipantes(),
      ]);

    const { data: jogosData } = await supabase
      .from("partidas")
      .select("id, time_casa, time_fora, status, data_partida, campeonatos!inner(nome, tipo)")
      .eq("campeonatos.tipo", "oficial")
      .order("data_partida", { ascending: true, nullsFirst: false })
      .limit(20);

    const { data: apoiadoresData } = await supabase
      .from("apoiadores")
      .select("id, nome, cidade, mensagem, status, valor, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const jogosOficiais = (jogosData ?? []).map((row) => {
      const jogo = row as {
        id: number;
        time_casa: string;
        time_fora: string;
        status: string;
        data_partida: string | null;
        campeonatos: { nome: string } | { nome: string }[] | null;
      };
      const campeonato = Array.isArray(jogo.campeonatos) ? jogo.campeonatos[0]?.nome : jogo.campeonatos?.nome;
      return {
        id: jogo.id,
        campeonato: campeonato ?? "Campeonato oficial",
        casa: jogo.time_casa,
        fora: jogo.time_fora,
        status: jogo.status,
        data: jogo.data_partida,
      };
    });

    return {
      stats: {
        usuarios: systemUsers.total,
        campeonatosOficiais: campeonatosCount,
        jogosOficiais: jogosCount,
        boloes: boloesCount,
        participantes: participantesCount,
        apoiadores: apoiadoresCount,
      },
      apoiadoresStats,
      participantesStats,
      propagandaRodapeVisivel,
      jogosOficiais,
      apoiadores: (apoiadoresData ?? []) as SuperAdminSupporterRow[],
      participantes,
      usuarios: systemUsers.users,
    };
  });

export const setPropagandaRodapeVisivel = createServerFn({ method: "POST" })
  .validator((data: unknown) => propagandaVisibilityInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true; visivel: boolean }> => {
    await requireSuperAdmin(data.accessToken);
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: "propaganda_rodape_visivel",
          value: Boolean(data.visivel),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );

    if (error) {
      throw new Error(`Erro ao atualizar visibilidade da propaganda: ${error.message}`);
    }

    return { ok: true, visivel: data.visivel };
  });

export const updateBolaoAdminName = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateAdminNameInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await requireSuperAdmin(data.accessToken);
    const supabase = getSupabaseAdmin();

    const { data: authData } = await supabase.auth.admin.getUserById(data.userId);
    const email = authData.user?.email ?? null;

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: data.userId, nome: data.nome, ...(email ? { email } : {}) }, { onConflict: "id" });

    if (profileError) {
      throw new Error(`Erro ao atualizar nome: ${profileError.message}`);
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(data.userId, {
      user_metadata: { full_name: data.nome, name: data.nome },
    });

    if (authError && !authError.message.toLowerCase().includes("not allowed")) {
      throw new Error(`Nome salvo no perfil, mas não no Auth: ${authError.message}`);
    }

    return { ok: true };
  });

export const updateBolaoAdminPassword = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateAdminPasswordInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await requireSuperAdmin(data.accessToken);
    assertServiceRoleConfigured();

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });

    if (error) {
      throw new Error(`Erro ao alterar senha: ${error.message}`);
    }

    return { ok: true };
  });

export const promoteBolaoAdminToSuperAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminUserInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await requireSuperAdmin(data.accessToken);
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("super_admins")
      .upsert({ user_id: data.userId, ativo: true }, { onConflict: "user_id" });

    if (error) {
      throw new Error(`Erro ao transformar em Super ADM: ${error.message}`);
    }

    return { ok: true };
  });

export const deleteBolaoAdminAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => adminUserInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const currentUser = await requireSuperAdmin(data.accessToken);
    if (currentUser.id === data.userId) {
      throw new Error("Você não pode excluir a própria conta pelo painel.");
    }
    assertServiceRoleConfigured();

    const supabase = getSupabaseAdmin();
    const firstDelete = await supabase.auth.admin.deleteUser(data.userId);
    if (!firstDelete.error) {
      return { ok: true };
    }

    await supabase.from("super_admins").delete().eq("user_id", data.userId);
    await supabase.from("boloes").update({ usuario_id: null }).eq("usuario_id", data.userId);
    await supabase.from("campeonatos").update({ owner_id: null }).eq("owner_id", data.userId);

    const secondDelete = await supabase.auth.admin.deleteUser(data.userId);
    if (secondDelete.error) {
      throw new Error(`Erro ao excluir conta: ${secondDelete.error.message}`);
    }

    return { ok: true };
  });
