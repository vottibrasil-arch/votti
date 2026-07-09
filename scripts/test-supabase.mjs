#!/usr/bin/env node
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const VOTTI_URL = "https://ppvhlocqetyrsqidijms.supabase.co";
const VOTTI_PROJECT_REF = "ppvhlocqetyrsqidijms";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function normalizeUrl(raw) {
  return raw?.trim()?.replace(/\/rest\/v1\/?$/i, "")?.replace(/\/$/, "");
}

loadEnvFile();

const rawUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
const rawKey =
  process.env.VITE_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

const url = normalizeUrl(rawUrl) || VOTTI_URL;
const anonKey = rawKey?.trim();

if (!anonKey || anonKey.includes("sua_publishable_key")) {
  console.error("❌ Defina VITE_SUPABASE_ANON_KEY no .env (copie de docs/env.example).");
  process.exit(1);
}

if (!url.includes(VOTTI_PROJECT_REF)) {
  console.error(`❌ URL Supabase deve ser do projeto VOTTI (${VOTTI_PROJECT_REF}).`);
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const { error: authError } = await supabase.auth.getSession();
if (authError?.message?.toLowerCase().includes("invalid api key")) {
  console.error("❌ Invalid API key — publishable key não bate com o projeto.");
  process.exit(1);
}

const { error: pollsError } = await supabase.from("polls").select("id").limit(1);

if (pollsError) {
  console.error("❌ Erro ao conectar:", pollsError.message);
  console.error("   Execute docs/supabase/SETUP-COMPLETO.sql no SQL Editor do Supabase.");
  process.exit(1);
}

const { error: resultsError } = await supabase.from("poll_results").select("poll_id").limit(1);
if (resultsError) {
  console.error("❌ Tabela polls OK, mas poll_results falhou:", resultsError.message);
  console.error("   Execute docs/supabase/SETUP-COMPLETO.sql no SQL Editor.");
  process.exit(1);
}

const { error: rpcError } = await supabase.rpc("generate_poll_slug");
if (rpcError) {
  console.error("❌ Função generate_poll_slug não encontrada:", rpcError.message);
  console.error("   Execute docs/supabase/SETUP-COMPLETO.sql no SQL Editor.");
  process.exit(1);
}

console.log(`✅ Supabase OK — projeto ${VOTTI_PROJECT_REF} acessível.`);
console.log(`   URL: ${url}`);
