import { VOTTI_REPORT_EMAIL } from "@/lib/votti/legal-emails";
import { LegalModalShell } from "@/components/votti/legal/legal-modal-shell";

type ReportLegalModalProps = {
  pollUrl?: string;
  onClose: () => void;
};

function buildReportMailto(pollUrl?: string) {
  const subject = encodeURIComponent("Denúncia de conteúdo no VOTTII");
  const linkLine = pollUrl ? `${pollUrl}\n` : "";
  const body = encodeURIComponent(`Link da votação:\n${linkLine}\nDescrição da denúncia:`);
  return `mailto:${VOTTI_REPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export function ReportLegalModal({ pollUrl, onClose }: ReportLegalModalProps) {
  const mailto = buildReportMailto(pollUrl);

  return (
    <LegalModalShell
      title="Denunciar conteúdo"
      onClose={onClose}
      footer={
        <a href={mailto} className="votti-legal-modal__action">
          Enviar denúncia por e-mail
        </a>
      }
    >
      <p className="votti-legal-modal__text">
        Caso encontre uma votação que viole os Termos de Uso do VOTTII, siga as instruções abaixo:
      </p>
      <ol className="votti-legal-modal__steps">
        <li>Copie o link da votação.</li>
        <li>Descreva detalhadamente o motivo da denúncia.</li>
        <li>
          Envie as informações para:{" "}
          <a href={mailto} className="votti-legal-modal__email">
            {VOTTI_REPORT_EMAIL}
          </a>
        </li>
      </ol>
    </LegalModalShell>
  );
}
