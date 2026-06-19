import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseEnvStatus, getSupabaseUrl } from "@/lib/supabase-env";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser() {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowser só pode ser usado no cliente");
  }

  const status = getSupabaseEnvStatus();
  if (!status.ok) {
    throw new Error(`Configure ${status.missing.join(" e ")} no arquivo .env`);
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return browserClient;
}

export function isSupabaseBrowserConfigured() {
  return getSupabaseEnvStatus().ok;
}
