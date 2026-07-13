import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/api/supabase-browser";
import { ensureAuthSession, finalizeOAuthSession } from "@/lib/auth/ensure-auth-session";
import { mapAuthError } from "@/lib/auth/auth-errors";
import { navigateAfterAuth } from "@/lib/auth/redirect";
import { AppShell } from "@/components/app/app-shell";

type CallbackSearch = { redirect?: string };

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      if (!isSupabaseBrowserConfigured()) {
        navigateAfterAuth(navigate, redirect);
        return;
      }

      try {
        const url = new URL(window.location.href);
        const oauthError = url.searchParams.get("error_description");
        if (oauthError) {
          if (!cancelled) setError(mapAuthError(decodeURIComponent(oauthError)));
          return;
        }

        const session = await ensureAuthSession();
        await finalizeOAuthSession(session);

        if (!cancelled) navigateAfterAuth(navigate, redirect);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? mapAuthError(err.message) : "Não foi possível completar o login.",
          );
        }
      }
    }

    void complete();

    return () => {
      cancelled = true;
    };
  }, [navigate, redirect]);

  return (
    <AppShell feed={false}>
      <div className="votti-app-page flex-1 flex items-center justify-center px-5">
        <p className="votti-app-muted">{error || "Conectando…"}</p>
      </div>
    </AppShell>
  );
}
