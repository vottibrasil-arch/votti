import { getSupabaseAdmin } from "@/lib/api/supabase.server";
import { buildSnapshotFromPollResults } from "@/lib/votti/ranking/build-snapshot.server";
import type { PollRankingState } from "@/lib/votti/ranking/types";

export async function getStoredSnapshot(slug: string): Promise<PollRankingState | null> {
  const supabase = getSupabaseAdmin();
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

/** SELECT poll_results (via feed) → UPSERT ranking_snapshots */
export async function refreshRankingSnapshot(slug: string): Promise<PollRankingState | null> {
  const payload = await buildSnapshotFromPollResults(slug);
  if (!payload) return null;
  await upsertRankingSnapshot(slug, payload);
  return payload;
}

/** Snapshot inicial zerado ao publicar enquete. */
export async function createInitialRankingSnapshot(slug: string): Promise<PollRankingState | null> {
  return refreshRankingSnapshot(slug);
}
