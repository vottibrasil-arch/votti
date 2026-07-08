import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/api/supabase-browser";
import { navigateAfterAuth, sanitizeRedirect } from "@/lib/auth/redirect";
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
    if (!isSupabaseBrowserConfigured()) {
      navigateAfterAuth(navigate, redirect);
      return;
    }

    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError || !data.session) {
        setError("Não foi possível completar o login.");
        return;
      }
      navigateAfterAuth(navigate, redirect);
    });
  }, [navigate, redirect]);

  return (
    <AppShell feed={false}>
      <div className="votti-app-page flex-1 flex items-center justify-center px-5">
        <p className="votti-app-muted">{error || "Conectando…"}</p>
      </div>
    </AppShell>
  );
}
