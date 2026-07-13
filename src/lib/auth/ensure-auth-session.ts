import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowser } from "@/lib/api/supabase-browser";

function readOAuthCode(): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get("code");
}

/** Garante sessão JWT válida antes de gravar no Supabase (votação, imagens, etc.). */
export async function ensureAuthSession(): Promise<Session> {
  const supabase = getSupabaseBrowser();
  const code = readOAuthCode();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }

  const { data, error } = await supabase.auth.getSession();
  if (!error && data.session) {
    const expiresAt = (data.session.expires_at ?? 0) * 1000;
    if (expiresAt > Date.now() + 30_000) {
      return data.session;
    }
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session) {
    throw new Error("Sessão expirada. Saia da conta e entre novamente com Google ou e-mail.");
  }

  return refreshed.session;
}

export function resolveDisplayName(user: User): string {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.nome === "string" && meta.nome.trim()) ||
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    [meta.given_name, meta.family_name].filter((v) => typeof v === "string" && v.trim()).join(" ").trim();

  return fromMeta || user.email?.split("@")[0] || "Usuário";
}

export function usesGoogleAuth(user: User): boolean {
  return (user.identities ?? []).some((identity) => identity.provider === "google");
}

export function usesEmailPasswordAuth(user: User): boolean {
  return (user.identities ?? []).some((identity) => identity.provider === "email");
}

/** Sincroniza nome do Google no metadata e garante perfil no banco. */
export async function finalizeOAuthSession(session: Session): Promise<void> {
  const supabase = getSupabaseBrowser();
  const user = session.user;
  const displayName = resolveDisplayName(user);
  const meta = user.user_metadata ?? {};

  if (!meta.nome && !meta.name && displayName) {
    await supabase.auth.updateUser({
      data: { nome: displayName, name: displayName },
    });
  }

  try {
    const { ensureAuthProfile } = await import("@/lib/auth/auth-signup.server");
    await ensureAuthProfile({ data: { accessToken: session.access_token } });
  } catch (err) {
    console.warn("[auth] ensureAuthProfile skipped", err);
  }
}
