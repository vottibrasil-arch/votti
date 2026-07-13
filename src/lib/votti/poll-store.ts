import { isSupabaseBrowserConfigured } from "@/lib/api/supabase-browser";
import { ensureAuthSession } from "@/lib/auth/ensure-auth-session";
import {
  findInvalidDraftImages,
  resolveDraftImages,
  sanitizeDraftImages,
} from "@/lib/votti/persist-image-url";
import { getPublicAppOrigin } from "@/lib/votti/app-url";
import { AUTH_NOT_CONFIGURED_MSG } from "@/lib/auth/use-auth";
import {
  deletePollDb,
  duplicatePollDb,
  getPollByIdForOwnerDb,
  getPollBySlugDb,
  listPollsByOwnerDb,
  publishPollDb,
  castVoteDb,
  castVotesDb,
  setPollStatusDb,
  managePollDb,
  updatePollDb,
} from "@/lib/votti/poll-db";
import { fetchPollMeta, fetchVoterHasVoted, pollMetaToStoredPoll, refreshPollSnapshot } from "@/lib/votti/ranking/client";
import { initializePollRankingFn } from "@/lib/votti/ranking/ranking-actions.server";
import {
  confirmPollForVoter,
  getOrCreateVoterToken,
  isPollLockedForVoter,
  lockPollForVoter,
} from "@/lib/votti/voter-session";
import {
  EMPTY_DRAFT,
  mergeVisualEditDraft,
  type CloseMode,
  type PollDraft,
  type PollSettings,
  type StoredPoll,
  type VoteSelection,
} from "@/lib/votti/poll-types";

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
    return raw ? sanitizeDraftImages({ ...EMPTY_DRAFT, ...JSON.parse(raw) } as PollDraft) : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: PollDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(sanitizeDraftImages(draft)));
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

  const session = await ensureAuthSession();
  const activeOwner = {
    id: session.user.id,
    email: session.user.email ?? owner.email,
  };

  const imageError = findInvalidDraftImages(draft);
  if (imageError) throw new Error(imageError);

  const resolvedDraft = await resolveDraftImages(draft, activeOwner.id);
  const poll = await publishPollDb(resolvedDraft, activeOwner);
  clearDraft();
  try {
    await initializePollRankingFn({ data: { slug: poll.slug } });
  } catch (err) {
    console.warn("[votti] ranking snapshot init skipped after publish", poll.slug, err);
  }
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
  void refreshPollSnapshot(slug);
}

export async function confirmVotes(
  slug: string,
  selections: VoteSelection[],
  voterToken: string,
): Promise<void> {
  assertSupabaseConfigured();

  if (await fetchVoterHasVoted(slug, voterToken)) {
    throw new Error("Você já votou nesta votação.");
  }

  await castVotesDb(slug, selections, voterToken);
  void refreshPollSnapshot(slug);
}

/** Verifica localmente se o participante já confirmou voto nesta votação. */
export async function voterHasCompletedPoll(slug: string): Promise<boolean> {
  return isPollLockedForVoter(slug);
}

export type VoterPollDestination = "vote" | "results";

export function isAlreadyVotedMessage(message: string): boolean {
  return /já votou/i.test(message);
}

/** Decide se o participante deve ir para o ranking ou para a tela de voto. */
export async function resolveVoterPollDestination(slug: string): Promise<VoterPollDestination> {
  if (isPollLockedForVoter(slug)) return "results";

  const token = getOrCreateVoterToken(slug);

  try {
    const voted = await fetchVoterHasVoted(slug, token);
    if (voted) {
      confirmPollForVoter(slug);
      return "results";
    }
  } catch {
    /* mantém fluxo de voto se a API falhar */
  }

  return "vote";
}

export function pollResultsPath(slug: string) {
  return `/votacao/${slug}/resultados`;
}

export function pollResultsUrl(slug: string) {
  const origin = getPublicAppOrigin();
  return `${origin}${pollResultsPath(slug)}`;
}

/** Metadados da votação para tela de voto — sem contagens (API /meta). */
export async function getPollMetaForVoting(slug: string): Promise<StoredPoll | null> {
  const meta = await fetchPollMeta(slug);
  if (!meta) return null;
  return pollMetaToStoredPoll(meta);
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

  const session = await ensureAuthSession();
  const activeOwnerId = session.user.id;

  const imageError = findInvalidDraftImages(draft);
  if (imageError) throw new Error(imageError);

  const existing = await getPollByIdForOwnerDb(pollId, activeOwnerId);
  if (!existing) throw new Error("Votação não encontrada.");

  const resolvedDraft = await resolveDraftImages(draft, activeOwnerId);
  const mergedDraft = mergeVisualEditDraft(existing, resolvedDraft);
  return updatePollDb(pollId, activeOwnerId, mergedDraft, opts);
}

export async function closePoll(pollId: string, ownerId: string): Promise<void> {
  assertSupabaseConfigured();
  await setPollStatusDb(pollId, ownerId, "closed");
}

export async function reopenPoll(pollId: string, ownerId: string): Promise<void> {
  await activatePoll(pollId, ownerId);
}

export async function managePoll(
  pollId: string,
  ownerId: string,
  patch: { status?: StoredPoll["status"]; settings?: Partial<PollSettings> },
): Promise<StoredPoll> {
  assertSupabaseConfigured();
  return managePollDb(pollId, ownerId, patch);
}

export async function activatePoll(pollId: string, ownerId: string): Promise<StoredPoll> {
  return managePoll(pollId, ownerId, {
    status: "active",
    settings: { closeMode: "until_admin", autoClose: false, closeAt: "" },
  });
}

export async function deactivatePoll(pollId: string, ownerId: string): Promise<StoredPoll> {
  return managePoll(pollId, ownerId, { status: "closed" });
}

export async function schedulePollClose(
  pollId: string,
  ownerId: string,
  closeAt: string,
  mode: CloseMode,
): Promise<StoredPoll> {
  return managePoll(pollId, ownerId, {
    status: "active",
    settings: {
      closeMode: mode,
      autoClose: true,
      closeAt,
    },
  });
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
  const origin = getPublicAppOrigin();
  return `${origin}/v/${slug}`;
}

export function pollTelaoUrl(slug: string) {
  const origin = getPublicAppOrigin();
  return `${origin}/votacao/${slug}/telao`;
}

export { SCHEMA_SETUP_HINT, getPollErrorMessage, isSchemaMissingError } from "@/lib/votti/poll-db";
