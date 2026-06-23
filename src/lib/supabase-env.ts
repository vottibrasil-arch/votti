type SupabaseEnvStatus = {
  ok: boolean;
  missing: string[];
  mode: string;
  url: string;
  anonKeySet: boolean;
  anonKeyPrefix: string;
  serviceRoleKeySet: boolean;
};

function readEnv(name: string): string {
  const fromImportMeta =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env[name] as string | undefined)
      : undefined;
  if (typeof fromImportMeta === "string" && fromImportMeta.trim().length > 0) {
    return fromImportMeta.trim();
  }

  const fromProcess =
    typeof process !== "undefined" && process.env
      ? (process.env[name] as string | undefined)
      : undefined;
  return typeof fromProcess === "string" ? fromProcess.trim() : "";
}

function readMode(): string {
  const fromImportMeta =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.MODE as string | undefined)
      : undefined;
  if (typeof fromImportMeta === "string" && fromImportMeta.trim().length > 0) {
    return fromImportMeta.trim();
  }
  const fromProcess =
    typeof process !== "undefined" && process.env
      ? (process.env.NODE_ENV as string | undefined)
      : undefined;
  return fromProcess?.trim() || "development";
}

function readSupabaseUrl() {
  return readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL");
}

function readSupabaseAnonKey() {
  return readEnv("VITE_SUPABASE_ANON_KEY") || readEnv("SUPABASE_ANON_KEY");
}

function readSupabaseServiceRoleKey() {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getSupabaseEnvStatus(): SupabaseEnvStatus {
  const url = readSupabaseUrl();
  const anonKey = readSupabaseAnonKey();
  const serviceRoleKey = readSupabaseServiceRoleKey();

  const missing: string[] = [];
  if (!url) missing.push("VITE_SUPABASE_URL");
  if (!anonKey) missing.push("VITE_SUPABASE_ANON_KEY");

  return {
    ok: missing.length === 0,
    missing,
    mode: readMode(),
    url,
    anonKeySet: Boolean(anonKey),
    anonKeyPrefix: anonKey ? `${anonKey.slice(0, 8)}...` : "",
    serviceRoleKeySet: Boolean(serviceRoleKey),
  };
}

export function getSupabaseUrl() {
  return readSupabaseUrl();
}

export function getSupabaseAnonKey() {
  return readSupabaseAnonKey();
}

export function getSupabaseServiceRoleKey() {
  return readSupabaseServiceRoleKey();
}
