import { isSupabaseBrowserConfigured } from "@/lib/api/supabase-browser";
import { AUTH_NOT_CONFIGURED_MSG } from "@/lib/auth/use-auth";
import {
  deletePollDb,
  duplicatePollDb,
  getPollBySlugDb,
  listPollsByOwnerDb,
  publishPollDb,
  castVoteDb,
} from "@/lib/votti/poll-db";
import { EMPTY_DRAFT, type PollDraft, type StoredPoll } from "@/lib/votti/poll-types";

const DRAFT_KEY = "votti_poll_draft";
const LEGACY_POLLS_KEY = "votti_polls";

function assertSupabaseConfigured() {
  if (!isSupabaseBrowserConfigured()) {
    throw new Error(AUTH_NOT_CONFIGURED_MSG);
  }
}

function clearLegacyLocalPolls() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_POLLS_KEY);
}

export function loadDraft(): PollDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? ({ ...EMPTY_DRAFT, ...JSON.parse(raw) } as PollDraft) : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: PollDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export async function publishPoll(
  draft: PollDraft,
  owner: { id: string; email: string },
): Promise<StoredPoll> {
  assertSupabaseConfigured();
  clearLegacyLocalPolls();
  const poll = await publishPollDb(draft, owner);
  clearDraft();
  return poll;
}

export async function castVote(
  slug: string,
  questionId: string,
  optionId: string,
  voterToken: string,
): Promise<void> {
  assertSupabaseConfigured();
  await castVoteDb(slug, questionId, optionId, voterToken);
}

export async function listPollsByOwner(ownerId: string): Promise<StoredPoll[]> {
  assertSupabaseConfigured();
  clearLegacyLocalPolls();
  return listPollsByOwnerDb(ownerId);
}

export async function getPollBySlug(slug: string): Promise<StoredPoll | null> {
  assertSupabaseConfigured();
  return getPollBySlugDb(slug);
}

export async function deletePoll(pollId: string, ownerId: string): Promise<void> {
  assertSupabaseConfigured();
  await deletePollDb(pollId, ownerId);
}

export async function duplicatePoll(
  pollId: string,
  ownerId: string,
): Promise<StoredPoll | null> {
  assertSupabaseConfigured();
  return duplicatePollDb(pollId, ownerId);
}

export function pollPublicUrl(slug: string) {
  if (typeof window === "undefined") return `/v/${slug}`;
  return `${window.location.origin}/v/${slug}`;
}

export { SCHEMA_SETUP_HINT, getPollErrorMessage, isSchemaMissingError } from "@/lib/votti/poll-db";
