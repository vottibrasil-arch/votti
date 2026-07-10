/**
 * Gera/atualiza snapshot para todas as votações ativas.
 * node scripts/seed-all-ranking-snapshots.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
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

function buildPayload(rows) {
  const head = rows[0];
  const questionsMap = new Map();

  for (const row of rows) {
    if (!questionsMap.has(row.question_id)) {
      questionsMap.set(row.question_id, {
        id: row.question_id,
        text: row.question_text,
        sort: row.question_sort,
        options: new Map(),
      });
    }
    questionsMap.get(row.question_id).options.set(row.option_id, row);
  }

  const questions = [...questionsMap.values()]
    .sort((a, b) => a.sort - b.sort)
    .map((q) => ({
      id: q.id,
      text: q.text,
      options: [...q.options.values()]
        .sort((a, b) => a.option_sort - b.option_sort)
        .map((o) => ({
          id: o.option_id,
          text: o.option_text,
          votes: Number(o.vote_count),
          imageUrl: (o.image_url ?? "").trim(),
        })),
    }));

  const registeredVotes = questions.reduce(
    (s, q) => s + q.options.reduce((t, o) => t + o.votes, 0),
    0,
  );

  const coverUrl = (head.photo_url ?? "").trim() || (head.logo_url ?? "").trim();

  return {
    slug: head.slug,
    pollId: head.poll_id,
    version: Date.now(),
    updatedAt: new Date().toISOString(),
    participantCount: Number(head.participant_count),
    registeredVotes,
    meta: {
      title: head.title,
      description: head.description ?? "",
      primaryColor: head.primary_color ?? "#4F8FD9",
      coverUrl,
      logoUrl: head.logo_url ?? "",
      status: head.status === "closed" ? "closed" : "active",
    },
    questions,
  };
}

loadEnv();

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("❌ Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: polls, error: pollsError } = await supabase
  .from("polls")
  .select("slug, title, status")
  .neq("status", "draft")
  .order("created_at", { ascending: false });

if (pollsError) {
  console.error("❌ Erro ao listar polls:", pollsError.message);
  process.exit(1);
}

if (!polls?.length) {
  console.log("Nenhuma votação publicada.");
  process.exit(0);
}

let ok = 0;
let fail = 0;

for (const poll of polls) {
  const slug = poll.slug?.trim();
  if (!slug) continue;

  const { data: rows, error } = await supabase.from("poll_ranking_feed").select("*").eq("slug", slug);
  if (error) {
    console.error(`❌ ${slug}: ${error.message}`);
    fail += 1;
    continue;
  }
  if (!rows?.length) {
    console.warn(`⚠️  ${slug}: sem dados em poll_ranking_feed`);
    fail += 1;
    continue;
  }

  const payload = buildPayload(rows);
  const { error: upsertError } = await supabase.from("ranking_snapshots").upsert(
    { slug, payload, updated_at: new Date().toISOString() },
    { onConflict: "slug" },
  );

  if (upsertError) {
    console.error(`❌ ${slug}: ${upsertError.message}`);
    fail += 1;
    continue;
  }

  console.log(`✅ ${slug} — ${poll.title} (${payload.registeredVotes} votos)`);
  ok += 1;
}

console.log(`\nConcluído: ${ok} OK, ${fail} falha(s).`);
