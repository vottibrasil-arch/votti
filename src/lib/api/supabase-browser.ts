import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import {
  resolveVottiSupabaseAnonKey,
  resolveVottiSupabaseUrl,
} from "@/lib/votti/supabase-project";

let browserClient: SupabaseClient<Database> | null = null;
let browserClientUrl: string | null = null;
let browserClientKey: string | null = null;

export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowser() só pode ser usado no browser");
  }

  const url = resolveVottiSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
  const anonKey = resolveVottiSupabaseAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (!browserClient || browserClientUrl !== url || browserClientKey !== anonKey) {
    browserClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    browserClientUrl = url;
    browserClientKey = anonKey;
  }

  return browserClient;
}

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(resolveVottiSupabaseAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY));
}

export function getSupabaseBrowserUrl(): string {
  return resolveVottiSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
}

export function getSupabaseBrowserAnonKey(): string {
  return resolveVottiSupabaseAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY);
}
