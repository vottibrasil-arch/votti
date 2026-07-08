import process from "node:process";

import {
  getSupabaseProjectRef as extractProjectRef,
  resolveVottiSupabaseAnonKey,
  resolveVottiSupabaseUrl,
} from "@/lib/votti/supabase-project";

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getRawSupabaseEnvUrl(): string | undefined {
  return readEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
}

export function getSupabaseUrl(): string {
  return resolveVottiSupabaseUrl(getRawSupabaseEnvUrl());
}

export function getSupabaseAnonKey(): string {
  return resolveVottiSupabaseAnonKey(readEnv("VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"));
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getSupabaseProjectRef(url?: string): string | undefined {
  return extractProjectRef(url ?? getSupabaseUrl());
}

export function getSupabaseEnvMismatch() {
  const rawVite = readEnv("VITE_SUPABASE_URL");
  const rawServer = readEnv("SUPABASE_URL");
  const viteRef = extractProjectRef(rawVite);
  const serverRef = extractProjectRef(rawServer ?? rawVite);
  return Boolean(viteRef && serverRef && viteRef !== serverRef);
}

export function getSupabaseEnvStatus() {
  const missing: string[] = [];
  if (!getSupabaseAnonKey()) missing.push("SUPABASE_ANON_KEY");
  return { ok: missing.length === 0, missing };
}

export function getSupabaseAdminEnvStatus() {
  const base = getSupabaseEnvStatus();
  const missing = [...base.missing];
  if (!getSupabaseServiceRoleKey()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return { ok: missing.length === 0, missing };
}
