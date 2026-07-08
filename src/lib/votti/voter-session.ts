const KEY_PREFIX = "votti-voter:";

function randomToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Token anônimo que identifica o participante nesta votação (localStorage). */
export function getOrCreateVoterToken(slug: string): string {
  if (typeof localStorage === "undefined") return randomToken();

  const key = `${KEY_PREFIX}${slug}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const token = randomToken();
  localStorage.setItem(key, token);
  return token;
}

export function hasVoted(slug: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return Boolean(localStorage.getItem(`${KEY_PREFIX}${slug}`));
}

export function clearVoterToken(slug: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(`${KEY_PREFIX}${slug}`);
}
