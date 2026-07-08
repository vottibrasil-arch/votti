/** Projeto Supabase oficial do VOTTI — único permitido pelo app. */
export const VOTTI_SUPABASE_PROJECT_REF = "ppvhlocqetyrsqidijms";

export const VOTTI_SUPABASE_URL = `https://${VOTTI_SUPABASE_PROJECT_REF}.supabase.co`;

/** Publishable key (anon) do projeto ppvhlocqetyrsqidijms — pode ir no front-end. */
export const VOTTI_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_L2YOLHMcq2Sw-20FobWVzw_4xdd4F7S";

export function getSupabaseProjectRef(url?: string): string | undefined {
  if (!url) return undefined;
  const normalized = url.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
  const match = normalized.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1];
}

export function isVottiSupabaseProject(url?: string): boolean {
  return getSupabaseProjectRef(url) === VOTTI_SUPABASE_PROJECT_REF;
}

function normalizeSupabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl?.trim()) return undefined;
  return rawUrl.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
}

/** Sempre aponta para o projeto VOTTI, mesmo se o .env/Lovable tiver URL antiga. */
export function resolveVottiSupabaseUrl(rawUrl?: string): string {
  const trimmed = normalizeSupabaseUrl(rawUrl);
  if (trimmed && isVottiSupabaseProject(trimmed)) return trimmed;
  return VOTTI_SUPABASE_URL;
}

/**
 * Garante a publishable key do projeto VOTTI.
 * Evita "Invalid API key" quando Lovable/.env injeta chave de outro projeto.
 */
export function resolveVottiSupabaseAnonKey(rawKey?: string): string {
  const trimmed = rawKey?.trim();
  if (trimmed === VOTTI_SUPABASE_PUBLISHABLE_KEY) return trimmed;
  return VOTTI_SUPABASE_PUBLISHABLE_KEY;
}

export function wasSupabaseAnonKeyOverridden(rawKey?: string): boolean {
  const trimmed = rawKey?.trim();
  return Boolean(trimmed && trimmed !== VOTTI_SUPABASE_PUBLISHABLE_KEY);
}

export function wasSupabaseUrlOverridden(rawUrl?: string): boolean {
  const trimmed = normalizeSupabaseUrl(rawUrl);
  return Boolean(trimmed && !isVottiSupabaseProject(trimmed));
}

export function getWrongSupabaseProjectMessage(currentRef?: string): string {
  if (!currentRef) {
    return `Configure o Supabase do VOTTI: ${VOTTI_SUPABASE_URL}`;
  }
  return `Projeto Supabase errado (${currentRef}). O VOTTI usa apenas ${VOTTI_SUPABASE_PROJECT_REF}. Atualize o .env, remova variáveis antigas do Lovable (se usar) e reinicie o npm run dev.`;
}
