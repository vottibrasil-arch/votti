import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";
import { checkSuperAdmin } from "@/lib/api/super-admin.server";
import { navigateAfterAuth } from "@/lib/auth/navigate-after-auth";
import { getSupabaseEnvStatus } from "@/lib/supabase-env";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === "string" && search.redirect.startsWith("/")
        ? search.redirect
        : "/create",
  }),
  head: () => ({ meta: [{ title: "Entrando — Palpite Gol" }] }),
  component: AuthCallback,
});

async function navigateAfterLogin(
  navigate: ReturnType<typeof useNavigate>,
  redirect: string,
  session: Session,
  checkSuperAdminFn: ReturnType<typeof useServerFn<typeof checkSuperAdmin>>,
) {
  const result = await checkSuperAdminFn({ data: { accessToken: session.access_token } });
  if (result.isSuperAdmin) {
    navigate({ to: "/super-admin", replace: true });
    return;
  }

  navigateAfterAuth(navigate, redirect);
}

function AuthCallback() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const checkSuperAdminFn = useServerFn(checkSuperAdmin);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSupabaseEnvStatus().ok) {
      setError("Supabase não configurado.");
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setError("Não foi possível completar o login com Google. Tente novamente.");
      }
    }, 12000);

    async function finish(session: Session | null) {
      if (cancelled || !session) return;
      window.clearTimeout(timeout);
      try {
        await navigateAfterLogin(navigate, redirect, session, checkSuperAdminFn);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível verificar permissão.");
      }
    }

    async function init() {
      const { getSupabaseBrowser } = await import("@/lib/api/supabase-browser");
      const supabase = getSupabaseBrowser();

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (!cancelled) setError(sessionError.message);
        return;
      }
      if (data.session) {
        await finish(data.session);
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) void finish(session);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    }

    void init();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribe?.();
    };
  }, [redirect, navigate, checkSuperAdminFn]);

  if (error) {
    return (
      <Shell>
        <TopBar title="Login" useHistoryBack />
        <div className="glass rounded-2xl p-6 text-center space-y-4 animate-rise">
          <p className="text-sm text-red-400">{error}</p>
          <PrimaryButton to="/login" search={{ redirect }} variant="primary">
            Voltar ao login
          </PrimaryButton>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <TopBar title="Entrando" hideBack />
      <p className="text-center text-sm text-muted-foreground py-12">Conectando com Google...</p>
    </Shell>
  );
}
