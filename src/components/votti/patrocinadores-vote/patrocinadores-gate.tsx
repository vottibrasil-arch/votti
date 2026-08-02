import { Megaphone, X } from "lucide-react";
import { useId, useState } from "react";
import { PATROCINADORES_PAGE_PATH } from "@/lib/patrocinadores";
import {
  PATROCINADORES_CLOSE_DELAY_SEC,
  usePatrocinadoresCloseTimer,
} from "./use-patrocinadores-session";

type PatrocinadoresGateProps = {
  visible: boolean;
  leaving: boolean;
  onDismiss: () => void;
};

/**
 * Central de Patrocinadores na votação — card VOTTI + iframe da página /patrocinadores.
 * Sem sandbox; sem manipular DOM de anúncios no documento pai.
 */
export function PatrocinadoresGate({ visible, leaving, onDismiss }: PatrocinadoresGateProps) {
  const titleId = useId();
  const { secondsLeft, canClose } = usePatrocinadoresCloseTimer(visible && !leaving);
  const [frameReady, setFrameReady] = useState(false);

  if (!visible && !leaving) return null;

  return (
    <aside
      className={`votti-patrocinadores-vote ${leaving ? "votti-patrocinadores-vote--leaving" : "animate-rise"}`}
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

        <div className="votti-patrocinadores-vote__slot" aria-label="Banner de publicidade">
          {!frameReady ? (
            <div className="votti-patrocinadores-vote__skeleton" aria-hidden>
              <span>Carregando patrocinadores…</span>
            </div>
          ) : null}
          <iframe
            title="Patrocinadores do VOTTI — publicidade"
            src={PATROCINADORES_PAGE_PATH}
            className="votti-patrocinadores-vote__frame"
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setFrameReady(true)}
          />
        </div>

        <footer className="votti-patrocinadores-vote__actions">
          {canClose ? (
            <button
              type="button"
              className="votti-patrocinadores-vote__close-btn"
              onClick={onDismiss}
            >
              <X className="size-3.5" aria-hidden />
              Fechar
            </button>
          ) : (
            <p className="votti-patrocinadores-vote__countdown" aria-live="polite">
              <span className="votti-patrocinadores-vote__countdown-num">{secondsLeft}</span>
              Fechar em {secondsLeft} {secondsLeft === 1 ? "segundo" : "segundos"}
            </p>
          )}
        </footer>
      </div>
    </aside>
  );
}

export { PATROCINADORES_CLOSE_DELAY_SEC };
