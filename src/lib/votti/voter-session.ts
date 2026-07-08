const TOKEN_PREFIX = "votti-voter:";
const LOCKED_PREFIX = "votti-poll-locked:";
const PENDING_PREFIX = "votti-pending:";

export type PendingSelections = Record<string, string>;

function randomToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Token anônimo que identifica o participante nesta votação. */
export function getOrCreateVoterToken(slug: string): string {
  if (typeof localStorage === "undefined") return randomToken();

  const key = `${TOKEN_PREFIX}${slug}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const token = randomToken();
  localStorage.setItem(key, token);
  return token;
}

export function getPendingSelections(slug: string): PendingSelections {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${PENDING_PREFIX}${slug}`);
    return raw ? (JSON.parse(raw) as PendingSelections) : {};
  } catch {
    return {};
  }
}

export function setPendingSelection(slug: string, questionId: string, optionId: string) {
  if (typeof localStorage === "undefined") return;
  const pending = getPendingSelections(slug);
  localStorage.setItem(
    `${PENDING_PREFIX}${slug}`,
    JSON.stringify({ ...pending, [questionId]: optionId }),
  );
}

export function clearPendingSelections(slug: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(`${PENDING_PREFIX}${slug}`);
}

/** Bloqueia nova votação após confirmar. */
export function lockPollForVoter(slug: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(`${LOCKED_PREFIX}${slug}`, "1");
}

/** True se o participante já confirmou o voto nesta votação. */
export function isPollLockedForVoter(slug: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(`${LOCKED_PREFIX}${slug}`) === "1";
}

/** Marca votação como confirmada e limpa rascunho local. */
export function confirmPollForVoter(slug: string) {
  lockPollForVoter(slug);
  clearPendingSelections(slug);
}

/** @deprecated Use isPollLockedForVoter */
export function hasVoted(slug: string): boolean {
  return isPollLockedForVoter(slug);
}

/** @deprecated Use getPendingSelections */
export function hasVotedQuestion(slug: string, questionId: string): boolean {
  return questionId in getPendingSelections(slug);
}

/** @deprecated Use setPendingSelection + confirmPollForVoter */
export function markQuestionVoted(slug: string, questionId: string) {
  void questionId;
  void slug;
}

export function clearVoterSession(slug: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(`${TOKEN_PREFIX}${slug}`);
  localStorage.removeItem(`${LOCKED_PREFIX}${slug}`);
  localStorage.removeItem(`${PENDING_PREFIX}${slug}`);
}

/** @deprecated Use clearVoterSession */
export function clearVoterToken(slug: string) {
  clearVoterSession(slug);
}
