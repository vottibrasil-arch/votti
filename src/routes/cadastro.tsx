import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, AUTH_NOT_CONFIGURED_MSG } from "@/lib/auth/use-auth";
import {
  AUTH_EMAIL_ALREADY_EXISTS_MSG,
  AUTH_EMAIL_ALREADY_EXISTS_UNCONFIRMED_MSG,
  AUTH_PROJECT_MISMATCH_MSG,
  isDuplicateSignupMessage,
  mapAuthError,
  resolveSignupConflictMessage,
} from "@/lib/auth/auth-errors";
import { getSupabaseProjectInfo, lookupAuthEmail } from "@/lib/auth/auth-signup.server";
import { navigateAfterAuth, sanitizeRedirect } from "@/lib/auth/redirect";
import {
  getWrongSupabaseProjectMessage,
  VOTTI_SUPABASE_PROJECT_REF,
} from "@/lib/votti/supabase-project";
import { isSupabaseBrowserConfigured } from "@/lib/api/supabase-browser";
import {
  AuthButton,
  AuthDivider,
  AuthField,
  AuthInput,
  AuthScreen,
} from "@/components/votti/auth/auth-screen";

type CadastroSearch = { redirect?: string };

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>): CadastroSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "VOTTI — Criar conta" },
      {
        name: "description",
        content: "Crie sua conta no VOTTI — o sistema de votação mais seguro do Brasil.",
      },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading, signUp, signInWithGoogle, configured } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverProjectRef, setServerProjectRef] = useState<string | undefined>();
  const serverOk = !serverProjectRef || serverProjectRef === VOTTI_SUPABASE_PROJECT_REF;

  useEffect(() => {
    void getSupabaseProjectInfo().then((info) => {
      setServerProjectRef(info.projectRef);
    });
  }, []);

  useEffect(() => {
    if (!loading && user) navigateAfterAuth(navigate, redirect);
  }, [loading, user, navigate, redirect]);

  async function handleGoogle() {
    setError("");
    setSuccess("");
    if (!configured) {
      setError(AUTH_NOT_CONFIGURED_MSG);
      return;
    }
    if (!serverOk) {
      setError(getWrongSupabaseProjectMessage(serverProjectRef));
      return;
    }
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? mapAuthError(err.message) : "Erro ao continuar com Google");
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!configured) {
      setError(AUTH_NOT_CONFIGURED_MSG);
      return;
    }
    if (!serverOk) {
      setError(getWrongSupabaseProjectMessage(serverProjectRef));
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setSubmitting(true);
    let lookup: Awaited<ReturnType<typeof lookupAuthEmail>> | null = null;
    try {
      const safeEmail = email.trim().toLowerCase();

      lookup = await lookupAuthEmail({ data: { email: safeEmail } });

      if (!lookup.vottiProject) {
        setError(getWrongSupabaseProjectMessage(lookup.projectRef));
        return;
      }

      if (lookup.envMismatch) {
        setError(AUTH_PROJECT_MISMATCH_MSG);
        return;
      }

      if (lookup.adminConfigured && !lookup.available) {
        setError(
          lookup.confirmed
            ? AUTH_EMAIL_ALREADY_EXISTS_MSG
            : AUTH_EMAIL_ALREADY_EXISTS_UNCONFIRMED_MSG,
        );
        return;
      }

      const result = await signUp(safeEmail, password, name.trim());

      if (result.duplicateSuspected) {
        setError(
          resolveSignupConflictMessage({
            adminConfigured: lookup.adminConfigured,
            emailAvailable: lookup.available,
            envMismatch: lookup.envMismatch,
          }),
        );
        return;
      }

      if (result.needsEmailConfirmation) {
        setSuccess(
          "Conta criada no Supabase! Enviamos um link de confirmação para seu e-mail. Só depois de confirmar você consegue entrar.",
        );
        return;
      }

      navigateAfterAuth(navigate, redirect);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "";
      if (isDuplicateSignupMessage(rawMessage)) {
        setError(
          resolveSignupConflictMessage({
            adminConfigured: lookup?.adminConfigured ?? false,
            emailAvailable: lookup?.available ?? true,
            envMismatch: lookup?.envMismatch,
          }),
        );
        return;
      }
      setError(rawMessage ? mapAuthError(rawMessage) : "Não foi possível criar a conta");
    } finally {
      setSubmitting(false);
    }
  }

  const loginSearch =
    sanitizeRedirect(redirect) === "/" ? {} : { redirect: sanitizeRedirect(redirect) };

  return (
    <AuthScreen
      title="Criar conta"
      footer={
        <p className="votti-auth__switch">
          <Link to="/login" search={loginSearch}>
            Já tenho conta
          </Link>
        </p>
      }
    >
      <AuthButton variant="google" onClick={() => void handleGoogle()} disabled={submitting || !serverOk}>
        Continuar com Google
      </AuthButton>

      <AuthDivider />

      <form className="votti-auth__form" onSubmit={handleSubmit}>
        {!configured ? (
          <p className="votti-auth__notice">
            Supabase não detectado no front-end. Configure o <code>.env</code> e reinicie o servidor.
          </p>
        ) : null}
        <AuthField label="Nome">
          <AuthInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </AuthField>
        <AuthField label="E-mail">
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </AuthField>
        <AuthField label="Senha">
          <AuthInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </AuthField>
        {error ? <p className="votti-auth__error">{error}</p> : null}
        {success ? <p className="votti-auth__success">{success}</p> : null}
        <AuthButton type="submit" disabled={submitting || !serverOk}>
          {submitting ? "Criando…" : "Criar conta"}
        </AuthButton>
      </form>
    </AuthScreen>
  );
}
