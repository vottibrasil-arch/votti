import { useId, useState, type FormEvent } from "react";
import { submitToFormSubmit } from "@/lib/votti/formsubmit";
import { LegalModalShell } from "@/components/votti/legal/legal-modal-shell";

type ReportLegalModalProps = {
  pollUrl?: string;
  onClose: () => void;
};

export function ReportLegalModal({ pollUrl, onClose }: ReportLegalModalProps) {
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
        _subject: "Denúncia recebida pelo VOTTII",
        _captcha: "false",
        _template: "table",
        link_votacao: String(data.get("link_votacao") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        motivo: String(data.get("motivo") ?? "").trim(),
        descricao: String(data.get("descricao") ?? "").trim(),
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
      title="Denunciar conteúdo"
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
              {submitting ? "Enviando…" : "Enviar denúncia"}
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
          Nossa equipe analisará a denúncia e poderá remover conteúdos que violem os Termos de Uso e
          a Política de Privacidade do VOTTII.
        </p>
      ) : (
        <form id={formId} className="votti-legal-modal__form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="votti-field">
            <span className="votti-field__label">Link da votação</span>
            <input
              className="votti-field__input"
              type="url"
              name="link_votacao"
              defaultValue={pollUrl ?? ""}
              placeholder="https://vottii.com/v/..."
              required
            />
          </label>

          <label className="votti-field">
            <span className="votti-field__label">E-mail para contato (opcional)</span>
            <input
              className="votti-field__input"
              type="email"
              name="email"
              autoComplete="email"
            />
          </label>

          <label className="votti-field">
            <span className="votti-field__label">Motivo da denúncia</span>
            <input className="votti-field__input" type="text" name="motivo" required />
          </label>

          <label className="votti-field">
            <span className="votti-field__label">Descrição da denúncia</span>
            <textarea
              className="votti-field__textarea"
              name="descricao"
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
