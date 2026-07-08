const TOKEN_PREFIX = "votti-voter:";
const VOTED_PREFIX = "votti-voted:";

function randomToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function readVotedQuestions(slug: string): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${VOTED_PREFIX}${slug}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
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

export function hasVotedQuestion(slug: string, questionId: string): boolean {
  return readVotedQuestions(slug).includes(questionId);
}

export function markQuestionVoted(slug: string, questionId: string) {
  if (typeof localStorage === "undefined") return;
  const list = readVotedQuestions(slug);
  if (list.includes(questionId)) return;
  localStorage.setItem(`${VOTED_PREFIX}${slug}`, JSON.stringify([...list, questionId]));
}

/** True se o participante já votou em ao menos uma pergunta desta votação. */
export function hasVoted(slug: string): boolean {
  return readVotedQuestions(slug).length > 0;
}

export function clearVoterSession(slug: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(`${TOKEN_PREFIX}${slug}`);
  localStorage.removeItem(`${VOTED_PREFIX}${slug}`);
}

/** @deprecated Use clearVoterSession */
export function clearVoterToken(slug: string) {
  clearVoterSession(slug);
}
