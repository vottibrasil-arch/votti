import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, AUTH_NOT_CONFIGURED_MSG } from "@/lib/auth/use-auth";
import { mapAuthError } from "@/lib/auth/auth-errors";
import { navigateAfterAuth, sanitizeRedirect } from "@/lib/auth/redirect";
import {
  AuthButton,
  AuthDivider,
  AuthField,
  AuthInput,
  AuthScreen,
} from "@/components/votti/auth/auth-screen";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "VOTTII — Entrar" },
      {
        name: "description",
        content: "Entre no VOTTII — o sistema de votação mais seguro do Brasil.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading, signIn, signInWithGoogle, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigateAfterAuth(navigate, redirect);
  }, [loading, user, navigate, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!configured) {
      setError(AUTH_NOT_CONFIGURED_MSG);
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigateAfterAuth(navigate, redirect);
    } catch (err) {
      setError(err instanceof Error ? mapAuthError(err.message) : "Não foi possível entrar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError("");
    if (!configured) {
      setError(AUTH_NOT_CONFIGURED_MSG);
      return;
    }
    setSubmitting(true);
    try {
      await signInWithGoogle(redirect);
      if (!loading) navigateAfterAuth(navigate, redirect);
    } catch (err) {
      setError(err instanceof Error ? mapAuthError(err.message) : "Erro ao entrar com Google");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen
      title="Entre para continuar"
      footer={
        <p className="votti-auth__switch">
          <Link
            to="/cadastro"
            search={sanitizeRedirect(redirect) === "/" ? {} : { redirect: sanitizeRedirect(redirect) }}
          >
            Criar minha conta
          </Link>
        </p>
      }
    >
      <form className="votti-auth__form" onSubmit={handleSubmit}>
        {!configured ? (
          <p className="votti-auth__notice">
            Supabase não detectado no front-end. Login e cadastro só funcionam com conta real no banco.
            Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no{" "}
            <code>.env</code> e reinicie o servidor.
          </p>
        ) : null}
        <AuthField label="E-mail">
          <AuthInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </AuthField>
        <AuthField label="Senha">
          <AuthInput
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </AuthField>
        {error ? <p className="votti-auth__error">{error}</p> : null}
        <AuthButton type="submit" disabled={submitting}>
          {submitting ? "Entrando…" : "Entrar"}
        </AuthButton>
      </form>

      <AuthDivider />

      <AuthButton variant="google" onClick={() => void handleGoogle()} disabled={submitting}>
        Entrar com Google
      </AuthButton>
    </AuthScreen>
  );
}
