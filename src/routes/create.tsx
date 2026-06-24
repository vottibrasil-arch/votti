import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell, TopBar } from "@/components/ui-kit";
import { SignOutButton } from "@/components/auth-sign-out";
import { AppNavTabs, type AppTab, type CreateAba } from "@/components/app-nav-tabs";
import { CriarCampeonatoWizard, type ModoCriacao } from "@/components/criar-campeonato-wizard";
import { CriarBolaoWizard } from "@/components/criar-bolao-wizard";
import { FormField } from "@/components/bolao/form-primitives";
import { MeusDashboard } from "@/components/meus-dashboard";
import { CampeonatoJogosPanel } from "@/components/campeonato-jogos-panel";
import { useAuth } from "@/lib/auth/use-auth";
import { checkSuperAdmin } from "@/lib/api/super-admin.server";
import { resolveCreateTopBarBack } from "@/lib/create-topbar-back";
import { ArrowRight, Lock, LogIn, UserPlus, X } from "lucide-react";

export const Route = createFileRoute("/create")({
  validateSearch: (search: Record<string, unknown>) => {
    const abaRaw = search.aba;
    const aba: CreateAba =
      abaRaw === "criar" || abaRaw === "bolao" || abaRaw === "meus" || abaRaw === "campeonato"
        ? abaRaw
        : abaRaw === "gerenciar"
          ? "campeonato"
          : "bolao";
    const passoRaw = Number(search.passo);
    const passo = aba === "bolao" && passoRaw >= 1 && passoRaw <= 4 ? passoRaw : 1;
    const etapaRaw = Number(search.etapa);
    const etapa = aba === "criar" && etapaRaw >= 1 && etapaRaw <= 2 ? etapaRaw : 1;
    const modo: ModoCriacao = search.modo === "jogo-unico" ? "jogo-unico" : "campeonato";
    const campeonatoId = Number(search.campeonatoId);
    const partidaId = Number(search.partidaId);
    const catalogMatchIdRaw = search.catalogMatchId;
    const catalogMatchId =
      typeof catalogMatchIdRaw === "string" && catalogMatchIdRaw.trim().length > 0
        ? catalogMatchIdRaw.trim()
        : undefined;
    return {
      aba,
      passo: passo as 1 | 2 | 3 | 4,
      etapa: etapa as 1 | 2,
      modo,
      campeonatoId: campeonatoId > 0 ? campeonatoId : undefined,
      partidaId: partidaId > 0 ? partidaId : undefined,
      catalogMatchId,
    };
  },
  head: () => ({ meta: [{ title: "Palpite Gol — Campeonatos e Bolões" }] }),
  component: Create,
});

function BolaoStepDots({ passo }: { passo: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`h-1.5 rounded-full transition-all ${
            n === passo ? "w-8 bg-primary" : n < passo ? "w-4 bg-primary/50" : "w-4 bg-surface-2"
          }`}
        />
      ))}
    </div>
  );
}

