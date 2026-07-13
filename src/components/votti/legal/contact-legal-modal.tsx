import { useId, useState, type FormEvent } from "react";
import { submitToFormSubmit } from "@/lib/votti/formsubmit";
import { LegalModalShell } from "@/components/votti/legal/legal-modal-shell";

type ContactLegalModalProps = {
  onClose: () => void;
};

export function ContactLegalModal({ onClose }: ContactLegalModalProps) {
  const formId = useId();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await submitToFormSubmit({
        _subject: "Contato enviado pelo VOTTII",
        _captcha: "false",
        _template: "table",
        nome: String(data.get("nome") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        assunto: String(data.get("assunto") ?? "").trim(),
        mensagem: String(data.get("mensagem") ?? "").trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LegalModalShell
      title="Contato"
      onClose={onClose}
      panelClassName="votti-legal-modal__panel--form"
      footer={
        submitted ? (
          <button type="button" className="votti-legal-modal__ok" onClick={onClose}>
            Fechar
          </button>
        ) : (
          <>
            <button
              type="submit"
              form={formId}
              className="votti-legal-modal__action"
              disabled={submitting}
            >
              {submitting ? "Enviando…" : "Enviar mensagem"}
            </button>
            <button type="button" className="votti-legal-modal__ok" onClick={onClose}>
              Fechar
            </button>
          </>
        )
      }
    >
      {submitted ? (
        <p className="votti-legal-modal__text votti-legal-modal__success">
          Sua mensagem foi enviada com sucesso.
        </p>
      ) : (
        <form id={formId} className="votti-legal-modal__form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="votti-field">
            <span className="votti-field__label">Nome</span>
            <input
              className="votti-field__input"
              type="text"
              name="nome"
              required
              autoComplete="name"
            />
          </label>

          <label className="votti-field">
            <span className="votti-field__label">E-mail</span>
            <input
              className="votti-field__input"
              type="email"
              name="email"
              required
              autoComplete="email"
            />
          </label>

          <label className="votti-field">
            <span className="votti-field__label">Assunto</span>
            <input className="votti-field__input" type="text" name="assunto" required />
          </label>

          <label className="votti-field">
            <span className="votti-field__label">Mensagem</span>
            <textarea
              className="votti-field__textarea"
              name="mensagem"
              rows={4}
              required
            />
          </label>

          {error ? <p className="votti-legal-modal__error">{error}</p> : null}
        </form>
      )}
    </LegalModalShell>
  );
}
