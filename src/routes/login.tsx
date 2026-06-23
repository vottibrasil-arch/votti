import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shell, TopBar, PrimaryButton } from "@/components/ui-kit";
import { FormField } from "@/components/bolao/form-primitives";
import { useAuth } from "@/lib/auth/use-auth";
import { checkSuperAdmin } from "@/lib/api/super-admin.server";
import { navigateAfterAuth } from "@/lib/auth/navigate-after-auth";
import { getSupabaseEnvStatus } from "@/lib/supabase-env";
import { LogIn, UserPlus } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/create",
    mode: search.mode === "signup" ? ("signup" as const) : ("login" as const),
  }),
  head: () => ({ meta: [{ title: "Entrar — Palpite Gol" }] }),
  component: Login,
});

function Login() {
  const { redirect, mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const checkSuperAdminFn = useServerFn(checkSuperAdmin);
  const { user, signIn, signUp, signInWithGoogle, signOut, loading, configured } = useAuth();
  const envStatus = getSupabaseEnvStatus();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);
  const SUPER_ADMIN_CHECK_TIMEOUT_MS = 1800;

  const navigateAfterPermissionCheck = async (fallbackRedirect: string) => {
    try {
      const { getSupabaseBrowser } = await import("@/lib/api/supabase-browser");
      const { data } = await getSupabaseBrowser().auth.getSession();
      const token = data.session?.access_token;

      if (token) {
        const result = await Promise.race([
          checkSuperAdminFn({ data: { accessToken: token } }),
          new Promise<{ isSuperAdmin: false }>((resolve) =>
            window.setTimeout(() => resolve({ isSuperAdmin: false }), SUPER_ADMIN_CHECK_TIMEOUT_MS),
          ),
        ]);
        if (result.isSuperAdmin) {
          navigate({ to: "/super-admin", replace: true });
          return;
        }
      }

      navigateAfterAuth(navigate, fallbackRedirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir o login");
    }
  };

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode]);

  const onGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const target = redirect.startsWith("/") ? redirect : "/create";
      await signInWithGoogle(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar com Google");
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        await signUp(email.trim(), password, name.trim() || undefined);
        setSignupDone(true);
      } else {
        await signIn(email.trim(), password);
        await navigateAfterPermissionCheck(redirect);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar");
    } finally {
      setSubmitting(false);
    }
  };

  if (!configured) {
    return (
      <Shell>
        <TopBar title="Entrar" useHistoryBack />
        <div className="glass rounded-2xl p-5 text-center animate-rise">
          <p className="text-sm text-muted-foreground">
            Supabase não configurado. Faltando:{" "}
            <code className="text-foreground">{envStatus.missing.join(", ") || "variáveis"}</code> no arquivo{" "}
            <code className="text-foreground">.env</code> na raiz do projeto.
          </p>
        </div>
      </Shell>
    );
  }

  if (signupDone) {
    return (
      <Shell>
        <TopBar title="Conta criada" useHistoryBack />
        <div className="text-center animate-rise space-y-4">
          <div className="text-5xl">✉️</div>
          <h1 className="font-display text-2xl font-bold">Confirme seu e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para <span className="text-foreground font-medium">{email}</span>.
            Depois de confirmar, volte e entre na sua conta.
          </p>
          <PrimaryButton onClick={() => { setSignupDone(false); setMode("login"); }} variant="primary">
            <LogIn className="size-5" /> Ir para o login
          </PrimaryButton>
        </div>
      </Shell>
    );
  }

  return (
    <Shell className="pb-24">
      <TopBar title={mode === "login" ? "Entrar" : "Criar conta"} useHistoryBack />

      <div className="animate-rise space-y-6">
        {!loading && user && (
          <div className="glass rounded-2xl p-4 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Você já está conectado como{" "}
              <span className="text-foreground font-medium">{user.email ?? "sua conta"}</span>.
            </p>
            <PrimaryButton
              type="button"
              variant="gold"
              className={submitting ? "opacity-70 pointer-events-none" : ""}
              onClick={() => void navigateAfterPermissionCheck(redirect)}
            >
              <LogIn className="size-5" /> Continuar
            </PrimaryButton>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => {
                  setEmail("");
                  setPassword("");
                  setError(null);
                });
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition"
            >
              Sair e entrar com outra conta
            </button>
          </div>
        )}

        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {mode === "login"
              ? "Entre para criar e administrar seus bolões."
              : "Cadastre-se para montar bolões reais na Copa 2026."}
          </p>
        </div>

        {!user && (
          <GoogleSignInButton
            onClick={onGoogle}
            loading={googleLoading}
            disabled={loading || submitting}
          />
        )}

        {!user && (
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <FormField label="Seu nome">
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
              required
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
              required
              minLength={6}
              className="w-full bg-transparent outline-none text-sm font-medium"
              placeholder="Mínimo 6 caracteres"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </FormField>

          {error && (
            <p className="text-sm text-red-400 text-center px-2">{error}</p>
          )}

          <PrimaryButton type="submit" variant="gold" className={submitting || loading || googleLoading ? "opacity-70 pointer-events-none" : ""}>
            {mode === "login" ? (
              <>
                <LogIn className="size-5" /> Entrar
              </>
            ) : (
              <>
                <UserPlus className="size-5" /> Criar conta
              </>
            )}
          </PrimaryButton>
            </form>

            <button
              type="button"
              onClick={() => {
                const next = mode === "login" ? "signup" : "login";
                navigate({ to: "/login", search: { redirect, mode: next === "signup" ? "signup" : undefined } });
              }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition"
            >
              {mode === "login" ? "Ainda não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
            </button>
          </>
        )}

        <Link to="/demonstracao" search={{ passo: 1 }} className="block text-center text-xs text-muted-foreground">
          Ver demonstração sem login
        </Link>
      </div>
    </Shell>
  );
}

function GoogleSignInButton({
  onClick,
  loading,
  disabled,
}: {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full h-12 rounded-2xl border border-border bg-surface/60 flex items-center justify-center gap-3 font-semibold text-sm transition active:scale-[0.98] hover:bg-surface disabled:opacity-60 disabled:pointer-events-none"
    >
      <GoogleIcon />
      {loading ? "Redirecionando..." : "Continuar com Google"}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.761 0 5.246 1.116 7.047 2.917l5.657-5.657C33.64 6.053 29.082 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c2.761 0 5.246 1.116 7.047 2.917l5.657-5.657C33.64 6.053 29.082 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
