import { createServerFn } from "@tanstack/react-start";
import { getSupabaseEnvStatus } from "../supabase-env";
import { getSupabaseServer } from "./supabase.server";

export async function runSupabaseConnectionTest() {
  const env = getSupabaseEnvStatus();

  console.log("[Palpite Gol] Teste Supabase — variáveis:", {
    ok: env.ok,
    url: env.url || "(vazio)",
    anonKey: env.anonKeySet ? env.anonKeyPrefix : "(vazio)",
    serviceRole: env.serviceRoleKeySet ? "definida" : "não definida (ok para leituras)",
    mode: env.mode,
    missing: env.missing,
  });

  if (!env.ok) {
    const message = `Variáveis ausentes: ${env.missing.join(", ")}`;
    console.error("[Palpite Gol] Teste Supabase — FALHOU:", message);
    return { ok: false as const, env, error: message, campeonatos: [] };
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("campeonatos")
    .select("id, nome, ativo")
    .order("id", { ascending: true });

  if (error) {
    const message = `${error.message}${error.code ? ` (código: ${error.code})` : ""}${error.details ? ` — ${error.details}` : ""}`;
    console.error("[Palpite Gol] Teste Supabase — erro na query campeonatos:", message);
    return { ok: false as const, env, error: message, campeonatos: [] };
  }

  console.log("[Palpite Gol] Teste Supabase — campeonatos:", data);

  if (!data?.length) {
    const hint =
      "Conexão OK, mas 0 registros retornados. Se há dados no painel Supabase, habilite as políticas RLS em docs/supabase/schema.sql (campeonatos_read_all, partidas_read_all).";
    console.warn("[Palpite Gol] Teste Supabase — AVISO:", hint);
    return { ok: true as const, env, error: null, warning: hint, campeonatos: [] };
  }

  return { ok: true as const, env, error: null, warning: null, campeonatos: data ?? [] };
}

export const testSupabaseConnection = createServerFn({ method: "GET" }).handler(async () => {
  return runSupabaseConnectionTest();
});
