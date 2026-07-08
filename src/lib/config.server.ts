import process from "node:process";

import {
  getSupabaseAnonKey,
  getSupabaseEnvStatus,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "./supabase-env";

export function getServerConfig() {
  const vercelHost = process.env.VERCEL_URL?.trim();
  const vercelUrl = vercelHost ? `https://${vercelHost}` : undefined;
  const configured = process.env.VITE_APP_URL?.trim();
  const appUrl =
    configured && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(configured)
      ? configured.replace(/\/$/, "")
      : vercelUrl ?? configured?.replace(/\/$/, "") ?? "http://localhost:8080";

  return {
    nodeEnv: process.env.NODE_ENV,
    appUrl,
    supabase: {
      url: getSupabaseUrl(),
      anonKey: getSupabaseAnonKey(),
      serviceRoleKey: getSupabaseServiceRoleKey(),
    },
  };
}

export function assertSupabaseConfigured() {
  const status = getSupabaseEnvStatus();
  if (!status.ok) {
    throw new Error(
      `Supabase não configurado. Faltando: ${status.missing.join(", ")}. Veja docs/supabase/README.md`,
    );
  }
}

export function assertSupabaseAdminConfigured() {
  const { supabase } = getServerConfig();
  const missing: string[] = [];
  if (!supabase.url) missing.push("SUPABASE_URL");
  if (!supabase.anonKey) missing.push("SUPABASE_ANON_KEY");
  if (!supabase.serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Supabase admin não configurado. Faltando: ${missing.join(", ")}. Veja docs/supabase/README.md`,
    );
  }
}
