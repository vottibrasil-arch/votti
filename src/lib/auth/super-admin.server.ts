import { createServerFn } from "@tanstack/react-start";

import { getSupabaseAdmin, getSupabaseWithToken } from "@/lib/api/supabase.server";
import { assertSupabaseAdminConfigured, getServerConfig } from "@/lib/config.server";
import {
  countRegisteredUsers,
  getSuperAdminSettings,
  isSuperAdminEmail,
} from "@/lib/auth/app-settings.server";
import type { PollStatus } from "@/lib/supabase/database.types";

export type AdminPollRow = {
  id: string;
  slug: string;
  title: string;
  status: PollStatus;
  createdAt: string;
  publicUrl: string;
};

export type AdminUserRow = {
  id: string;
  email: string;
  nome: string;
  plan: string;
  createdAt: string;
  provider: string;
  activePollCount: number;
  totalPollCount: number;
  isSuperAdmin: boolean;
};

async function assertSuperAdmin(accessToken: string) {
  if (!accessToken) {
    throw new Error("Sessão expirada. Entre novamente.");
  }

  const userClient = getSupabaseWithToken(accessToken);
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user?.email) {
    throw new Error("Sessão expirada. Entre novamente.");
  }

  const adminSettings = await getSuperAdminSettings();
  if (!isSuperAdminEmail(data.user.email, adminSettings)) {
    throw new Error("Acesso negado.");
  }

  return data.user;
}

function pollPublicUrl(slug: string) {
  const origin = getServerConfig().appUrl.replace(/\/$/, "");
  return `${origin}/v/${slug}`;
}

async function listAuthUsers() {
  assertSupabaseAdminConfigured();
  const admin = getSupabaseAdmin();
  const users = [];

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
  }

  return users;
}

async function fetchPollCountsByOwner() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("polls")
      .select("owner_id, status");
    if (error) throw error;

    const totals = new Map<string, number>();
    const active = new Map<string, number>();

    for (const row of data ?? []) {
      if (!row.owner_id) continue;
      totals.set(row.owner_id, (totals.get(row.owner_id) ?? 0) + 1);
      if (row.status === "active") {
        active.set(row.owner_id, (active.get(row.owner_id) ?? 0) + 1);
      }
    }

    return { totals, active };
  } catch {
    return { totals: new Map<string, number>(), active: new Map<string, number>() };
  }
}

async function buildAdminUserRows(adminSettings: Awaited<ReturnType<typeof getSuperAdminSettings>>): Promise<AdminUserRow[]> {
  const [authUsers, profilesResult, pollCounts] = await Promise.all([
    listAuthUsers(),
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        return admin.from("profiles").select("id, nome, plan, created_at");
      } catch {
        return { data: [], error: null };
      }
    })(),
    fetchPollCountsByOwner(),
  ]);

  const profiles = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile]),
  );

  return authUsers
    .map((user) => {
      const profile = profiles.get(user.id);
      const provider =
        user.app_metadata?.provider ??
        user.identities?.[0]?.provider ??
        (user.email ? "email" : "unknown");
      const email = user.email ?? "";

      return {
        id: user.id,
        email,
        nome: profile?.nome ?? user.user_metadata?.nome ?? user.email?.split("@")[0] ?? "",
        plan: profile?.plan ?? "free",
        createdAt: profile?.created_at ?? user.created_at ?? "",
        provider: String(provider),
        activePollCount: pollCounts.active.get(user.id) ?? 0,
        totalPollCount: pollCounts.totals.get(user.id) ?? 0,
        isSuperAdmin: isSuperAdminEmail(email, adminSettings),
      };
    })
    .filter((row) => row.email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function listPollsForOwner(ownerId: string): Promise<AdminPollRow[]> {
  assertSupabaseAdminConfigured();
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("polls")
    .select("id, slug, title, status, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((poll) => ({
    id: poll.id,
    slug: poll.slug,
    title: poll.title,
    status: poll.status,
    createdAt: poll.created_at,
    publicUrl: pollPublicUrl(poll.slug),
  }));
}

export const fetchAdminDashboard = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken?: string }) => ({
    accessToken: typeof data.accessToken === "string" ? data.accessToken : "",
  }))
  .handler(async ({ data }) => {
    await assertSuperAdmin(data.accessToken);

    const adminSettings = await getSuperAdminSettings();
    const [totalUsers, users] = await Promise.all([
      countRegisteredUsers(),
      buildAdminUserRows(adminSettings),
    ]);

    const activeLinks = users.reduce((sum, user) => sum + user.activePollCount, 0);

    return {
      totalUsers,
      activeLinks,
      users,
    };
  });

export const fetchAdminUserPolls = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken?: string; userId?: string }) => ({
    accessToken: typeof data.accessToken === "string" ? data.accessToken : "",
    userId: typeof data.userId === "string" ? data.userId : "",
  }))
  .handler(async ({ data }) => {
    await assertSuperAdmin(data.accessToken);
    if (!data.userId) throw new Error("Usuário inválido.");

    const polls = await listPollsForOwner(data.userId);
    return { polls };
  });

export const adminClosePoll = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken?: string; pollId?: string }) => ({
    accessToken: typeof data.accessToken === "string" ? data.accessToken : "",
    pollId: typeof data.pollId === "string" ? data.pollId : "",
  }))
  .handler(async ({ data }) => {
    await assertSuperAdmin(data.accessToken);
    if (!data.pollId) throw new Error("Votação inválida.");

    assertSupabaseAdminConfigured();
    const admin = getSupabaseAdmin();

    const { data: poll, error: fetchError } = await admin
      .from("polls")
      .select("id, status, slug, title")
      .eq("id", data.pollId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!poll) throw new Error("Votação não encontrada.");
    if (poll.status === "closed") {
      return { ok: true as const, alreadyClosed: true };
    }

    const { error: updateError } = await admin
      .from("polls")
      .update({ status: "closed" })
      .eq("id", data.pollId);

    if (updateError) throw updateError;

    return { ok: true as const, alreadyClosed: false };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken?: string; userId?: string }) => ({
    accessToken: typeof data.accessToken === "string" ? data.accessToken : "",
    userId: typeof data.userId === "string" ? data.userId : "",
  }))
  .handler(async ({ data }) => {
    const adminUser = await assertSuperAdmin(data.accessToken);
    if (!data.userId) throw new Error("Usuário inválido.");
    if (data.userId === adminUser.id) {
      throw new Error("Você não pode excluir a própria conta por aqui.");
    }

    assertSupabaseAdminConfigured();
    const admin = getSupabaseAdmin();

    const { data: target, error: targetError } = await admin.auth.admin.getUserById(data.userId);
    if (targetError) throw targetError;
    if (!target.user?.email) throw new Error("Usuário não encontrado.");

    const adminSettings = await getSuperAdminSettings();
    if (isSuperAdminEmail(target.user.email, adminSettings)) {
      throw new Error("Não é possível excluir outro super admin.");
    }

    const { error: pollsError } = await admin.from("polls").delete().eq("owner_id", data.userId);
    if (pollsError) throw pollsError;

    const { error: profileError } = await admin.from("profiles").delete().eq("id", data.userId);
    if (profileError) throw profileError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(data.userId);
    if (deleteError) throw deleteError;

    return { ok: true as const };
  });
