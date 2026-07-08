import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { AppTopBar } from "@/components/app/app-top-bar";
import { AuthButton } from "@/components/votti/auth/auth-screen";
import { mapAuthError } from "@/lib/auth/auth-errors";
import { useAuth } from "@/lib/auth/use-auth";
import { VOTTI_INSTITUTIONAL_URL } from "@/lib/votti/brand";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({ meta: [{ title: "VOTTI — Minha conta" }] }),
  component: MinhaContaPage,
});

function MinhaContaPage() {
  const navigate = useNavigate();
  const {
    user,
    loading,
    updateProfileName,
    updateEmail,
    updatePassword,
    deleteAccount,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: "/minha-conta" }, replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  if (loading || !user) {
    return (
      <AppShell feed={false}>
        <div className="votti-app-page flex-1 flex items-center justify-center">
          <p className="votti-app-muted">Carregando…</p>
        </div>
      </AppShell>
    );
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameError("");
    setNameMsg("");
    setNameBusy(true);
    try {
      await updateProfileName(name);
      setNameMsg("Nome atualizado.");
    } catch (err) {
      setNameError(err instanceof Error ? mapAuthError(err.message) : "Não foi possível alterar o nome.");
    } finally {
      setNameBusy(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailMsg("");
    setEmailBusy(true);
    try {
      await updateEmail(email);
      setEmailMsg("Confirme o novo e-mail pelo link enviado na sua caixa de entrada.");
    } catch (err) {
      setEmailError(err instanceof Error ? mapAuthError(err.message) : "Não foi possível alterar o e-mail.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");
    setPasswordBusy(true);
    try {
      await updatePassword(newPassword);
      setPasswordMsg("Senha alterada com sucesso.");
      setNewPassword("");
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? mapAuthError(err.message) : "Não foi possível alterar a senha.",
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleGoogleLink() {
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setEmailError(
        err instanceof Error ? mapAuthError(err.message) : "Não foi possível conectar com Google.",
      );
      setGoogleBusy(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError("");
    setDeleteBusy(true);
    try {
      await deleteAccount();
      navigate({ to: "/", replace: true });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? mapAuthError(err.message) : "Não foi possível excluir a conta.",
      );
      setDeleteBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  return (
    <AppShell feed={false}>
      <div className="votti-app-page flex-1 px-5 pb-10 max-w-lg mx-auto w-full">
        <AppTopBar back="/" title="Minha conta" />

        <div className="votti-account animate-rise">
          <section className="votti-account__section">
            <h2 className="votti-account__heading">Perfil</h2>
            <form className="votti-account__form" onSubmit={(e) => void handleNameSubmit(e)}>
              <label className="votti-field">
                <span className="votti-field__label">Nome</span>
                <input
                  className="votti-field__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
              {nameError ? <p className="votti-auth__error">{nameError}</p> : null}
              {nameMsg ? <p className="votti-auth__success">{nameMsg}</p> : null}
              <button type="submit" className="votti-outline-btn w-full" disabled={nameBusy}>
                {nameBusy ? <Loader2 className="size-4 animate-spin" /> : "Salvar nome"}
              </button>
            </form>
          </section>

          <section className="votti-account__section">
            <h2 className="votti-account__heading">E-mail</h2>
            <form className="votti-account__form" onSubmit={(e) => void handleEmailSubmit(e)}>
              <label className="votti-field">
                <span className="votti-field__label">E-mail</span>
                <input
                  type="email"
                  className="votti-field__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              {emailError ? <p className="votti-auth__error">{emailError}</p> : null}
              {emailMsg ? <p className="votti-auth__success">{emailMsg}</p> : null}
              <button type="submit" className="votti-outline-btn w-full" disabled={emailBusy}>
                {emailBusy ? <Loader2 className="size-4 animate-spin" /> : "Salvar e-mail"}
              </button>
            </form>
          </section>

          <section className="votti-account__section">
            <h2 className="votti-account__heading">Segurança</h2>
            {!showPasswordForm ? (
              <button
                type="button"
                className="votti-outline-btn w-full"
                onClick={() => {
                  setShowPasswordForm(true);
                  setPasswordError("");
                  setPasswordMsg("");
                }}
              >
                Alterar senha
              </button>
            ) : (
              <form className="votti-account__form" onSubmit={(e) => void handlePasswordSubmit(e)}>
                <label className="votti-field">
                  <span className="votti-field__label">Nova senha</span>
                  <input
                    type="password"
                    className="votti-field__input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </label>
                {passwordError ? <p className="votti-auth__error">{passwordError}</p> : null}
                {passwordMsg ? <p className="votti-auth__success">{passwordMsg}</p> : null}
                <div className="votti-account__form-actions">
                  <button
                    type="button"
                    className="votti-outline-btn"
                    disabled={passwordBusy}
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword("");
                      setPasswordError("");
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="votti-mega-btn votti-mega-btn--sm" disabled={passwordBusy}>
                    {passwordBusy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Salvando…
                      </>
                    ) : (
                      "Salvar senha"
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="votti-account__section">
            <h2 className="votti-account__heading">Google</h2>
            <AuthButton variant="google" disabled={googleBusy} onClick={() => void handleGoogleLink()}>
              {googleBusy ? "Conectando…" : "Continuar com Google"}
            </AuthButton>
            <p className="votti-account__hint">Use para entrar ou vincular sua conta Google.</p>
          </section>

          <section className="votti-account__section">
            <h2 className="votti-account__heading">Zona de perigo</h2>
            {!confirmDelete ? (
              <button
                type="button"
                className="votti-outline-btn votti-outline-btn--danger w-full"
                onClick={() => {
                  setConfirmDelete(true);
                  setDeleteError("");
                }}
              >
                Excluir minha conta
              </button>
            ) : (
              <div className="votti-account__confirm">
                <p className="votti-account__confirm-text">
                  Tem certeza? Suas votações serão apagadas e esta ação não pode ser desfeita.
                </p>
                {deleteError ? <p className="votti-auth__error">{deleteError}</p> : null}
                <div className="votti-account__form-actions">
                  <button
                    type="button"
                    className="votti-outline-btn"
                    disabled={deleteBusy}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="votti-outline-btn votti-outline-btn--danger"
                    disabled={deleteBusy}
                    onClick={() => void handleDeleteAccount()}
                  >
                    {deleteBusy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Excluindo…
                      </>
                    ) : (
                      "Confirmar exclusão"
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="votti-account__section votti-account__section--footer">
            <a
              href={VOTTI_INSTITUTIONAL_URL}
              target="_blank"
              rel="noreferrer"
              className="votti-outline-btn w-full"
            >
              <ExternalLink className="size-4" /> Saiba mais
            </a>
            <button type="button" className="votti-link-btn w-full mt-3" onClick={() => void handleSignOut()}>
              Sair da conta
            </button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
