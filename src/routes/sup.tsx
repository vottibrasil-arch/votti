import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Shield, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { AppPageFrame } from "@/components/app/app-page-frame";
import { AppPageBar } from "@/components/app/app-top-bar";
import { getSupabaseBrowser } from "@/lib/api/supabase-browser";
import { useAuth } from "@/lib/auth/use-auth";
import type { AdminUserRow } from "@/lib/auth/super-admin.server";
import { fetchAdminDashboard, setSignupOpen } from "@/lib/auth/super-admin.server";
import type { SignupSettings } from "@/lib/auth/app-settings.server";

export const Route = createFileRoute("/sup")({
  head: () => ({ meta: [{ title: "VOTTII — Admin" }] }),
  component: SupPage,
});

function formatDate(value: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function SupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [signup, setSignup] = useState<SignupSettings | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [signupOpen, setSignupOpenState] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setError("");
    setPageLoading(true);
    try {
      const { data: sessionData } = await getSupabaseBrowser().auth.getSession();
      const accessToken = sessionData.session?.access_token ?? "";
      if (!accessToken) {
        navigate({ to: "/login", search: { redirect: "/sup" }, replace: true });
        return;
      }

      const dashboard = await fetchAdminDashboard({ data: { accessToken } });
      setSignup(dashboard.signup);
      setTotalUsers(dashboard.totalUsers);
      setUsers(dashboard.users);
      setSignupOpenState(dashboard.signupOpen);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível carregar o painel.";
      if (message.includes("Acesso negado")) {
        navigate({ to: "/", replace: true });
        return;
      }
      setError(message);
    } finally {
      setPageLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: "/sup" }, replace: true });
      return;
    }
    if (user) void loadDashboard();
  }, [loading, user, navigate, loadDashboard]);

  async function handleToggleSignup() {
    if (!signup) return;
    setToggleBusy(true);
    setError("");
    try {
      const { data: sessionData } = await getSupabaseBrowser().auth.getSession();
      const accessToken = sessionData.session?.access_token ?? "";
      const result = await setSignupOpen({
        data: { accessToken, open: !signup.open },
      });
      setSignup(result.signup);
      setSignupOpenState(result.signupOpen);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o cadastro.");
    } finally {
      setToggleBusy(false);
    }
  }

  if (loading || !user || pageLoading) {
    return (
      <AppShell>
        <div className="votti-app-page flex-1 flex items-center justify-center">
          <p className="votti-app-muted">Carregando painel…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppPageFrame>
        <AppPageBar title="Admin VOTTII" back="/minhas" />

        <div className="votti-sup animate-rise">
          <div className="votti-sup__intro">
            <Shield className="size-5" />
            <div>
              <p className="votti-sup__kicker">Super admin</p>
              <p className="votti-sup__email">{user.email}</p>
            </div>
          </div>

          {error ? <p className="votti-auth__error">{error}</p> : null}

          <div className="votti-sup__stats">
            <article className="votti-sup__stat">
              <Users className="size-5" />
              <span className="votti-sup__stat-value tabular-nums">{totalUsers}</span>
              <span className="votti-sup__stat-label">cadastros</span>
            </article>
            <article className={`votti-sup__stat ${signupOpen ? "votti-sup__stat--on" : "votti-sup__stat--off"}`}>
              <UserPlus className="size-5" />
              <span className="votti-sup__stat-value">{signupOpen ? "Aberto" : "Fechado"}</span>
              <span className="votti-sup__stat-label">novo cadastro</span>
            </article>
          </div>

          <div className="votti-sup__panel">
            <h2>Cadastro de contas</h2>
            <p className="votti-sup__hint">
              {signupOpen
                ? "Novas pessoas podem criar conta em /cadastro."
                : signup?.message ?? "Cadastro fechado."}
            </p>
            <button
              type="button"
              className={`votti-mega-btn votti-mega-btn--sm w-full ${signup?.open ? "votti-sup__btn--danger" : ""}`}
              disabled={toggleBusy}
              onClick={() => void handleToggleSignup()}
            >
              {toggleBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando…
                </>
              ) : signup?.open ? (
                "Fechar cadastro"
              ) : (
                "Abrir cadastro"
              )}
            </button>
            <p className="votti-sup__note">
              Também pode editar em Supabase → Table Editor → <code>app_settings</code> → chave{" "}
              <code>signup</code>.
            </p>
          </div>

          <div className="votti-sup__panel">
            <div className="votti-sup__panel-head">
              <h2>Usuários cadastrados</h2>
              <span className="votti-sup__count tabular-nums">{users.length}</span>
            </div>
            <div className="votti-sup__table-wrap">
              <table className="votti-sup__table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Plano</th>
                    <th>Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((row) => (
                    <tr key={row.id}>
                      <td>{row.nome || "—"}</td>
                      <td>{row.email}</td>
                      <td>{row.plan}</td>
                      <td className="tabular-nums">{formatDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="votti-sup__footer-note">
            Configuração de admins: Supabase → <code>app_settings</code> → <code>super_admin</code>.
          </p>

          <Link to="/minhas" className="votti-outline-btn w-full text-center">
            Voltar para minhas votações
          </Link>
        </div>
      </AppPageFrame>
    </AppShell>
  );
}
