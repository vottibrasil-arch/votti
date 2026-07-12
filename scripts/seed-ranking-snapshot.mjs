/**
 * Gera snapshot inicial/atualizado para um slug (uso local/admin).
 * node scripts/seed-ranking-snapshot.mjs 9PY5FD
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const slug = process.argv[2]?.trim();
if (!slug) {
  console.error("Uso: node scripts/seed-ranking-snapshot.mjs SLUG");
  process.exit(1);
}

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* .env opcional */
  }
}

loadEnv();

const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: rows, error } = await supabase.from("poll_ranking_feed").select("*").eq("slug", slug);
if (error) {
  console.error("Erro poll_ranking_feed:", error.message);
  process.exit(1);
}
if (!rows?.length) {
  console.error("Enquete não encontrada:", slug);
  process.exit(1);
}

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
const payload = {
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

const { error: upsertError } = await supabase.from("ranking_snapshots").upsert(
  { slug, payload, updated_at: new Date().toISOString() },
  { onConflict: "slug" },
);

if (upsertError) {
  console.error("Erro UPSERT:", upsertError.message);
  process.exit(1);
}

console.log("Snapshot OK:", slug, "votos:", registeredVotes);
