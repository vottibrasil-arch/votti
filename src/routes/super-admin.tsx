import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SignOutButton } from "@/components/auth-sign-out";
import { TeamFlag } from "@/components/bolao/team-flag";
import { useAuth } from "@/lib/auth/use-auth";
import {
  checkSuperAdmin,
  deleteBolaoAdminAccount,
  getSuperAdminPanelData,
  setOfficialCatalogMatchStatus,
  promoteBolaoAdminToSuperAdmin,
  setPropagandaRodapeVisivel,
  setValorApoioPix,
  type SuperAdminPanelData,
  updateBolaoAdminName,
  updateBolaoAdminPassword,
} from "@/lib/api/super-admin.server";
import { formatMoney } from "@/lib/bolao";
import {
  groupCatalogByGrupo,
  WORLD_CUP_2026_CATALOG,
  type OfficialCatalogMatch,
} from "@/lib/bolao/official-catalog";
import { teamNameToCode } from "@/lib/bolao/team-codes";
import { getOfficialCatalogStatusMap } from "@/lib/api/matches-list.server";
import {
  BarChart3,
  CalendarDays,
  Eye,
  EyeOff,
  HeartHandshake,
  KeyRound,
  Pencil,
  Search,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

type SuperAdminTab = "dashboard" | "jogos" | "apoiadores" | "participantes" | "usuarios";

export const Route = createFileRoute("/super-admin")({
  head: () => ({ meta: [{ title: "Super ADM — Palpite Gol" }] }),
  component: SuperAdmin,
});

function formatDate(iso: string | null) {
  if (!iso) return "Sem data";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDayKey(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayLabel(dayKey: string) {
  const date = new Date(`${dayKey}T00:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function displaySystemUserName(user: { nome: string | null; email: string | null }) {
  if (user.nome?.trim()) return user.nome.trim();
  if (user.email) {
    const local = user.email.split("@")[0]?.trim();
    if (local) return local;
  }
  return "Sem nome cadastrado";
}

function displaySystemUserEmail(user: { email: string | null }) {
  return user.email?.trim() || "E-mail não disponível";
}

function displaySystemUserSubtitle(user: { boloes_count: number; created_at: string | null }) {
  const parts: string[] = [];
  if (user.created_at) parts.push(`cadastro ${formatDate(user.created_at)}`);
  if (user.boloes_count > 0) {
    parts.push(
      `${user.boloes_count} bolão${user.boloes_count === 1 ? "" : "ões"} criado${user.boloes_count === 1 ? "" : "s"}`,
    );
  }
  return parts.join(" · ") || "Usuário do sistema";
}

function formatParticipantStatus(status: string) {
  if (status === "aprovado") return "Aprovado";
  if (status === "rejeitado") return "Rejeitado";
  if (status === "pendente") return "Pendente";
  return status;
}

function getUserRoleLabel(user: SuperAdminPanelData["usuarios"][number]) {
  if (user.is_super_admin) return "Super ADM";
  if (user.boloes_count > 0) return "ADM";
  return "Usuário";
}

function UserRoleBadge({ user }: { user: SuperAdminPanelData["usuarios"][number] }) {
  if (user.is_super_admin) {
    return (
      <span className="chip text-[10px] border-primary/40 bg-primary/15 text-primary">
        Super ADM
      </span>
    );
  }
  if (user.boloes_count > 0) {
    return <span className="chip text-[10px] border-gold/40 bg-gold/10 text-gold">ADM</span>;
  }
  return <span className="chip text-[10px] text-muted-foreground">Usuário</span>;
}

function matchesUserSearch(user: SuperAdminPanelData["usuarios"][number], query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return (
    displaySystemUserName(user).toLowerCase().includes(term) ||
    displaySystemUserEmail(user).toLowerCase().includes(term) ||
    getUserRoleLabel(user).toLowerCase().includes(term)
  );
}

function SuperAdmin() {
  const navigate = useNavigate();
  const { user, loading, getAccessToken } = useAuth();
  const checkSuperAdminFn = useServerFn(checkSuperAdmin);
  const getPanelDataFn = useServerFn(getSuperAdminPanelData);
  const updateNameFn = useServerFn(updateBolaoAdminName);
  const updatePasswordFn = useServerFn(updateBolaoAdminPassword);
  const promoteFn = useServerFn(promoteBolaoAdminToSuperAdmin);
  const deleteAccountFn = useServerFn(deleteBolaoAdminAccount);
  const setPropagandaFn = useServerFn(setPropagandaRodapeVisivel);
  const setValorApoioPixFn = useServerFn(setValorApoioPix);

  const [tab, setTab] = useState<SuperAdminTab>("dashboard");
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<SuperAdminPanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (loading) {
      setChecking(true);
      return;
    }
    if (!user) {
      setChecking(false);
      navigate({ to: "/login", search: { redirect: "/super-admin" }, replace: true });
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("Sessão não encontrada. Faça login novamente.");
      setChecking(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setChecking(true);
      setError(null);
      try {
        const permission = await checkSuperAdminFn({ data: { accessToken: token } });
        if (!permission.isSuperAdmin) {
          navigate({ to: "/create", search: { aba: "meus" }, replace: true });
          return;
        }

        const panelData = await getPanelDataFn({ data: { accessToken: token } });
        if (!cancelled) setData(panelData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar painel");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loading, navigate, user?.id]);

  const reloadPanelData = async (token: string) => {
    const panelData = await getPanelDataFn({ data: { accessToken: token } });
    setData(panelData);
  };

  const runAdminAction = async (key: string, action: (token: string) => Promise<string>) => {
    const token = getAccessToken();
    if (!token) {
      setError("Sessão não encontrada. Faça login novamente.");
      return;
    }

    setActionLoading(key);
    setError(null);
    setNotice(null);
    try {
      const message = await action(token);
      await reloadPanelData(token);
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar ação");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditName = (admin: SuperAdminPanelData["usuarios"][number]) => {
    const currentName = admin.nome || "";
    const nome = window.prompt("Novo nome do usuário:", currentName);
    if (!nome || nome.trim() === currentName) return;

    void runAdminAction(`name-${admin.id}`, async (token) => {
      await updateNameFn({ data: { accessToken: token, userId: admin.id, nome: nome.trim() } });
      return "Nome atualizado.";
    });
  };

  const handleChangePassword = (admin: SuperAdminPanelData["usuarios"][number]) => {
    const password = window.prompt(`Nova senha para ${displaySystemUserName(admin)}:`);
    if (!password) return;
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    void runAdminAction(`password-${admin.id}`, async (token) => {
      await updatePasswordFn({ data: { accessToken: token, userId: admin.id, password } });
      return "Senha alterada.";
    });
  };

  const handlePromote = (admin: SuperAdminPanelData["usuarios"][number]) => {
    const ok = window.confirm(`Transformar ${displaySystemUserName(admin)} em Super ADM?`);
    if (!ok) return;

    void runAdminAction(`promote-${admin.id}`, async (token) => {
      await promoteFn({ data: { accessToken: token, userId: admin.id } });
      return "Usuário transformado em Super ADM.";
    });
  };

  const handleDeleteAccount = (admin: SuperAdminPanelData["usuarios"][number]) => {
    const label = `${displaySystemUserName(admin)} (${displaySystemUserEmail(admin)})`;
    const ok = window.confirm(
      `Excluir a conta ${label}? Essa ação é perigosa e não pode ser desfeita.`,
    );
    if (!ok) return;

    void runAdminAction(`delete-${admin.id}`, async (token) => {
      await deleteAccountFn({ data: { accessToken: token, userId: admin.id } });
      return "Conta excluída.";
    });
  };

  const handleTogglePropaganda = (visivel: boolean) => {
    void runAdminAction("propaganda-toggle", async (token) => {
      await setPropagandaFn({ data: { accessToken: token, visivel } });
      return visivel
        ? "Espaço do apoiador visível no rodapé."
        : "Espaço do apoiador oculto no rodapé.";
    });
  };

  if (loading || checking) {
    return (
      <AdminShell>
        <div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">
          Carregando painel administrativo...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <header className="flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-4" /> Super ADM
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">
            Painel Administrativo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administração simples do Palpite Gol usando o mesmo login Supabase.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0 text-right text-xs text-muted-foreground">
            <div className="truncate text-foreground">{user?.email}</div>
            <div>Usuário autenticado</div>
          </div>
          <SignOutButton compact />
        </div>
      </header>

      <nav className="mt-5 grid grid-cols-2 gap-2 md:flex">
        <AdminTabButton
          active={tab === "dashboard"}
          onClick={() => setTab("dashboard")}
          icon={<BarChart3 className="size-4" />}
        >
          Dashboard
        </AdminTabButton>
        <AdminTabButton
          active={tab === "jogos"}
          onClick={() => setTab("jogos")}
          icon={<CalendarDays className="size-4" />}
        >
          Jogos Oficiais
        </AdminTabButton>
        <AdminTabButton
          active={tab === "apoiadores"}
          onClick={() => setTab("apoiadores")}
          icon={<HeartHandshake className="size-4" />}
        >
          Apoiadores
        </AdminTabButton>
        <AdminTabButton
          active={tab === "participantes"}
          onClick={() => setTab("participantes")}
          icon={<UserCheck className="size-4" />}
        >
          Participantes
        </AdminTabButton>
        <AdminTabButton
          active={tab === "usuarios"}
          onClick={() => setTab("usuarios")}
          icon={<Users className="size-4" />}
        >
          Usuários
        </AdminTabButton>
      </nav>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          {notice}
        </div>
      )}

      {data && (
        <main className="mt-6">
          {tab === "dashboard" && (
            <Dashboard
              data={data}
              actionLoading={actionLoading}
              onTogglePropaganda={handleTogglePropaganda}
            />
          )}
          {tab === "jogos" && <JogosOficiais getAccessToken={getAccessToken} navigate={navigate} />}
          {tab === "apoiadores" && (
            <Apoiadores
              data={data}
              actionLoading={actionLoading}
              onTogglePropaganda={handleTogglePropaganda}
              onSetValorApoio={(valor) =>
                runAdminAction("apoio-valor", async (token) => {
                  await setValorApoioPixFn({ data: { accessToken: token, valor } });
                  return `Valor de apoio atualizado para ${formatMoney(valor)}.`;
                })
              }
            />
          )}
          {tab === "participantes" && <Participantes data={data} />}
          {tab === "usuarios" && (
            <Usuarios
              data={data}
              actionLoading={actionLoading}
              onEditName={handleEditName}
              onChangePassword={handleChangePassword}
              onPromote={handlePromote}
              onDeleteAccount={handleDeleteAccount}
            />
          )}
        </main>
      )}
    </AdminShell>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-5 pb-24 text-foreground md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </div>
  );
}

function AdminTabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-2xl px-3 text-sm font-semibold transition flex items-center justify-center gap-2 md:px-4 ${
        active
          ? "bg-primary text-primary-foreground"
          : "glass text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function EspacoApoiadorToggle({
  visivel,
  loading,
  onToggle,
  compact,
}: {
  visivel: boolean;
  loading: boolean;
  onToggle: (visivel: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-border/70 bg-surface/40 p-4 ${
        compact ? "" : "sm:flex-row sm:items-center sm:justify-between"
      }`}
    >
      <div>
        <div className="font-semibold">Espaço do apoiador (rodapé)</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {visivel
            ? "O card fixo no rodapé do app está visível para todos os usuários."
            : "O card some e aparece só o rodapé © Palpite Gol. Atualiza em até 30 segundos."}
        </div>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => onToggle(!visivel)}
        className={`h-10 rounded-xl px-4 text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 ${
          visivel
            ? "bg-primary text-primary-foreground"
            : "glass text-muted-foreground hover:text-foreground"
        }`}
      >
        {loading ? "..." : visivel ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        {loading ? "Salvando..." : visivel ? "Ocultar card" : "Mostrar card"}
      </button>
    </div>
  );
}

function Dashboard({
  data,
  actionLoading,
  onTogglePropaganda,
}: {
  data: SuperAdminPanelData;
  actionLoading: string | null;
  onTogglePropaganda: (visivel: boolean) => void;
}) {
  const toggleLoading = actionLoading === "propaganda-toggle";

  return (
    <div className="space-y-6">
      <Panel title="Rodapé do app">
        <EspacoApoiadorToggle
          visivel={data.propagandaRodapeVisivel}
          loading={toggleLoading}
          onToggle={onTogglePropaganda}
        />
      </Panel>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Usuários" value={data.stats.usuarios} />
        <StatCard label="Campeonatos oficiais" value={data.stats.campeonatosOficiais} />
        <StatCard label="Jogos oficiais" value={data.stats.jogosOficiais} />
        <StatCard label="Bolões" value={data.stats.boloes} />
        <StatCard label="Participantes" value={data.stats.participantes} />
        <StatCard label="Apoiadores" value={data.stats.apoiadores} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Próximos jogos oficiais">
          <CompactList
            empty="Nenhum jogo oficial encontrado."
            items={data.jogosOficiais.slice(0, 5).map((jogo) => ({
              title: `${jogo.casa} × ${jogo.fora}`,
              subtitle: `${jogo.campeonato} · ${formatDate(jogo.data)}`,
              chip: jogo.status,
            }))}
          />
        </Panel>
        <Panel title="Usuários recentes">
          <CompactList
            empty="Nenhum usuário encontrado."
            items={data.usuarios.slice(0, 5).map((usuario) => ({
              title: displaySystemUserName(usuario),
              subtitle: `${displaySystemUserEmail(usuario)} · ${displaySystemUserSubtitle(usuario)}`,
              chip: getUserRoleLabel(usuario),
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}

type JogosOficiaisProps = {
  getAccessToken: () => string | null;
  navigate: ReturnType<typeof useNavigate>;
};

function JogosOficiais({ getAccessToken, navigate }: JogosOficiaisProps) {
  const getStatusMapFn = useServerFn(getOfficialCatalogStatusMap);
  const setStatusFn = useServerFn(setOfficialCatalogMatchStatus);
  const [hidePassed, setHidePassed] = useState(false);
  const [statusByMatchId, setStatusByMatchId] = useState<Record<string, string>>({});
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function loadStatuses() {
      try {
        const token = getAccessToken();
        const map = await getStatusMapFn({ data: { accessToken: token ?? undefined } });
        if (!cancelled) setStatusByMatchId(map);
      } catch (err) {
        if (!cancelled) {
          setStatusError(err instanceof Error ? err.message : "Erro ao carregar status oficial");
        }
      }
    }
    void loadStatuses();
    return () => {
      cancelled = true;
    };
  }, [getStatusMapFn, getAccessToken]);

  const toggleEncerrado = async (match: OfficialCatalogMatch) => {
    const token = getAccessToken();
    if (!token) {
      setStatusError("Sessão inválida. Faça login novamente.");
      return;
    }
    const current = statusByMatchId[match.id] ?? "agendado";
    const nextStatus = current === "encerrado" ? "agendado" : "encerrado";
    setSavingMatchId(match.id);
    setStatusError(null);
    try {
      await setStatusFn({
        data: {
          accessToken: token,
          timeCasa: match.timeCasa,
          timeFora: match.timeFora,
          dataPartida: match.dataPartida,
          status: nextStatus,
        },
      });
      setStatusByMatchId((currentMap) => ({ ...currentMap, [match.id]: nextStatus }));
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Erro ao atualizar status da partida");
    } finally {
      setSavingMatchId(null);
    }
  };

  const now = Date.now();
  const visibleMatches = hidePassed
    ? WORLD_CUP_2026_CATALOG.filter((m) => {
        const isManualClosed = (statusByMatchId[m.id] ?? "agendado") === "encerrado";
        const hasPassed = new Date(m.dataPartida).getTime() < now;
        return !isManualClosed && !hasPassed;
      })
    : WORLD_CUP_2026_CATALOG;
  const availableDays = [
    ...new Set(visibleMatches.map((m) => toLocalDayKey(m.dataPartida))),
  ].sort();

  useEffect(() => {
    if (selectedDayKey !== "all" && !availableDays.includes(selectedDayKey)) {
      setSelectedDayKey("all");
    }
    if (selectedDayKey === "all" && availableDays.length > 0) {
      const todayKey = toLocalDayKey(new Date());
      if (availableDays.includes(todayKey)) {
        setSelectedDayKey(todayKey);
      }
    }
  }, [availableDays, selectedDayKey]);

  const matchesForDay =
    selectedDayKey === "all"
      ? visibleMatches
      : visibleMatches.filter((m) => toLocalDayKey(m.dataPartida) === selectedDayKey);

  const grupos = groupCatalogByGrupo(matchesForDay);

  return (
    <div className="space-y-6">
      {statusError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {statusError}
        </div>
      )}
      <Panel title="Catálogo oficial — Copa do Mundo 2026">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use este catálogo para escolher o jogo oficial do bolão. O botão de encerrar marca a
            partida como encerrada no painel (sem apagar jogo ou bolão).
          </p>
          <label className="inline-flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={hidePassed}
              onChange={(e) => setHidePassed(e.target.checked)}
            />
            Ocultar jogos que já passaram
          </label>
        </div>
      </Panel>

      <Panel title="Partidas do catálogo">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedDayKey("all")}
            className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${
              selectedDayKey === "all"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background/40 text-foreground"
            }`}
          >
            Todas as datas
          </button>
          {availableDays.map((dayKey) => (
            <button
              key={dayKey}
              type="button"
              onClick={() => setSelectedDayKey(dayKey)}
              className={`h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition ${
                selectedDayKey === dayKey
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background/40 text-foreground"
              }`}
            >
              {formatDayLabel(dayKey)}
            </button>
          ))}
        </div>

        {grupos.length === 0 ? (
          <div className="rounded-2xl bg-surface/50 p-5 text-center text-sm text-muted-foreground">
            Nenhuma partida para exibir com o filtro atual.
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map((grupo, index) => (
              <div key={`${grupo.grupo}-${index}`} className="space-y-2">
                <h3 className="px-1 text-xs font-bold uppercase tracking-wide text-gold">
                  [{grupo.grupo}]
                </h3>
                {grupo.jogos.map((match) => (
                  <div
                    key={match.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate({
                        to: "/create",
                        search: { aba: "bolao", passo: 1, catalogMatchId: match.id },
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate({
                          to: "/create",
                          search: { aba: "bolao", passo: 1, catalogMatchId: match.id },
                        });
                      }
                    }}
                    className="rounded-2xl border border-border/70 bg-surface/40 p-3 sm:p-4 cursor-pointer hover:border-primary/40"
                  >
                    {(() => {
                      const isManualClosed =
                        (statusByMatchId[match.id] ?? "agendado") === "encerrado";
                      const hasPassed = new Date(match.dataPartida).getTime() < now;
                      const isClosed = isManualClosed || hasPassed;
                      return (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <TeamFlag
                                code={teamNameToCode(match.timeCasa)}
                                teamName={match.timeCasa}
                                size="sm"
                              />
                              <div className="text-sm font-semibold truncate">
                                {match.timeCasa} × {match.timeFora}
                              </div>
                              <TeamFlag
                                code={teamNameToCode(match.timeFora)}
                                teamName={match.timeFora}
                                size="sm"
                              />
                              {isClosed && (
                                <span className="chip text-[10px] border-red-400/30 text-red-400">
                                  Encerrado
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(match.dataPartida)}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate({
                                  to: "/create",
                                  search: { aba: "bolao", passo: 1, catalogMatchId: match.id },
                                });
                              }}
                              className="h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition"
                            >
                              Usar este jogo para o bolão
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void toggleEncerrado(match);
                              }}
                              disabled={savingMatchId === match.id}
                              className={`h-9 rounded-xl px-3 text-xs font-semibold transition ${
                                isManualClosed
                                  ? "border border-primary/40 bg-primary/10 text-primary"
                                  : "border border-border bg-background/40 text-foreground hover:bg-surface-2"
                              }`}
                            >
                              {savingMatchId === match.id
                                ? "Salvando..."
                                : isManualClosed
                                  ? "Reabrir no painel"
                                  : "Marcar encerrado"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Participantes({ data }: { data: SuperAdminPanelData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Participantes hoje" value={data.participantesStats.hoje} />
        <StatCard label="Participantes no mês" value={data.participantesStats.mes} />
        <StatCard label="Total de participantes" value={data.participantesStats.total} />
      </div>

      <Panel title="Participantes">
        <CompactList
          empty="Nenhum participante encontrado."
          items={data.participantes.map((participante) => ({
            title: participante.nome,
            subtitle: [
              participante.cidade || "Sem cidade",
              participante.bolao_slug ? `Bolão ${participante.bolao_slug}` : "Bolão não informado",
              formatDate(participante.created_at),
            ].join(" · "),
            chip: formatParticipantStatus(participante.status),
          }))}
        />
      </Panel>
    </div>
  );
}

function Apoiadores({
  data,
  actionLoading,
  onTogglePropaganda,
  onSetValorApoio,
}: {
  data: SuperAdminPanelData;
  actionLoading: string | null;
  onTogglePropaganda: (visivel: boolean) => void;
  onSetValorApoio: (valor: number) => void;
}) {
  const visivel = data.propagandaRodapeVisivel;
  const toggleLoading = actionLoading === "propaganda-toggle";
  const valorLoading = actionLoading === "apoio-valor";
  const [valorInput, setValorInput] = useState(() => String(data.valorApoioPix).replace(".", ","));

  useEffect(() => {
    setValorInput(String(data.valorApoioPix).replace(".", ","));
  }, [data.valorApoioPix]);

  const salvarValor = () => {
    const parsed = Number(valorInput.replace(/\./g, "").replace(",", ".").trim());
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 9999) return;
    onSetValorApoio(Number(parsed.toFixed(2)));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MoneyStatCard label="Arrecadado hoje" value={data.apoiadoresStats.hoje} />
        <MoneyStatCard label="Arrecadado no mês" value={data.apoiadoresStats.mes} />
        <MoneyStatCard label="Arrecadado no ano" value={data.apoiadoresStats.ano} />
        <MoneyStatCard label="Total arrecadado" value={data.apoiadoresStats.total} />
      </div>

      <Panel title="Espaço do apoiador no rodapé">
        <EspacoApoiadorToggle
          visivel={visivel}
          loading={toggleLoading}
          onToggle={onTogglePropaganda}
        />
      </Panel>

      <Panel title="Valor padrão do apoio Pix">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Este valor será usado na tela de apoio para todos os usuários.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={valorInput}
              onChange={(event) => setValorInput(event.target.value)}
              inputMode="decimal"
              placeholder="Ex: 2,00"
              className="h-10 rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/40"
            />
            <button
              type="button"
              disabled={valorLoading}
              onClick={salvarValor}
              className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {valorLoading ? "Salvando..." : "Salvar valor"}
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Apoiadores">
        <CompactList
          empty="Nenhum apoiador encontrado."
          items={data.apoiadores.map((apoiador) => ({
            title: apoiador.nome,
            subtitle: `${apoiador.cidade || "Sem cidade"} · ${apoiador.mensagem || "Sem mensagem"} · ${formatDate(apoiador.created_at)}`,
            chip:
              apoiador.valor != null
                ? formatMoney(Number(apoiador.valor))
                : apoiador.status || "Apoio",
          }))}
        />
      </Panel>
    </div>
  );
}

function Usuarios({
  data,
  actionLoading,
  onEditName,
  onChangePassword,
  onPromote,
  onDeleteAccount,
}: {
  data: SuperAdminPanelData;
  actionLoading: string | null;
  onEditName: (admin: SuperAdminPanelData["usuarios"][number]) => void;
  onChangePassword: (admin: SuperAdminPanelData["usuarios"][number]) => void;
  onPromote: (admin: SuperAdminPanelData["usuarios"][number]) => void;
  onDeleteAccount: (admin: SuperAdminPanelData["usuarios"][number]) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredUsers = data.usuarios.filter((usuario) => matchesUserSearch(usuario, search));

  return (
    <Panel title="Usuários do sistema">
      {data.usuarios.length === 0 ? (
        <div className="rounded-2xl bg-surface/50 p-5 text-center text-sm text-muted-foreground">
          Nenhum usuário encontrado. Rode docs/supabase/super-admin-list-users.sql no Supabase e
          confirme que você está logado como Super ADM.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="h-11 w-full rounded-2xl border border-border/70 bg-surface/40 pl-10 pr-4 text-sm outline-none transition focus:border-primary/40"
              />
            </div>
            <div className="text-xs text-muted-foreground sm:shrink-0">
              {filteredUsers.length} de {data.usuarios.length} usuário
              {data.usuarios.length === 1 ? "" : "s"}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="rounded-2xl bg-surface/50 p-5 text-center text-sm text-muted-foreground">
              Nenhum usuário encontrado para &quot;{search.trim()}&quot;.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((usuario) => {
                const label = displaySystemUserName(usuario);
                return (
                  <div
                    key={usuario.id}
                    className="rounded-2xl border border-border/70 bg-surface/40 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold">{label}</div>
                          <UserRoleBadge user={usuario} />
                        </div>
                        <div className="mt-1 text-sm text-foreground/90 break-all">
                          {displaySystemUserEmail(usuario)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {displaySystemUserSubtitle(usuario)}
                        </div>
                        {usuario.boloes_count > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="chip text-[10px]">
                              {usuario.boloes_count} bolão{usuario.boloes_count === 1 ? "" : "ões"}{" "}
                              criado{usuario.boloes_count === 1 ? "" : "s"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end lg:max-w-xl">
                        <AdminActionButton
                          loading={actionLoading === `name-${usuario.id}`}
                          onClick={() => onEditName(usuario)}
                        >
                          <Pencil className="size-3.5" /> Nome
                        </AdminActionButton>
                        <AdminActionButton
                          loading={actionLoading === `password-${usuario.id}`}
                          onClick={() => onChangePassword(usuario)}
                        >
                          <KeyRound className="size-3.5" /> Senha
                        </AdminActionButton>
                        {!usuario.is_super_admin && (
                          <AdminActionButton
                            loading={actionLoading === `promote-${usuario.id}`}
                            onClick={() => onPromote(usuario)}
                          >
                            <ShieldPlus className="size-3.5" /> Super ADM
                          </AdminActionButton>
                        )}
                        <AdminActionButton
                          danger
                          loading={actionLoading === `delete-${usuario.id}`}
                          onClick={() => onDeleteAccount(usuario)}
                        >
                          <Trash2 className="size-3.5" /> Excluir
                        </AdminActionButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function AdminActionButton({
  children,
  loading,
  danger,
  onClick,
}: {
  children: ReactNode;
  loading: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`h-9 rounded-xl px-3 text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 ${
        danger
          ? "border border-red-400/30 bg-red-500/10 text-red-400 hover:bg-red-500/15"
          : "border border-border bg-background/40 text-foreground hover:bg-surface-2"
      }`}
    >
      {loading ? "..." : children}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function MoneyStatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-3xl p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold tabular-nums md:text-3xl">
        {formatMoney(value)}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass rounded-3xl p-4 md:p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CompactList({
  items,
  empty,
}: {
  items: Array<{ title: string; subtitle: string; chip: string }>;
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-surface/50 p-5 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70">
      {items.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{item.title}</div>
            <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>
          </div>
          <span className="chip w-fit shrink-0 text-[10px]">{item.chip}</span>
        </div>
      ))}
    </div>
  );
}
