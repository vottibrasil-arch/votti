import { VOTTI_CONTACT_EMAIL } from "@/lib/votti/legal-emails";
import { LegalModalShell } from "@/components/votti/legal/legal-modal-shell";

type ContactLegalModalProps = {
  onClose: () => void;
};

export function ContactLegalModal({ onClose }: ContactLegalModalProps) {
  const mailto = `mailto:${VOTTI_CONTACT_EMAIL}`;

  return (
    <LegalModalShell
      title="Contato"
      onClose={onClose}
      footer={
        <a href={mailto} className="votti-legal-modal__action">
          Enviar e-mail
        </a>
      }
    >
      <p className="votti-legal-modal__text">Para dúvidas, sugestões ou suporte:</p>
      <a href={mailto} className="votti-legal-modal__email">
        {VOTTI_CONTACT_EMAIL}
      </a>
    </LegalModalShell>
  );
}
