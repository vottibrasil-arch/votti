import {
  getSupabaseAdmin,
  getSupabaseAnonServer,
} from "@/lib/api/supabase.server";
import { getSupabaseAdminEnvStatus } from "@/lib/supabase-env";
import { buildSnapshotFromPollResults } from "@/lib/votti/ranking/build-snapshot.server";
import type { PollRankingState } from "@/lib/votti/ranking/types";

async function readSnapshotRow(slug: string) {
  const key = slug.trim();
  const attempts = [];

  if (getSupabaseAdminEnvStatus().ok) {
    try {
      attempts.push(getSupabaseAdmin());
    } catch (err) {
      console.warn("[votti-snapshot] admin client unavailable", err);
    }
  }
  attempts.push(getSupabaseAnonServer());

  let lastError: unknown;
  for (const supabase of attempts) {
    const { data, error } = await supabase
      .from("ranking_snapshots")
      .select("payload")
      .eq("slug", key)
      .maybeSingle();

    if (!error && data?.payload) {
      return data.payload as PollRankingState;
    }
    if (error) lastError = error;
  }

  if (lastError) {
    console.warn("[votti-snapshot] read failed", key, lastError);
  }
  return null;
}

/** Leitura do snapshot — service role primeiro, depois anon (se SQL público aplicado). */
export async function getStoredSnapshot(slug: string): Promise<PollRankingState | null> {
  return readSnapshotRow(slug);
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
