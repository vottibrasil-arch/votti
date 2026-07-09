import { getSupabaseAdmin } from "@/lib/api/supabase.server";
import type { PollRankingState } from "@/lib/votti/ranking/types";
import { sumRankingVotes } from "@/lib/votti/ranking/types";

type RankingFeedRow = {
  slug: string;
  poll_id: string;
  title: string;
  description: string | null;
  logo_url: string | null;
  photo_url: string | null;
  primary_color: string | null;
  status: string;
  question_id: string;
  question_text: string;
  question_sort: number;
  option_id: string;
  option_text: string;
  option_sort: number;
  image_url: string | null;
  vote_count: number;
  participant_count: number;
};

/** Monta snapshot a partir de poll_results (via view poll_ranking_feed) — uma consulta. */
export async function buildSnapshotFromPollResults(slug: string): Promise<PollRankingState | null> {
  const supabase = getSupabaseAdmin();
  const key = slug.trim();

  const { data: rows, error } = await supabase
    .from("poll_ranking_feed")
    .select("*")
    .eq("slug", key);

  if (error) throw error;
  if (!rows?.length) return null;

  const feed = rows as RankingFeedRow[];
  const head = feed[0];

  const questionsMap = new Map<
    string,
    { id: string; text: string; sort: number; options: Map<string, RankingFeedRow> }
  >();

  for (const row of feed) {
    let question = questionsMap.get(row.question_id);
    if (!question) {
      question = { id: row.question_id, text: row.question_text, sort: row.question_sort, options: new Map() };
      questionsMap.set(row.question_id, question);
    }
    question.options.set(row.option_id, row);
  }

  const builtQuestions = [...questionsMap.values()]
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
          imageUrl: o.image_url?.trim() ?? "",
        })),
    }));

  const coverUrl = (head.photo_url ?? "").trim() || (head.logo_url ?? "").trim();
  const updatedAt = new Date().toISOString();

  return {
    slug: head.slug,
    pollId: head.poll_id,
    version: Date.now(),
    updatedAt,
    participantCount: Number(head.participant_count),
    registeredVotes: sumRankingVotes(builtQuestions),
    meta: {
      title: head.title,
      description: head.description ?? "",
      primaryColor: head.primary_color ?? "#4F8FD9",
      coverUrl,
      logoUrl: head.logo_url ?? "",
      status: head.status === "closed" ? "closed" : "active",
    },
    questions: builtQuestions,
  };
}
