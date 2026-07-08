import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app/app-shell";
import { AppTopBar } from "@/components/app/app-top-bar";
import { CreateWizard } from "@/components/votti/create-wizard";
import { useAuth } from "@/lib/auth/use-auth";

export const Route = createFileRoute("/criar")({
  head: () => ({ meta: [{ title: "VOTTI — Criar votação" }] }),
  component: CriarPage,
});

function CriarPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isSuccess = useRouterState({
    select: (state) => state.location.pathname.endsWith("/sucesso"),
  });

  useEffect(() => {
    if (!loading && !user && !isSuccess) {
      navigate({ to: "/login", search: { redirect: "/criar" }, replace: true });
    }
  }, [loading, user, navigate, isSuccess]);

  if (isSuccess) {
    return <Outlet />;
  }

  if (loading || !user) {
    return (
      <AppShell feed={false}>
        <div className="votti-app-page flex-1 flex items-center justify-center">
          <p className="votti-app-muted">Carregando…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell feed={false}>
      <div className="votti-app-page flex-1 px-5 pb-10 max-w-lg mx-auto w-full">
        <AppTopBar back="/" title="Criar votação" />
        <CreateWizard
          onPublished={(slug) => {
            navigate({ to: "/criar/sucesso", search: { slug }, replace: true });
          }}
        />
      </div>
    </AppShell>
  );
}
