import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Link2,
  Loader2,
  Shield,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { AppPageFrame } from "@/components/app/app-page-frame";
import { AppPageBar } from "@/components/app/app-top-bar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getSupabaseBrowser } from "@/lib/api/supabase-browser";
import { useAuth } from "@/lib/auth/use-auth";
import type { AdminPollRow, AdminUserRow } from "@/lib/auth/super-admin.server";
import {
  adminClosePoll,
  adminDeleteUser,
  fetchAdminDashboard,
  fetchAdminUserPolls,
} from "@/lib/auth/super-admin.server";

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

function pollStatusLabel(status: AdminPollRow["status"]) {
  if (status === "active") return "Ativo";
  if (status === "closed") return "Encerrado";
  return "Rascunho";
}

async function getAccessToken() {
  const { data } = await getSupabaseBrowser().auth.getSession();
  return data.session?.access_token ?? "";
}

function SupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeLinks, setActiveLinks] = useState(0);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userPolls, setUserPolls] = useState<AdminPollRow[]>([]);
  const [pollsLoading, setPollsLoading] = useState(false);
  const [pollActionId, setPollActionId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadDashboard = useCallback(async () => {
    setError("");
    setPageLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        navigate({ to: "/login", search: { redirect: "/sup" }, replace: true });
        return;
      }

      const dashboard = await fetchAdminDashboard({ data: { accessToken } });
      setTotalUsers(dashboard.totalUsers);
      setActiveLinks(dashboard.activeLinks);
      setUsers(dashboard.users);
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

  const loadUserPolls = useCallback(async (userId: string) => {
    setPollsLoading(true);
    setError("");
    try {
      const accessToken = await getAccessToken();
      const result = await fetchAdminUserPolls({ data: { accessToken, userId } });
      setUserPolls(result.polls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os links.");
      setUserPolls([]);
    } finally {
      setPollsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: "/sup" }, replace: true });
      return;
    }
    if (user) void loadDashboard();
  }, [loading, user, navigate, loadDashboard]);

  async function toggleUserPanel(row: AdminUserRow) {
    if (expandedUserId === row.id) {
      setExpandedUserId(null);
      setUserPolls([]);
      return;
    }
    setExpandedUserId(row.id);
    await loadUserPolls(row.id);
  }

  async function handleClosePoll(pollId: string) {
    setPollActionId(pollId);
    setError("");
    try {
      const accessToken = await getAccessToken();
      await adminClosePoll({ data: { accessToken, pollId } });
      if (expandedUserId) {
        await loadUserPolls(expandedUserId);
      }
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cancelar o link.");
    } finally {
      setPollActionId(null);
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const accessToken = await getAccessToken();
      await adminDeleteUser({ data: { accessToken, userId: deleteTarget.id } });
      if (expandedUserId === deleteTarget.id) {
        setExpandedUserId(null);
        setUserPolls([]);
      }
      setDeleteTarget(null);
      await loadDashboard();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Não foi possível excluir o usuário.");
    } finally {
      setDeleteBusy(false);
    }
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

  if (pageLoading) {
    return (
      <AppShell>
        <div className="votti-app-page flex-1 flex items-center justify-center">
          <p className="votti-app-muted">Verificando acesso…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppPageFrame contentClassName="pb-16">
        <AppPageBar title="Admin VOTTII" back="/minhas" />

        <div className="votti-sup animate-rise">
          <div className="votti-sup__intro">
            <Shield className="size-5" />
            <div>
              <p className="votti-sup__kicker">Super admin</p>
              <p className="votti-sup__email">{user.email}</p>
              <p className="votti-sup__hint mt-1">Acesso liberado após login com e-mail autorizado.</p>
            </div>
          </div>

          {error ? <p className="votti-auth__error">{error}</p> : null}

          <div className="votti-sup__stats">
            <article className="votti-sup__stat">
              <Users className="size-5" />
              <span className="votti-sup__stat-value tabular-nums">{totalUsers}</span>
              <span className="votti-sup__stat-label">cadastros</span>
            </article>
            <article className="votti-sup__stat votti-sup__stat--on">
              <Link2 className="size-5" />
              <span className="votti-sup__stat-value tabular-nums">{activeLinks}</span>
              <span className="votti-sup__stat-label">links ativos</span>
            </article>
          </div>

          <div className="votti-sup__panel">
            <div className="votti-sup__panel-head">
              <h2>Usuários cadastrados</h2>
              <span className="votti-sup__count tabular-nums">{users.length}</span>
            </div>
            <p className="votti-sup__hint">
              Toque em um usuário para ver os links dele, cancelar votações ativas ou excluir o cadastro.
            </p>

            <div className="votti-sup__user-list">
              {users.map((row) => {
                const expanded = expandedUserId === row.id;
                const activePolls = userPolls.filter((poll) => poll.status === "active");

                return (
                  <article key={row.id} className={`votti-sup__user ${expanded ? "votti-sup__user--open" : ""}`}>
                    <button
                      type="button"
                      className="votti-sup__user-head"
                      onClick={() => void toggleUserPanel(row)}
                      aria-expanded={expanded}
                    >
                      <div className="votti-sup__user-main">
                        <strong>{row.nome || "—"}</strong>
                        <span>{row.email}</span>
                      </div>
                      <div className="votti-sup__user-meta">
                        {row.isSuperAdmin ? (
                          <span className="votti-sup__badge votti-sup__badge--admin">Admin</span>
                        ) : null}
                        <span className="votti-sup__badge">
                          {row.activePollCount} ativo{row.activePollCount === 1 ? "" : "s"}
                        </span>
                        <ChevronDown className={`size-4 transition ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {expanded ? (
                      <div className="votti-sup__user-body">
                        <div className="votti-sup__user-info">
                          <span>Plano: {row.plan}</span>
                          <span className="tabular-nums">Desde {formatDate(row.createdAt)}</span>
                          <span>{row.totalPollCount} votaç{row.totalPollCount === 1 ? "ão" : "ões"} no total</span>
                        </div>

                        {pollsLoading ? (
                          <p className="votti-sup__hint">Carregando links…</p>
                        ) : userPolls.length === 0 ? (
                          <p className="votti-sup__hint">Nenhuma votação criada.</p>
                        ) : (
                          <div className="votti-sup__poll-list">
                            {userPolls.map((poll) => (
                              <div key={poll.id} className="votti-sup__poll">
                                <div className="votti-sup__poll-main">
                                  <strong>{poll.title}</strong>
                                  <span className={`votti-sup__poll-status votti-sup__poll-status--${poll.status}`}>
                                    {pollStatusLabel(poll.status)}
                                  </span>
                                </div>
                                <div className="votti-sup__poll-actions">
                                  <a
                                    href={poll.publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="votti-sup__link-btn"
                                  >
                                    <ExternalLink className="size-3.5" />
                                    Abrir link
                                  </a>
                                  {poll.status === "active" ? (
                                    <button
                                      type="button"
                                      className="votti-sup__link-btn votti-sup__link-btn--danger"
                                      disabled={pollActionId === poll.id}
                                      onClick={() => void handleClosePoll(poll.id)}
                                    >
                                      {pollActionId === poll.id ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                      ) : (
                                        <XCircle className="size-3.5" />
                                      )}
                                      Cancelar link
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {!row.isSuperAdmin && row.id !== user.id ? (
                          <button
                            type="button"
                            className="votti-outline-btn votti-outline-btn--danger w-full"
                            onClick={() => {
                              setDeleteError("");
                              setDeleteTarget(row);
                            }}
                          >
                            <Trash2 className="size-4" />
                            Excluir cadastro
                            {activePolls.length > 0
                              ? ` (${activePolls.length} link${activePolls.length === 1 ? "" : "s"} ativo${activePolls.length === 1 ? "" : "s"})`
                              : ""}
                          </button>
                        ) : (
                          <p className="votti-sup__note">Conta protegida — não pode ser excluída por aqui.</p>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>

          <Link to="/minhas" className="votti-outline-btn w-full text-center">
            Voltar para minhas votações
          </Link>
        </div>
      </AppPageFrame>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Excluir cadastro"
        message={
          deleteTarget ? (
            <>
              Isso remove <strong>{deleteTarget.email}</strong>, todas as votações e votos associados. Essa ação não
              pode ser desfeita.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Excluir cadastro"
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => {
          if (!deleteBusy) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
        onConfirm={() => void handleDeleteUser()}
      />
    </AppShell>
  );
}
