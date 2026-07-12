import { getSupabaseAdmin, getSupabaseAnonServer } from "@/lib/api/supabase.server";
import { getSupabaseAdminEnvStatus } from "@/lib/supabase-env";

function getSupabaseForVoterCheck() {
  if (getSupabaseAdminEnvStatus().ok) {
    try {
      return getSupabaseAdmin();
    } catch (err) {
      console.warn("[votti-voter] admin client unavailable", err);
    }
  }
  return getSupabaseAnonServer();
}

/** Verifica no servidor se o participante já votou (bypass RLS com service role). */
export async function hasVotedPollServer(slug: string, voterToken: string): Promise<boolean> {
  const token = voterToken.trim();
  if (!token) return false;

  const supabase = getSupabaseForVoterCheck();

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id")
    .eq("slug", slug.trim())
    .maybeSingle();

  if (pollError) throw pollError;
  if (!poll) return false;

  const { data: votes, error: votesError } = await supabase
    .from("votes")
    .select("id")
    .eq("poll_id", poll.id)
    .eq("voter_token", token)
    .limit(1);

  if (votesError) throw votesError;
  return (votes?.length ?? 0) > 0;
}
