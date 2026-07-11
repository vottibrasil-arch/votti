import { getSupabaseAdmin, getSupabaseAnonServer } from "@/lib/api/supabase.server";
import { buildSnapshotFromPollResults } from "@/lib/votti/ranking/build-snapshot.server";
import type { PollRankingState } from "@/lib/votti/ranking/types";

/** Leitura pública — usa anon key (não exige service role no Vercel). */
export async function getStoredSnapshot(slug: string): Promise<PollRankingState | null> {
  const supabase = getSupabaseAnonServer();
  const { data, error } = await supabase
    .from("ranking_snapshots")
    .select("payload")
    .eq("slug", slug.trim())
    .maybeSingle();

  if (error) throw error;
  if (!data?.payload) return null;
  return data.payload as PollRankingState;
}

export async function upsertRankingSnapshot(slug: string, payload: PollRankingState): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("ranking_snapshots").upsert(
    {
      slug: slug.trim(),
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );

  if (error) throw error;
}

/** SELECT poll_ranking_feed → UPSERT ranking_snapshots (exige service role). */
export async function refreshRankingSnapshot(slug: string): Promise<PollRankingState | null> {
  const payload = await buildSnapshotFromPollResults(slug);
  if (!payload) return null;
  await upsertRankingSnapshot(slug, payload);
  return payload;
}

/** Snapshot inicial ao publicar enquete. */
export async function createInitialRankingSnapshot(slug: string): Promise<PollRankingState | null> {
  return refreshRankingSnapshot(slug);
}
