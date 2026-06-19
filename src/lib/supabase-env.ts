/** Leitura unificada das variáveis Supabase (servidor + cliente). */

function pick(...values: Array<string | undefined>) {
  return values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim() ?? "";
}

export function getSupabaseUrl() {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) {
    return String(import.meta.env.VITE_SUPABASE_URL).trim();
  }
  return pick(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL);
}

export function getSupabaseAnonKey() {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
    return String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim();
  }
  return pick(
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getSupabaseServiceRoleKey() {
  return pick(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getSupabaseEnvStatus() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL ou VITE_SUPABASE_URL");
  if (!anonKey) missing.push("SUPABASE_ANON_KEY ou VITE_SUPABASE_ANON_KEY");

  return {
    ok: missing.length === 0,
    url,
    anonKeySet: Boolean(anonKey),
    serviceRoleKeySet: Boolean(serviceRoleKey),
    anonKeyPrefix: anonKey ? `${anonKey.slice(0, 12)}...` : "(vazio)",
    missing,
    mode: serviceRoleKey ? "service_role" : anonKey ? "publishable/anon" : "indisponível",
  };
}
