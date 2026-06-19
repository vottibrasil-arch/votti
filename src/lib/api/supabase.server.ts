import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseConfigured, getServerConfig } from "../config.server";
import { getSupabaseEnvStatus } from "../supabase-env";

function createBaseClient(key: string): SupabaseClient {
  const { supabase } = getServerConfig();
  return createClient(supabase.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Leituras no servidor — usa service role se existir (ignora RLS), senão anon. */
export function getSupabaseForRead() {
  return getSupabaseAdmin();
}

/** Leituras públicas — sempre anon/publishable. */
export function getSupabaseServer() {
  assertSupabaseConfigured();
  const { supabase } = getServerConfig();
  return createBaseClient(supabase.anonKey);
}

/** Operações elevadas — service role se existir, senão anon. */
export function getSupabaseAdmin() {
  assertSupabaseConfigured();
  const { supabase } = getServerConfig();
  const key = supabase.serviceRoleKey || supabase.anonKey;
  return createBaseClient(key);
}

/** Operações como usuário logado (insert com RLS). */
export function getSupabaseAsUser(accessToken: string) {
  assertSupabaseConfigured();
  const { supabase } = getServerConfig();
  const token = accessToken.trim();

  return createClient(supabase.url, supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    accessToken: async () => token,
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabase.anonKey,
      },
    },
  });
}

export function getSupabaseAnon() {
  return getSupabaseServer();
}

export function describeSupabaseConfig() {
  return getSupabaseEnvStatus();
}
