import { useEffect } from "react";

const PATROCINADORES = ".votti-patrocinadores-vote";
const POLL_UI =
  ".votti-vote-hero, .votti-public-poll__bg, .votti-public-poll__inner, .votti-image-box, .votti-ranking";

/** Só remove in-page push nos cantos — nunca mexe na capa ou ranking da votação. */
function isPushOverlay(el: HTMLElement) {
  if (el.closest(PATROCINADORES)) return false;
  if (el.closest(POLL_UI)) return false;
  if (el.closest("[role='dialog'], .votti-legal-modal")) return false;

  const style = window.getComputedStyle(el);
  if (style.position !== "fixed" && style.position !== "absolute") return false;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.width >= 420 || rect.height >= 220) return false;

  const text = el.textContent ?? "";
  return (
    /\bAd\b/i.test(text) ||
    /propeller|monetag|nap5k|adskeeper/i.test(`${el.id} ${el.className}`)
  );
}

function purgePushOverlays() {
  for (const el of document.body.querySelectorAll("*")) {
    if (el instanceof HTMLElement && isPushOverlay(el)) el.remove();
  }
}

export function useMonetagPushGuard(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    purgePushOverlays();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && isPushOverlay(node)) node.remove();
        }
      }
      purgePushOverlays();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(purgePushOverlays, 1500);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, [active]);
}
