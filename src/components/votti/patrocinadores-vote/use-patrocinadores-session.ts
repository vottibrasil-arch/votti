import { useCallback, useEffect, useState } from "react";

export const PATROCINADORES_CLOSE_DELAY_SEC = 15;

/** Contagem regressiva até liberar o botão fechar. */
export function usePatrocinadoresCloseTimer(active: boolean) {
  const [secondsLeft, setSecondsLeft] = useState(PATROCINADORES_CLOSE_DELAY_SEC);
  const canClose = secondsLeft <= 0;

  useEffect(() => {
    if (!active) return;

    setSecondsLeft(PATROCINADORES_CLOSE_DELAY_SEC);
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [active]);

  return { secondsLeft, canClose };
}

/**
 * Fechar oculta só na visita atual. Ao sair da página e voltar, o componente remonta e reaparece.
 */
export function usePatrocinadoresVisibility() {
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, dismiss };
}
