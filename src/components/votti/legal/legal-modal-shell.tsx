import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";

type LegalModalShellProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  panelClassName?: string;
};

export function LegalModalShell({
  title,
  children,
  onClose,
  footer,
  panelClassName,
}: LegalModalShellProps) {
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
        className={`votti-legal-modal__panel${panelClassName ? ` ${panelClassName}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="votti-legal-modal__head">
          <h2 id={titleId} className="votti-legal-modal__title">
            {title}
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

        <div className="votti-legal-modal__body">{children}</div>

        <footer className="votti-legal-modal__foot">
          {footer ?? (
            <button type="button" className="votti-legal-modal__ok" onClick={onClose}>
              Fechar
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
