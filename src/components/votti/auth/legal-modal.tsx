import { useEffect, useId } from "react";
import { X } from "lucide-react";
import type { LegalDocument } from "@/lib/votti/legal-content";

type LegalModalProps = {
  legal: LegalDocument;
  onClose: () => void;
};

export function LegalModal({ legal, onClose }: LegalModalProps) {
  const titleId = useId();

  useEffect(() => {
    const prevOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      globalThis.document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="votti-legal-modal" role="presentation" onClick={onClose}>
      <div
        className="votti-legal-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="votti-legal-modal__head">
          <h2 id={titleId} className="votti-legal-modal__title">
            {legal.title}
          </h2>
          <button
            type="button"
            className="votti-legal-modal__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="votti-legal-modal__body">
          {legal.sections.map((section, index) => (
            <section key={index} className="votti-legal-modal__section">
              {section.heading ? (
                <h3 className="votti-legal-modal__heading">{section.heading}</h3>
              ) : null}
              {section.paragraphs.map((paragraph, pIndex) => (
                <p key={pIndex} className="votti-legal-modal__text">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <footer className="votti-legal-modal__foot">
          <button type="button" className="votti-legal-modal__ok" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}
