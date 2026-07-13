import { createServerFn } from "@tanstack/react-start";

import { getSupabaseAdmin, getSupabaseWithToken } from "@/lib/api/supabase.server";
import { assertSupabaseAdminConfigured } from "@/lib/config.server";
import {
  countRegisteredUsers,
  getSignupSettings,
  getSuperAdminSettings,
  isSuperAdminEmail,
  isSignupAllowed,
  saveSignupSettings,
  type SignupSettings,
} from "@/lib/auth/app-settings.server";

export type AdminUserRow = {
  id: string;
  email: string;
  nome: string;
  plan: string;
  createdAt: string;
  provider: string;
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

async function buildAdminUserRows(): Promise<AdminUserRow[]> {
  const [authUsers, profilesResult] = await Promise.all([
    listAuthUsers(),
    (async () => {
      try {
        const admin = getSupabaseAdmin();
        return admin.from("profiles").select("id, nome, plan, created_at");
      } catch {
        return { data: [], error: null };
      }
    })(),
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

      return {
        id: user.id,
        email: user.email ?? "",
        nome: profile?.nome ?? user.user_metadata?.nome ?? user.email?.split("@")[0] ?? "",
        plan: profile?.plan ?? "free",
        createdAt: profile?.created_at ?? user.created_at ?? "",
        provider: String(provider),
      };
    })
    .filter((row) => row.email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const fetchAdminDashboard = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken?: string }) => ({
    accessToken: typeof data.accessToken === "string" ? data.accessToken : "",
  }))
  .handler(async ({ data }) => {
    await assertSuperAdmin(data.accessToken);

    const [signup, totalUsers, users, gate] = await Promise.all([
      getSignupSettings(),
      countRegisteredUsers(),
      buildAdminUserRows(),
      isSignupAllowed(),
    ]);

    return {
      signup,
      totalUsers,
      signupOpen: gate.allowed && signup.open,
      users,
    };
  });

export const setSignupOpen = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken?: string; open?: boolean }) => ({
    accessToken: typeof data.accessToken === "string" ? data.accessToken : "",
    open: data.open === true,
  }))
  .handler(async ({ data }) => {
    await assertSuperAdmin(data.accessToken);
    const current = await getSignupSettings();
    const next: SignupSettings = { ...current, open: data.open };
    await saveSignupSettings(next);
    const gate = await isSignupAllowed();
    return {
      signup: next,
      signupOpen: gate.allowed,
      message: gate.allowed ? "" : gate.message,
    };
  });

export const assertSignupAllowedForNewUser = createServerFn({ method: "POST" }).handler(async () => {
  const gate = await isSignupAllowed();
  if (!gate.allowed) {
    throw new Error(gate.message);
  }
  return { ok: true as const };
});
