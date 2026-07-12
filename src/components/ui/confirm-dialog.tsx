import { useEffect, useId, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const prevOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      globalThis.document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="votti-legal-modal" role="presentation" onClick={busy ? undefined : onCancel}>
      <div
        className="votti-legal-modal__panel"
        role="alertdialog"
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
            onClick={onCancel}
            disabled={busy}
            aria-label="Fechar"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="votti-legal-modal__body">
          <p className="votti-legal-modal__text">{message}</p>
          {error ? <p className="votti-auth__error mt-3">{error}</p> : null}
        </div>

        <footer className="votti-confirm-dialog__foot">
          <button type="button" className="votti-outline-btn" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="votti-outline-btn votti-outline-btn--danger"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Excluindo…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
