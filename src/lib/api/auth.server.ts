import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseEnvStatus, getSupabaseUrl } from "../supabase-env";

export async function getUserFromAccessToken(accessToken: string) {
  const env = getSupabaseEnvStatus();
  if (!env.ok) {
    throw new Error(`Supabase não configurado. Faltando: ${env.missing.join(", ")}`);
  }

  const client = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error(`Sessão inválida ou expirada: ${error?.message ?? "usuário não encontrado"}`);
  }

  return data.user;
}
