import { createServerFn } from "@tanstack/react-start";

import { getSupabaseAdmin } from "@/lib/api/supabase.server";
import { assertSupabaseAdminConfigured } from "@/lib/config.server";

export const DEFAULT_SUPER_ADMIN_EMAILS = ["vottibrasil@gmail.com"];

export type SignupSettings = {
  open: boolean;
  maxUsers: number | null;
  message: string;
};

export type SuperAdminSettings = {
  emails: string[];
};

const DEFAULT_SIGNUP: SignupSettings = {
  open: true,
  maxUsers: null,
  message: "Cadastro temporariamente fechado. Tente novamente mais tarde.",
};

function normalizeSignupSettings(value: unknown): SignupSettings {
  if (!value || typeof value !== "object") return DEFAULT_SIGNUP;
  const raw = value as Record<string, unknown>;
  return {
    open: raw.open !== false,
    maxUsers: typeof raw.max_users === "number" && raw.max_users > 0 ? raw.max_users : null,
    message:
      typeof raw.message === "string" && raw.message.trim()
        ? raw.message.trim()
        : DEFAULT_SIGNUP.message,
  };
}

function normalizeSuperAdminSettings(value: unknown): SuperAdminSettings {
  if (!value || typeof value !== "object") {
    return { emails: [...DEFAULT_SUPER_ADMIN_EMAILS] };
  }
  const raw = value as Record<string, unknown>;
  const emails = Array.isArray(raw.emails)
    ? raw.emails
        .filter((item): item is string => typeof item === "string" && item.includes("@"))
        .map((email) => email.trim().toLowerCase())
    : [];
  return {
    emails: emails.length > 0 ? emails : [...DEFAULT_SUPER_ADMIN_EMAILS],
  };
}

async function readSetting(key: string): Promise<unknown | null> {
  try {
    assertSupabaseAdminConfigured();
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.warn("[app-settings] read failed", key, error.message);
      return null;
    }
    return data?.value ?? null;
  } catch (err) {
    console.warn("[app-settings] read skipped", key, err);
    return null;
  }
}

async function writeSetting(key: string, value: Record<string, unknown>): Promise<void> {
  assertSupabaseAdminConfigured();
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("app_settings").upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw error;
}

export async function getSignupSettings(): Promise<SignupSettings> {
  return normalizeSignupSettings(await readSetting("signup"));
}

export async function getSuperAdminSettings(): Promise<SuperAdminSettings> {
  return normalizeSuperAdminSettings(await readSetting("super_admin"));
}

export async function countRegisteredUsers(): Promise<number> {
  try {
    assertSupabaseAdminConfigured();
    const admin = getSupabaseAdmin();
    const { count, error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function isSignupAllowed(): Promise<{ allowed: boolean; message: string }> {
  const [signup, totalUsers] = await Promise.all([getSignupSettings(), countRegisteredUsers()]);
  if (!signup.open) {
    return { allowed: false, message: signup.message };
  }
  if (signup.maxUsers != null && totalUsers >= signup.maxUsers) {
    return {
      allowed: false,
      message: "Limite de cadastros atingido. Tente novamente mais tarde.",
    };
  }
  return { allowed: true, message: "" };
}

export function isSuperAdminEmail(email: string, settings?: SuperAdminSettings): boolean {
  const normalized = email.trim().toLowerCase();
  const emails = settings?.emails ?? DEFAULT_SUPER_ADMIN_EMAILS;
  return emails.includes(normalized);
}

/** Status público do cadastro (para /cadastro). */
export const fetchPublicSignupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const [signup, totalUsers, gate] = await Promise.all([
    getSignupSettings(),
    countRegisteredUsers(),
    isSignupAllowed(),
  ]);
  return {
    open: gate.allowed,
    message: gate.allowed ? "" : gate.message,
    totalUsers,
    maxUsers: signup.maxUsers,
  };
});

export async function saveSignupSettings(settings: SignupSettings): Promise<SignupSettings> {
  await writeSetting("signup", {
    open: settings.open,
    max_users: settings.maxUsers,
    message: settings.message,
  });
  return settings;
}