function Create() {
  const { aba, passo, etapa, modo, campeonatoId, partidaId, catalogMatchId } = Route.useSearch();
  const navigate = useNavigate();
  const checkSuperAdminFn = useServerFn(checkSuperAdmin);
  const { user, loading, getAccessToken, signIn, signUp } = useAuth();
  const [checkingSuperAdmin, setCheckingSuperAdmin] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"signup" | "login">("signup");
  const pendingAuthResolveRef = useRef<((ok: boolean) => void) | null>(null);

  const closeAuthModal = useCallback((ok = false) => {
    setAuthModalOpen(false);
    const resolve = pendingAuthResolveRef.current;
    pendingAuthResolveRef.current = null;
    if (resolve) resolve(ok);
  }, []);

  const requestAuth = useCallback(
    async (mode: "signup" | "login" = "signup"): Promise<boolean> => {
      if (user) return true;
      setAuthModalMode(mode);
      setAuthModalOpen(true);
      return new Promise<boolean>((resolve) => {
        pendingAuthResolveRef.current = resolve;
      });
    },
    [user],
  );

  useEffect(() => {
    if (loading || user) return;
    if (aba === "meus") {
      void requestAuth("login");
    }
  }, [aba, loading, user, requestAuth]);

  useEffect(() => {
    if (loading || !user) {
      setCheckingSuperAdmin(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setCheckingSuperAdmin(false);
      return;
    }

    let cancelled = false;
    async function checkPermission() {
      setCheckingSuperAdmin(true);
      try {
        const result = await checkSuperAdminFn({ data: { accessToken: token } });
        const canOpenBolaoFromCatalog = aba === "bolao" && Boolean(catalogMatchId);
        if (!cancelled && result.isSuperAdmin && !canOpenBolaoFromCatalog) {
          navigate({ to: "/super-admin", replace: true });
          return;
        }
      } catch {
        // Se a checagem falhar, mantém o app comum funcionando.
      } finally {
        if (!cancelled) setCheckingSuperAdmin(false);
      }
    }

    void checkPermission();
    return () => {
      cancelled = true;
    };
  }, [loading, navigate, user?.id, aba, catalogMatchId]);

  useEffect(() => {
    if (aba === "campeonato" && !campeonatoId && !loading && user) {
      navigate({ to: "/create", search: { aba: "meus" } });
    }
  }, [aba, campeonatoId, loading, user, navigate]);

  if (loading || (Boolean(user) && checkingSuperAdmin)) {
    return (
      <Shell>
        <TopBar title="Palpite Gol" useHistoryBack />
        <p className="text-center text-sm text-muted-foreground">Carregando...</p>
      </Shell>
    );
  }

  const topBarBack = resolveCreateTopBarBack(
    aba,
    passo,
    etapa,
    modo,
    campeonatoId,
    partidaId,
    catalogMatchId,
  );
  const navActive: AppTab = aba === "campeonato" ? "meus" : aba;
  const campeonatoTitle =
    aba === "campeonato" && partidaId
      ? "Configurar bolão"
      : aba === "campeonato"
        ? "Jogos do campeonato"
        : "Palpite Gol";

  return (
    <Shell className="pb-32">
      <TopBar title={campeonatoTitle} right={user ? <SignOutButton compact /> : null} {...topBarBack} />
      {aba !== "campeonato" && <AppNavTabs active={navActive} />}
      {aba === "bolao" && <BolaoStepDots passo={passo} />}

      {aba === "meus" &&
        (user ? (
          <MeusDashboard />
        ) : (
          <section className="animate-rise space-y-4">
            <div className="glass rounded-2xl p-5 text-center space-y-2">
              <div className="mx-auto size-12 rounded-full bg-primary/15 grid place-items-center text-primary">
                <Lock className="size-5" />
              </div>
              <h2 className="font-display text-lg font-bold">Entre para acessar seus bolões</h2>
              <p className="text-sm text-muted-foreground">
                Seu histórico e seus campeonatos ficam protegidos na aba Meus.
              </p>
            </div>
          </section>
        ))}

      {aba === "criar" && (
        <CriarCampeonatoWizard
          etapa={etapa}
          modo={modo}
          onRequireAuth={(mode) => requestAuth(mode)}
        />
      )}

      {aba === "bolao" && (
        <CriarBolaoWizard
          passo={passo}
          prefillCatalogMatchId={catalogMatchId}
          onRequireAuth={(mode) => requestAuth(mode)}
        />
      )}

      {aba === "campeonato" && campeonatoId && (
        <CampeonatoJogosPanel campeonatoId={campeonatoId} partidaId={partidaId} />
      )}

      <AuthEntryModal
        open={authModalOpen}
        mode={authModalMode}
        onModeChange={setAuthModalMode}
        onClose={() => closeAuthModal(false)}
        onAuthenticated={() => closeAuthModal(true)}
        signIn={signIn}
        signUp={signUp}
      />
    </Shell>
  );
}

function AuthEntryModal({
  open,
  mode,
  onModeChange,
  onClose,
  onAuthenticated,
  signIn,
  signUp,
}: {
  open: boolean;
  mode: "signup" | "login";
  onModeChange: (mode: "signup" | "login") => void;
  onClose: () => void;
  onAuthenticated: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signup" && !name.trim()) {
        throw new Error("Informe seu nome para continuar.");
      }
      const safeEmail = email.trim();
      if (mode === "signup") {
        await signUp(safeEmail, password, name.trim() || undefined);
      }
      await signIn(safeEmail, password);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a autenticação.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm px-4 py-8 overflow-y-auto">
      <div className="mx-auto w-full max-w-md glass rounded-3xl border border-border p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold">Entre para criar seu bolão</h2>
            <p className="text-sm text-muted-foreground">
              Informe apenas seus dados para salvar seus bolões e gerar seu link exclusivo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-full border border-border bg-surface/50 grid place-items-center"
            aria-label="Fechar modal de autenticação"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <FormField label="Nome">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent outline-none text-sm font-medium"
                placeholder="Como seus amigos te chamam"
                autoComplete="name"
              />
            </FormField>
          )}

          <FormField label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-medium"
              placeholder="voce@email.com"
              autoComplete="email"
            />
          </FormField>

          <FormField label="Senha">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="w-full bg-transparent outline-none text-sm font-medium"
              placeholder="Mínimo 6 caracteres"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || !email.trim() || !password}
          className="w-full h-12 rounded-2xl font-display font-semibold text-base tracking-tight transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
          style={{ background: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
        >
          {mode === "signup" ? <UserPlus className="size-5" /> : <LogIn className="size-5" />}
          {submitting ? "Entrando..." : "Continuar"}
        </button>

        <button
          type="button"
          onClick={() => onModeChange(mode === "signup" ? "login" : "signup")}
          className="w-full text-center text-base font-bold text-primary inline-flex items-center justify-center gap-2"
        >
          {mode === "signup" ? "Já uso o Palpite Gol" : "Ainda não tenho conta"}
          <ArrowRight className="size-4" />
          {mode === "signup" ? "Entrar" : "Criar conta"}
        </button>
      </div>
    </div>
  );
}
