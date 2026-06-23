import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseEnvStatus } from "@/lib/supabase-env";

export type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => string | null;
};

let sessionCache: Session | null = null;
let configuredCache = false;
let initDone = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

async function syncUserProfile(user: User) {
  const { getSupabaseBrowser } = await import("@/lib/api/supabase-browser");
  const supabase = getSupabaseBrowser();
  const metaName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    null;
  const nome = metaName || user.email?.split("@")[0] || "Usuário";

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      nome,
      ...(user.email ? { email: user.email } : {}),
    },
    { onConflict: "id" },
  );
}

async function signIn(email: string, password: string) {
  const { getSupabaseBrowser } = await import("@/lib/api/supabase-browser");
  const { data, error } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    // Não bloqueia o login por uma escrita auxiliar de perfil.
    void syncUserProfile(data.user);
  }
}

async function signUp(email: string, password: string, name?: string) {
  const { getSupabaseBrowser } = await import("@/lib/api/supabase-browser");
  const trimmedEmail = email.trim();
  const trimmedName = name?.trim();
  const { data, error } = await getSupabaseBrowser().auth.signUp({
    email: trimmedEmail,
    password,
    options: trimmedName ? { data: { full_name: trimmedName, name: trimmedName } } : undefined,
  });
  if (error) throw error;
  if (data.user) {
    await getSupabaseBrowser().from("profiles").upsert(
      {
        id: data.user.id,
        nome: trimmedName || trimmedEmail.split("@")[0] || "Usuário",
        email: trimmedEmail,
      },
      { onConflict: "id" },
    );
  }
}

async function signOut() {
  const { getSupabaseBrowser } = await import("@/lib/api/supabase-browser");
  const { error } = await getSupabaseBrowser().auth.signOut();
  if (error) throw error;
}

async function signInWithGoogle(redirectPath = "/create") {
  const { signInWithGoogleOAuth } = await import("@/lib/auth/google-oauth");
  await signInWithGoogleOAuth(redirectPath);
}

export function useAuth(): AuthState {
  const [version, setVersion] = useState(initDone ? 1 : 0);

  useEffect(() => {
    if (typeof window === "undefined") {
      configuredCache = getSupabaseEnvStatus().ok;
      initDone = true;
      setVersion(1);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let visibilityHandler: (() => void) | undefined;

    async function syncSession(supabase: Awaited<ReturnType<typeof import("@/lib/api/supabase-browser").getSupabaseBrowser>>) {
      const { data } = await supabase.auth.getSession();
      sessionCache = data.session;
      if (initDone) {
        notify();
      }
    }

    async function init() {
      try {
        configuredCache = getSupabaseEnvStatus().ok;

        if (!configuredCache) {
          return;
        }

        const { getSupabaseBrowser } = await import("@/lib/api/supabase-browser");
        const supabase = getSupabaseBrowser();
        await syncSession(supabase);

        const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          sessionCache = nextSession;
          if (nextSession?.user) {
            void syncUserProfile(nextSession.user);
          }
          notify();
        });

        unsubscribe = () => listener.subscription.unsubscribe();

        visibilityHandler = () => {
          if (document.visibilityState !== "visible") return;
          void syncSession(supabase);
        };
        document.addEventListener("visibilitychange", visibilityHandler);
      } catch (err) {
        console.error("[auth] Falha ao inicializar sessão:", err);
        configuredCache = getSupabaseEnvStatus().ok;
      } finally {
        initDone = true;
        if (!cancelled) setVersion(1);
        notify();
      }
    }

    void init();

    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);

    return () => {
      cancelled = true;
      listeners.delete(listener);
      unsubscribe?.();
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
    };
  }, []);

  const getAccessToken = useCallback(() => sessionCache?.access_token ?? null, [version]);

  return useMemo(
    () => ({
      session: sessionCache,
      user: (sessionCache?.user ?? null) as User | null,
      loading: !initDone,
      configured: configuredCache || getSupabaseEnvStatus().ok,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      getAccessToken,
    }),
    [version, getAccessToken],
  );
}
