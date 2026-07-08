import { isSupabaseBrowserConfigured } from "@/lib/api/supabase-browser";
import { AUTH_NOT_CONFIGURED_MSG } from "@/lib/auth/use-auth";
import {
  deletePollDb,
  duplicatePollDb,
  getPollByIdForOwnerDb,
  getPollBySlugDb,
  hasVotedPollDb,
  listPollsByOwnerDb,
  publishPollDb,
  castVoteDb,
  castVotesDb,
  setPollStatusDb,
  updatePollDb,
} from "@/lib/votti/poll-db";
import {
  getOrCreateVoterToken,
  isPollLockedForVoter,
  lockPollForVoter,
} from "@/lib/votti/voter-session";
import { EMPTY_DRAFT, type PollDraft, type StoredPoll, type VoteSelection } from "@/lib/votti/poll-types";

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

export async function confirmVotes(
  slug: string,
  selections: VoteSelection[],
  voterToken: string,
): Promise<void> {
  assertSupabaseConfigured();
  await castVotesDb(slug, selections, voterToken);
}

/** Verifica localmente e no servidor se o participante já confirmou voto nesta votação. */
export async function voterHasCompletedPoll(slug: string): Promise<boolean> {
  assertSupabaseConfigured();

  if (isPollLockedForVoter(slug)) {
    return true;
  }

  const token = getOrCreateVoterToken(slug);
  const votedOnServer = await hasVotedPollDb(slug, token);
  if (votedOnServer) {
    lockPollForVoter(slug);
    return true;
  }

  return false;
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

export async function getPollById(pollId: string, ownerId: string): Promise<StoredPoll | null> {
  assertSupabaseConfigured();
  return getPollByIdForOwnerDb(pollId, ownerId);
}

export async function updatePoll(
  pollId: string,
  ownerId: string,
  draft: PollDraft,
  opts?: { status?: StoredPoll["status"] },
): Promise<StoredPoll> {
  assertSupabaseConfigured();
  return updatePollDb(pollId, ownerId, draft, opts);
}

export async function closePoll(pollId: string, ownerId: string): Promise<void> {
  assertSupabaseConfigured();
  await setPollStatusDb(pollId, ownerId, "closed");
}

export async function reopenPoll(pollId: string, ownerId: string): Promise<void> {
  assertSupabaseConfigured();
  await setPollStatusDb(pollId, ownerId, "active");
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

export function pollTelaoUrl(slug: string) {
  if (typeof window === "undefined") return `/votacao/${slug}/telao`;
  return `${window.location.origin}/votacao/${slug}/telao`;
}

export { SCHEMA_SETUP_HINT, getPollErrorMessage, isSchemaMissingError } from "@/lib/votti/poll-db";
