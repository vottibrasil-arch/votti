import { Megaphone, X } from "lucide-react";
import { useId } from "react";
import {
  PATROCINADORES_CLOSE_DELAY_SEC,
  usePatrocinadoresCloseTimer,
  usePatrocinadoresVisibility,
} from "./use-patrocinadores-session";

/** HTML estático isolado — Monetag só dentro do iframe sandbox (sem acesso ao documento pai). */
export const PATROCINADORES_FRAME_SRC = "/patrocinadores/monetag.html";

/** @deprecated Use PATROCINADORES_FRAME_SRC — rota SPA removida para evitar vazamento de anúncios. */
export const PROPAGANDA_FRAME_ROUTE = "/propaganda/frame";

/**
 * Central de Patrocinadores — monetização no rodapé das páginas públicas de votação.
 * Inline no fluxo da página; nunca sobrepõe capa, ranking ou botões.
 */
export function PatrocinadoresVote() {
  const titleId = useId();
  const { visible, dismiss } = usePatrocinadoresVisibility();
  const { secondsLeft, canClose } = usePatrocinadoresCloseTimer(visible);

  if (!visible) return null;

  return (
    <aside
      className="votti-patrocinadores-vote animate-rise"
      aria-labelledby={titleId}
    >
      <div className="votti-patrocinadores-vote__card">
        <header className="votti-patrocinadores-vote__head">
          <div className="votti-patrocinadores-vote__title-row">
            <Megaphone className="votti-patrocinadores-vote__icon" aria-hidden />
            <h2 id={titleId} className="votti-patrocinadores-vote__title">
              Patrocinadores do VOTTI
            </h2>
          </div>
          <p className="votti-patrocinadores-vote__subtitle">
            Este espaço ajuda a manter o VOTTI gratuito.
          </p>
        </header>

        <div className="votti-patrocinadores-vote__slot" aria-label="Área de publicidade">
          <iframe
            title="Patrocinadores do VOTTI — conteúdo patrocinado"
            src={PATROCINADORES_FRAME_SRC}
            className="votti-patrocinadores-vote__frame"
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          />
        </div>

        <footer className="votti-patrocinadores-vote__actions">
          {canClose ? (
            <button
              type="button"
              className="votti-patrocinadores-vote__close-btn"
              onClick={dismiss}
            >
              <X className="size-3.5" aria-hidden />
              Fechar
            </button>
          ) : (
            <p className="votti-patrocinadores-vote__countdown" aria-live="polite">
              Fechar em {secondsLeft}{" "}
              {secondsLeft === 1 ? "segundo" : "segundos"}
            </p>
          )}
        </footer>
      </div>
    </aside>
  );
}
