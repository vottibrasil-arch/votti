import { useEffect, type RefObject } from "react";
import {
  ensureMonetagScriptLoaded,
  getMonetagFooterZoneId,
  getMonetagScriptUrl,
} from "@/lib/monetag";

const MOUNT_ID = "patrocinadores-vote";
const SLOT_SELECTOR = ".votti-patrocinadores-vote__slot";

function isInsideSlot(el: Element, slot: HTMLElement) {
  return el === slot || slot.contains(el);
}

/** In-page push: caixinha fixa nos cantos — não é banner. */
function isPushOverlay(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  if (style.position !== "fixed" && style.position !== "absolute") return false;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const nearCorner =
    rect.top < 120 ||
    rect.bottom > window.innerHeight - 120 ||
    rect.left < 40 ||
    rect.right > window.innerWidth - 40;

  return nearCorner && rect.width < 420 && rect.height < 220;
}

/** Banner horizontal / display — conteúdo largo no fluxo da página. */
function isBannerNode(el: HTMLElement) {
  if (el.tagName === "SCRIPT") return false;

  const iframe = el.querySelector("iframe");
  const img = el.querySelector("img");
  if (!iframe && !img && el.tagName !== "IFRAME" && el.tagName !== "IMG") return false;

  const rect = el.getBoundingClientRect();
  const width = Math.max(rect.width, iframe?.offsetWidth ?? 0, img?.offsetWidth ?? 0);
  const height = Math.max(rect.height, iframe?.offsetHeight ?? 0, img?.offsetHeight ?? 0);

  return width >= 200 && height >= 40 && height <= 320;
}

function purgePushOutsideSlot(slot: HTMLElement) {
  for (const el of document.body.querySelectorAll("*")) {
    if (!(el instanceof HTMLElement)) continue;
    if (isInsideSlot(el, slot)) continue;
    if (isPushOverlay(el)) el.remove();
  }
}

function relocateBannerIntoSlot(slot: HTMLElement) {
  const candidates: HTMLElement[] = [];

  for (const el of document.body.children) {
    if (!(el instanceof HTMLElement)) continue;
    if (isInsideSlot(el, slot)) continue;
    if (el.closest(".votti-patrocinadores-vote")) continue;

    if (isPushOverlay(el)) {
      el.remove();
      continue;
    }

    if (isBannerNode(el)) candidates.push(el);
  }

  for (const el of document.body.querySelectorAll("div, ins, a, span")) {
    if (!(el instanceof HTMLElement)) continue;
    if (isInsideSlot(el, slot)) continue;
    if (el.closest(".votti-patrocinadores-vote")) continue;
    if (candidates.includes(el)) continue;
    if (isPushOverlay(el)) continue;
    if (isBannerNode(el)) candidates.push(el);
  }

  for (const node of candidates) {
    if (!node.isConnected || isInsideSlot(node, slot)) continue;
    slot.appendChild(node);
  }
}

/**
 * Carrega zona banner Monetag no documento (fill real) e prende o criativo no slot embaixo.
 */
export function usePatrocinadoresBanner(
  active: boolean,
  slotRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const slot = slotRef.current;
    if (!slot) return;

    ensureMonetagScriptLoaded(getMonetagScriptUrl(), getMonetagFooterZoneId(), {
      parent: document.body,
      mountId: MOUNT_ID,
    });

    const sync = () => {
      purgePushOutsideSlot(slot);
      relocateBannerIntoSlot(slot);
    };

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    const timers = [500, 1500, 4000, 8000, 15000].map((ms) => window.setTimeout(sync, ms));
    const interval = window.setInterval(sync, 2500);

    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(interval);
    };
  }, [active, slotRef]);
}

export { SLOT_SELECTOR, MOUNT_ID };
