import { Megaphone, X } from "lucide-react";
import { useId, useRef } from "react";
import { getMonetagFooterZoneId } from "@/lib/monetag";
import { usePatrocinadoresBanner } from "./use-patrocinadores-banner";
import { useMonetagLeakGuard } from "./use-monetag-leak-guard";
import {
  PATROCINADORES_CLOSE_DELAY_SEC,
  usePatrocinadoresCloseTimer,
  usePatrocinadoresVisibility,
} from "./use-patrocinadores-session";

/** Página estática para teste manual da tag. */
export const PATROCINADORES_FRAME_SRC = "/patrocinadores/monetag.html";

/** @deprecated Rota SPA removida. */
export const PROPAGANDA_FRAME_ROUTE = "/propaganda/frame";

/**
 * Central de Patrocinadores — banner Monetag preso no rodapé da votação (estilo site).
 * Script no slot + guard que remove push flutuante nos cantos da tela.
 */
export function PatrocinadoresVote() {
  const titleId = useId();
  const slotRef = useRef<HTMLDivElement>(null);
  const { visible, dismiss } = usePatrocinadoresVisibility();
  const { secondsLeft, canClose } = usePatrocinadoresCloseTimer(visible);

  usePatrocinadoresBanner(visible, slotRef);
  useMonetagLeakGuard(visible);

  if (!visible) return null;

  const zoneId = getMonetagFooterZoneId();

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

        <div
          ref={slotRef}
          className="votti-patrocinadores-vote__slot"
          data-monetag-zone={zoneId}
          data-votti-banner-root
          aria-label="Banner patrocinado"
        />

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
