import type { LegalDocument } from "@/lib/votti/legal-content";
import { LegalModalShell } from "@/components/votti/legal/legal-modal-shell";

type DocumentLegalModalProps = {
  document: LegalDocument;
  onClose: () => void;
};

export function DocumentLegalModal({ document, onClose }: DocumentLegalModalProps) {
  return (
    <LegalModalShell title={document.title} onClose={onClose}>
      {document.updatedAt ? (
        <p className="votti-legal-modal__updated">Última atualização: {document.updatedAt}.</p>
      ) : null}

      {document.intro?.map((paragraph, index) => (
        <p key={`intro-${index}`} className="votti-legal-modal__text">
          {paragraph}
        </p>
      ))}

      {document.sections.map((section, index) => (
        <section key={index} className="votti-legal-modal__section">
          {section.heading ? (
            <h3 className="votti-legal-modal__heading">{section.heading}</h3>
          ) : null}
          {section.paragraphs?.map((paragraph, pIndex) => (
            <p key={`p-${pIndex}`} className="votti-legal-modal__text">
              {paragraph}
            </p>
          ))}
          {section.bullets?.length ? (
            <ul className="votti-legal-modal__list">
              {section.bullets.map((item, bIndex) => (
                <li key={`b-${bIndex}`}>{item}</li>
              ))}
            </ul>
          ) : null}
          {section.closing?.map((paragraph, cIndex) => (
            <p key={`c-${cIndex}`} className="votti-legal-modal__text">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </LegalModalShell>
  );
}
