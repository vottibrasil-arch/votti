import { AppPageFrame } from "@/components/app/app-page-frame";
import { AppPageBar } from "@/components/app/app-top-bar";
import { CreateWizard } from "@/components/votti/create-wizard";
import { useAuth } from "@/lib/auth/use-auth";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app/app-shell";

type CriarSearch = {
  edit?: string;
};

export const Route = createFileRoute("/criar")({
  head: () => ({ meta: [{ title: "VOTTI — Criar votação" }] }),
  validateSearch: (search: Record<string, unknown>): CriarSearch => ({
    edit: typeof search.edit === "string" && search.edit.trim() ? search.edit.trim() : undefined,
  }),
  component: CriarPage,
});

function CriarPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { edit } = Route.useSearch();
  const isSuccess = useRouterState({
    select: (state) => state.location.pathname.endsWith("/sucesso"),
  });
  const isEditing = Boolean(edit);

  useEffect(() => {
    if (!loading && !user && !isSuccess) {
      navigate({ to: "/login", search: { redirect: edit ? `/criar?edit=${edit}` : "/criar" }, replace: true });
    }
  }, [loading, user, navigate, isSuccess, edit]);

  if (isSuccess) {
    return <Outlet />;
  }

  if (loading || !user) {
    return (
      <AppShell>
        <div className="votti-app-page flex-1 flex items-center justify-center">
          <p className="votti-app-muted">Carregando…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppPageFrame>
        <AppPageBar back={isEditing ? "/minhas" : undefined} title={isEditing ? "Editar visual" : "Criar votação"} />
        <CreateWizard
          editPollId={edit}
          onPublished={(slug) => {
            navigate({ to: "/criar/sucesso", search: { slug }, replace: true });
          }}
          onSaved={() => {
            navigate({ to: "/minhas", replace: true });
          }}
        />
      </AppPageFrame>
    </AppShell>
  );
}
