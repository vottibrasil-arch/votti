import { useEffect, type RefObject } from "react";
import {
  appendMonetagZoneScript,
  getMonetagFooterZoneId,
  getMonetagScriptUrl,
} from "@/lib/monetag";

const PATROCINADORES = ".votti-patrocinadores-vote";
const POLL_UI =
  ".votti-vote-hero, .votti-public-poll__bg, .votti-public-poll__inner, .votti-image-box, .votti-ranking, .votti-vote-hero__cover";

const ZONE_ID = getMonetagFooterZoneId();

function isPollUi(el: Element) {
  return Boolean(el.closest(POLL_UI));
}

/** Criativo Monetag (banner) — só estes vão para o slot embaixo. */
function isMonetagCreative(el: HTMLElement) {
  if (el.closest(`${PATROCINADORES}__slot`)) return false;
  if (isPollUi(el)) return false;

  const marker = `${el.id} ${el.className} ${el.getAttribute("data-zone") ?? ""}`;
  if (new RegExp(ZONE_ID).test(marker)) return true;
  if (/propeller|monetag|nap5k|adskeeper/i.test(marker)) return true;

  const iframe =
    el instanceof HTMLIFrameElement ? el : el.querySelector("iframe");
  if (iframe instanceof HTMLIFrameElement && iframe.src) {
    return /nap5k|propeller|monetag|adskeeper|onetag/i.test(iframe.src);
  }

  return false;
}

function pinCreativesToSlot(slot: HTMLElement) {
  const toMove = new Set<HTMLElement>();

  for (const el of document.body.children) {
    if (el instanceof HTMLElement && isMonetagCreative(el)) toMove.add(el);
  }

  for (const el of document.body.querySelectorAll("div, ins, a, iframe")) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.parentElement !== document.body) continue;
    if (isMonetagCreative(el)) toMove.add(el);
  }

  for (const el of toMove) {
    if (!slot.contains(el)) slot.appendChild(el);
  }
}

/**
 * Tag oficial Monetag no documento + prende o banner no slot embaixo.
 * Iframe sandbox bloqueia fill; a tag precisa rodar no domínio vottii.com.
 */
export function usePatrocinadoresMonetag(
  active: boolean,
  slotRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const slot = slotRef.current;
    if (!slot) return;

    appendMonetagZoneScript(getMonetagFooterZoneId(), getMonetagScriptUrl());

    const sync = () => pinCreativesToSlot(slot);

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    const timers = [400, 1200, 3000, 6000, 12000].map((ms) =>
      window.setTimeout(sync, ms),
    );
    const interval = window.setInterval(sync, 2500);

    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(interval);
    };
  }, [active, slotRef]);
}
