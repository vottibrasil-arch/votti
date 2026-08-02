import { useEffect } from "react";

const PATROCINADORES_SELECTOR = ".votti-patrocinadores-vote";
const APP_UI_SELECTOR = "[data-votti-ui], [role='dialog'], .votti-legal-modal";

/** Remove scripts Monetag injetados fora do iframe da Central de Patrocinadores. */
function purgeParentMonetagScripts() {
  document.querySelectorAll("script[data-zone]").forEach((node) => {
    if (!(node instanceof HTMLScriptElement)) return;
    if (node.closest(PATROCINADORES_SELECTOR)) return;
    node.remove();
  });
}

function isAdOverlay(el: HTMLElement) {
  if (el.closest(PATROCINADORES_SELECTOR)) return false;
  if (el.closest(APP_UI_SELECTOR)) return false;

  const style = window.getComputedStyle(el);
  if (style.position !== "fixed" && style.position !== "absolute") return false;

  const z = Number.parseInt(style.zIndex, 10);
  if (!Number.isNaN(z) && z < 500) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const text = el.textContent ?? "";
  const looksLikePush =
    /\bAd\b/i.test(text) ||
    el.querySelector("iframe") !== null ||
    /propeller|monetag|nap5k|adskeeper/i.test(`${el.id} ${el.className}`);

  if (!looksLikePush) return false;

  // In-page push: caixa pequena nos cantos da tela
  return rect.width < 420 && rect.height < 220;
}

function purgeLeakedOverlays() {
  const scan = (el: HTMLElement) => {
    if (isAdOverlay(el)) {
      el.remove();
      return;
    }
    for (const child of el.children) {
      if (child instanceof HTMLElement) scan(child);
    }
  };

  for (const child of document.body.children) {
    if (child instanceof HTMLElement) scan(child);
  }
}

/**
 * Impede que tags Monetag (push/in-page) invadam a votação fora do iframe embaixo.
 */
export function useMonetagLeakGuard(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    purgeParentMonetagScripts();
    purgeLeakedOverlays();

    const observer = new MutationObserver((mutations) => {
      purgeParentMonetagScripts();

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (isAdOverlay(node)) {
            node.remove();
            continue;
          }
          for (const child of node.querySelectorAll("*")) {
            if (child instanceof HTMLElement && isAdOverlay(child)) child.remove();
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const interval = window.setInterval(() => {
      purgeParentMonetagScripts();
      purgeLeakedOverlays();
    }, 2000);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, [active]);
}
