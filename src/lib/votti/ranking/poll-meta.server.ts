import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin, getSupabaseAnonServer } from "@/lib/api/supabase.server";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAdminEnvStatus } from "@/lib/supabase-env";
import { getStoredSnapshot } from "@/lib/votti/ranking/snapshot.server";
import type { PollRankingState } from "@/lib/votti/ranking/types";
import type { PollQuestion, StoredPoll } from "@/lib/votti/poll-types";
import { DEFAULT_SETTINGS, type PollSettings } from "@/lib/votti/poll-types";

function parseSettings(raw: unknown): PollSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const s = raw as Partial<PollSettings>;
  return {
    oneVotePerPerson: s.oneVotePerPerson ?? DEFAULT_SETTINGS.oneVotePerPerson,
    showResultBeforeVote: s.showResultBeforeVote ?? DEFAULT_SETTINGS.showResultBeforeVote,
    showResultAfterVote: s.showResultAfterVote ?? DEFAULT_SETTINGS.showResultAfterVote,
    autoClose: s.autoClose ?? DEFAULT_SETTINGS.autoClose,
    closeAt: s.closeAt ?? DEFAULT_SETTINGS.closeAt,
    closeMode: s.closeMode ?? DEFAULT_SETTINGS.closeMode,
    backgroundColor: s.backgroundColor ?? DEFAULT_SETTINGS.backgroundColor,
    buttonColor: s.buttonColor ?? DEFAULT_SETTINGS.buttonColor,
    themePreset: s.themePreset ?? DEFAULT_SETTINGS.themePreset,
  };
}

function buildStoredPollFromSnapshot(snapshot: PollRankingState): StoredPoll {
  return {
    id: snapshot.pollId,
    slug: snapshot.slug,
    ownerId: "",
    ownerEmail: "",
    title: snapshot.meta.title,
    description: snapshot.meta.description,
    category: "",
    logoUrl: snapshot.meta.logoUrl,
    coverUrl: snapshot.meta.coverUrl,
    primaryColor: snapshot.meta.primaryColor,
    questions: snapshot.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text,
        votes: 0,
        imageUrl: o.imageUrl ?? "",
      })),
    })),
    settings: DEFAULT_SETTINGS,
    status: snapshot.meta.status,
    createdAt: snapshot.updatedAt,
    participantCount: 0,
    registeredVotes: 0,
  };
}

async function fetchPollMetaWithSupabase(
  supabase: SupabaseClient<Database>,
  slug: string,
): Promise<StoredPoll | null> {
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select(
      "id, slug, title, description, category, logo_url, photo_url, primary_color, status, settings, created_at, owner_id",
    )
    .eq("slug", slug.trim())
    .maybeSingle();

  if (pollError) throw pollError;
  if (!poll) return null;

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id, poll_id, text, sort_order")
    .eq("poll_id", poll.id)
    .order("sort_order");

  if (qError) throw qError;

  const questionIds = (questions ?? []).map((q) => q.id);
  let options: {
    id: string;
    question_id: string;
    text: string;
    sort_order: number;
    image_url?: string | null;
  }[] = [];

  if (questionIds.length > 0) {
    const { data: optionRows, error: oError } = await supabase
      .from("options")
      .select("id, question_id, text, sort_order, image_url")
      .in("question_id", questionIds)
      .order("sort_order");

    if (oError && !`${oError.message}`.toLowerCase().includes("image_url")) {
      throw oError;
    }

    if (oError) {
      const { data: legacy, error: legacyError } = await supabase
        .from("options")
        .select("id, question_id, text, sort_order")
        .in("question_id", questionIds)
        .order("sort_order");
      if (legacyError) throw legacyError;
      options = (legacy ?? []).map((o) => ({ ...o, image_url: null }));
    } else {
      options = optionRows ?? [];
    }
  }

  const builtQuestions: PollQuestion[] = (questions ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((q) => ({
      id: q.id,
      text: q.text,
      options: options
        .filter((o) => o.question_id === q.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({
          id: o.id,
          text: o.text,
          votes: 0,
          imageUrl: o.image_url?.trim() ?? "",
        })),
    }));

  const coverUrl = (poll.photo_url ?? "").trim() || (poll.logo_url ?? "").trim();

  return {
    id: poll.id,
    slug: poll.slug,
    ownerId: poll.owner_id ?? "",
    ownerEmail: "",
    title: poll.title,
    description: poll.description ?? "",
    category: poll.category ?? "",
    logoUrl: poll.logo_url ?? "",
    coverUrl,
    primaryColor: poll.primary_color ?? "#4F8FD9",
    questions: builtQuestions,
    settings: parseSettings(poll.settings),
    status: poll.status === "closed" ? "closed" : "active",
    createdAt: poll.created_at,
    participantCount: 0,
    registeredVotes: 0,
  };
}

function getSupabaseClientsForMeta(): SupabaseClient<Database>[] {
  const clients: SupabaseClient<Database>[] = [];

  if (getSupabaseAdminEnvStatus().ok) {
    try {
      clients.push(getSupabaseAdmin());
    } catch (err) {
      console.warn("[votti-meta] admin client unavailable", err);
    }
  }

  try {
    clients.push(getSupabaseAnonServer());
  } catch (err) {
    console.warn("[votti-meta] anon client unavailable", err);
  }

  return clients;
}

/** Estrutura da votação sem contagens — nunca consulta votes nem poll_results. */
export async function buildPollMetaFromDb(slug: string): Promise<StoredPoll | null> {
  const key = slug.trim();
  let lastError: unknown;

  for (const supabase of getSupabaseClientsForMeta()) {
    try {
      const poll = await fetchPollMetaWithSupabase(supabase, key);
      if (poll) return poll;
    } catch (err) {
      lastError = err;
      console.warn("[votti-meta] fetch via supabase client failed", key, err);
    }
  }

  try {
    const snapshot = await getStoredSnapshot(key);
    if (snapshot) return buildStoredPollFromSnapshot(snapshot);
  } catch (err) {
    lastError = err;
    console.warn("[votti-meta] snapshot fallback failed", key, err);
  }

  if (lastError) throw lastError;
  return null;
}
