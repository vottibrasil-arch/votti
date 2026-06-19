import process from "node:process";
import { getSupabaseAnonKey, getSupabaseEnvStatus, getSupabaseServiceRoleKey, getSupabaseUrl } from "./supabase-env";

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
    platformFeePercent: Number(process.env.PLATFORM_FEE_PERCENT ?? "10"),

    supabase: {
      url: getSupabaseUrl(),
      anonKey: getSupabaseAnonKey(),
      serviceRoleKey: getSupabaseServiceRoleKey(),
    },

    footballApi: {
      baseUrl: process.env.FOOTBALL_API_BASE ?? "https://v3.football.api-sports.io",
      apiKey: process.env.FOOTBALL_API_KEY ?? "",
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

export function assertFootballApiConfigured() {
  const { footballApi } = getServerConfig();
  if (!footballApi.apiKey) {
    throw new Error("API de jogos não configurada. Veja docs/api-jogos/README.md");
  }
}
