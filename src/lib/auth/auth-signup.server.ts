import { createServerFn } from "@tanstack/react-start";

import { getSupabaseAdmin, getSupabaseWithToken } from "@/lib/api/supabase.server";
import { getServerConfig } from "@/lib/config.server";
import { resolveDisplayName } from "@/lib/auth/ensure-auth-session";
import { getSupabaseEnvMismatch } from "@/lib/supabase-env";
import {
  getSupabaseProjectRef,
  isVottiSupabaseProject,
  VOTTI_SUPABASE_URL,
} from "@/lib/votti/supabase-project";

export type AuthEmailLookupResult = {
  available: boolean;
  adminConfigured: boolean;
  confirmed?: boolean;
  projectRef?: string;
  envMismatch: boolean;
  vottiProject: boolean;
};

export type SupabaseProjectInfo = {
  projectRef?: string;
  adminConfigured: boolean;
  envMismatch: boolean;
  vottiProject: boolean;
  expectedUrl: string;
};

function buildProjectInfo(): SupabaseProjectInfo {
  const envMismatch = getSupabaseEnvMismatch();
  const { supabase } = getServerConfig();
  const projectRef = getSupabaseProjectRef(supabase.url);
  const vottiProject = isVottiSupabaseProject(supabase.url);
  return {
    projectRef,
    adminConfigured: Boolean(supabase.serviceRoleKey),
    envMismatch,
    vottiProject,
    expectedUrl: VOTTI_SUPABASE_URL,
  };
}

/** Projeto Supabase que o servidor está usando (.env). */
export const getSupabaseProjectInfo = createServerFn({ method: "GET" }).handler(
  async (): Promise<SupabaseProjectInfo> => buildProjectInfo(),
);

async function findAuthUserByEmail(email: string) {
  const admin = getSupabaseAdmin();
  const target = email.trim().toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.trim().toLowerCase() === target);
    if (found) return found;

    if (data.users.length < 200) break;
  }

  return null;
}

/** Consulta auth.users via service role — fonte confiável para saber se o e-mail existe. */
export const lookupAuthEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email?: string }) => ({
    email: typeof data.email === "string" ? data.email.trim().toLowerCase() : "",
  }))
  .handler(async ({ data }): Promise<AuthEmailLookupResult> => {
    const info = buildProjectInfo();

    if (!data.email) {
      return {
        available: false,
        adminConfigured: info.adminConfigured,
        projectRef: info.projectRef,
        envMismatch: info.envMismatch,
        vottiProject: info.vottiProject,
      };
    }

    if (!getServerConfig().supabase.serviceRoleKey) {
      return {
        available: true,
        adminConfigured: false,
        projectRef: info.projectRef,
        envMismatch: info.envMismatch,
        vottiProject: info.vottiProject,
      };
    }

    try {
      const user = await findAuthUserByEmail(data.email);
      if (!user) {
        return {
          available: true,
          adminConfigured: true,
          projectRef: info.projectRef,
          envMismatch: info.envMismatch,
          vottiProject: info.vottiProject,
        };
      }

      return {
        available: false,
        adminConfigured: true,
        confirmed: Boolean(user.email_confirmed_at),
        projectRef: info.projectRef,
        envMismatch: info.envMismatch,
        vottiProject: info.vottiProject,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("invalid api key")) {
        console.warn("[auth] lookupAuthEmail: service role inválida — cadastro segue sem pré-checagem");
        return {
          available: true,
          adminConfigured: false,
          projectRef: info.projectRef,
          envMismatch: info.envMismatch,
          vottiProject: info.vottiProject,
        };
      }
      throw err;
    }
  });

/** Garante linha em profiles após login Google/OAuth (trigger pode não ter rodado). */
export const ensureAuthProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { accessToken?: string }) => ({
    accessToken: typeof data.accessToken === "string" ? data.accessToken : "",
  }))
  .handler(async ({ data }) => {
    if (!data.accessToken) return { ok: false as const };

    const userClient = getSupabaseWithToken(data.accessToken);
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return { ok: false as const };

    const user = userData.user;
    const nome = resolveDisplayName(user);

    if (!getServerConfig().supabase.serviceRoleKey) {
      return { ok: true as const, skipped: true as const };
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.from("profiles").upsert(
      { id: user.id, nome },
      { onConflict: "id" },
    );

    if (error) throw error;
    return { ok: true as const };
  });
