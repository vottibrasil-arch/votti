import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import {
  assertSupabaseAdminConfigured,
  assertSupabaseConfigured,
  getServerConfig,
} from "@/lib/config.server";

let adminClient: SupabaseClient<Database> | null = null;
let anonClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  assertSupabaseAdminConfigured();
  if (!adminClient) {
    const { supabase } = getServerConfig();
    adminClient = createClient<Database>(supabase.url!, supabase.serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export function getSupabaseAnonServer(): SupabaseClient<Database> {
  assertSupabaseConfigured();
  if (!anonClient) {
    const { supabase } = getServerConfig();
    anonClient = createClient<Database>(supabase.url!, supabase.anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}

export function getSupabaseWithToken(accessToken: string): SupabaseClient<Database> {
  assertSupabaseConfigured();
  const { supabase } = getServerConfig();
  return createClient<Database>(supabase.url!, supabase.anonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
