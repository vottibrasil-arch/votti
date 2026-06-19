/**
 * Diagnóstico detalhado — public.campeonatos
 * Rodar: node scripts/diagnose-campeonatos.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function loadDotEnv() {
  if (!existsSync(envPath)) {
    console.error("[diag] .env não encontrado:", envPath);
    process.exit(1);
  }
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
const anonKey = pick(process.env.SUPABASE_ANON_KEY, process.env.VITE_SUPABASE_ANON_KEY);
const serviceRoleKey = pick(process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SECRET_KEY);

console.log("[diag] === CONFIG ===");
console.log({ url, anonKeyPrefix: anonKey ? `${anonKey.slice(0, 16)}...` : null, serviceRole: serviceRoleKey ? "definida" : "vazia" });

if (!url || !anonKey) {
  console.error("[diag] URL ou anon key ausente no .env");
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const QUERIES = [
  {
    name: "1) select('*') — sem filtro (igual pedido)",
    run: () => supabase.from("campeonatos").select("*", { count: "exact" }),
  },
  {
    name: "2) select('*').eq('ativo', true) — filtro do app",
    run: () => supabase.from("campeonatos").select("*", { count: "exact" }).eq("ativo", true),
  },
  {
    name: "3) query exata do listCampeonatos (colunas + ativo + order)",
    run: () =>
      supabase
        .from("campeonatos")
        .select("id, nome, api_league_id, ativo, created_at", { count: "exact" })
        .eq("ativo", true)
        .order("nome", { ascending: true })
        .order("id", { ascending: true }),
  },
  {
    name: "4) sanity — filtros que NÃO existem no schema (devem falhar ou ignorar)",
    run: () =>
      supabase
        .from("campeonatos")
        .select("id, nome", { count: "exact" })
        .eq("status", "ativo")
        .eq("league_id", 1)
        .eq("campeonato_id", 1)
        .eq("temporada", "2026"),
  },
];

console.log("\n[diag] === QUERIES em public.campeonatos (chave anon/publishable) ===\n");

for (const q of QUERIES) {
  console.log(`--- ${q.name} ---`);
  const { data, error, count, status, statusText } = await q.run();
  console.log("data:", data);
  console.log("error:", error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null);
  console.log("count:", count ?? "(n/a)");
  if (status) console.log("http:", status, statusText);
  console.log("");
}

if (serviceRoleKey) {
  console.log("[diag] === MESMA query 1 com service_role (comparação) ===\n");
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error, count } = await admin.from("campeonatos").select("*", { count: "exact" });
  console.log("data:", data);
  console.log("error:", error);
  console.log("count:", count);
}
