/**
 * Teste local de conexão Supabase (rodar: node scripts/test-supabase.mjs)
 * Carrega .env da raiz e consulta public.campeonatos.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function loadDotEnv() {
  if (!existsSync(envPath)) {
    console.error(`[teste] .env não encontrado em: ${envPath}`);
    process.exit(1);
  }
  console.log(`[teste] .env encontrado em: ${envPath}`);

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function pick(...values) {
  return values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim() ?? "";
}

loadDotEnv();

const url = pick(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL);
const anonKey = pick(
  process.env.SUPABASE_ANON_KEY,
  process.env.VITE_SUPABASE_ANON_KEY,
);

const serviceRoleKey = pick(process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SECRET_KEY);

console.log("[teste] variáveis:", {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? "definida" : "ausente",
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? "definida" : "ausente",
  SUPABASE_URL: process.env.SUPABASE_URL ? "definida" : "ausente",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? "definida" : "ausente",
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey ? "definida" : "ausente",
  url: url || "(vazio)",
  anonKey: anonKey ? `${anonKey.slice(0, 12)}...` : "(vazio)",
});

if (!url || !anonKey) {
  console.error("[teste] FALHOU — configure URL e anon key no .env");
  process.exit(1);
}

async function queryCampeonatos(label, key) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error, count } = await client
    .from("campeonatos")
    .select("id, nome, ativo", { count: "exact" })
    .order("id", { ascending: true });

  if (error) {
    console.error(`[teste] ${label} — erro:`, error.message, error.code ?? "");
    return null;
  }

  console.log(`[teste] ${label} — count:`, count, "rows:", data);
  return { data, count };
}

const anonResult = await queryCampeonatos("anon/publishable", anonKey);

if (serviceRoleKey) {
  await queryCampeonatos("service_role", serviceRoleKey);
}

if (!anonResult) {
  process.exit(1);
}

const { data, count } = anonResult;

if (!data?.length) {
  console.warn("[teste] AVISO — anon retornou 0 registros (RLS/GRANT no banco).");
  if (!serviceRoleKey) {
    console.warn("[teste] Opção A: execute docs/supabase/fix-leitura-publica.sql no SQL Editor");
    console.warn("[teste] Opção B: preencha SUPABASE_SERVICE_ROLE_KEY no .env e reinicie o dev server");
  }
  process.exitCode = 2;
}
