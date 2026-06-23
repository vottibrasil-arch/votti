import { useEffect, useState, type RefObject } from "react";
import type { FooterAdConfig } from "./types";

function hasVisibleAdContent(container: HTMLElement) {
  const ins = container.querySelector("ins.adsbygoogle");
  if (ins instanceof HTMLElement) {
    if (ins.getAttribute("data-ad-status") === "filled") return true;
    if (ins.offsetHeight > 48 && ins.innerHTML.trim().length > 0) return true;
  }

  const iframe = container.querySelector("iframe");
  if (iframe instanceof HTMLElement && iframe.offsetHeight > 24) return true;

  const img = container.querySelector("img[data-footer-ad-image]");
  if (img instanceof HTMLImageElement && img.complete && img.naturalHeight > 0) return true;

  const htmlSlot = container.querySelector("[data-footer-ad-html]");
  if (htmlSlot instanceof HTMLElement && htmlSlot.childElementCount > 0) return true;

  const monetag = container.querySelector("[data-monetag-zone]");
  if (monetag instanceof HTMLElement && monetag.childElementCount > 0) return true;

  return false;
}

/** Detecta se um anúncio preencheu o slot (senão mostramos o fallback institucional). */
export function useFooterAdLoaded(config: FooterAdConfig, containerRef: RefObject<HTMLElement | null>) {
  const [loaded, setLoaded] = useState(config.provider === "image" || config.provider === "html");

  useEffect(() => {
    if (config.provider === "none") {
      setLoaded(false);
      return;
    }

    if (config.provider === "image" && config.imageUrl) {
      setLoaded(true);
      return;
    }

    if (config.provider === "html" && config.html?.trim()) {
      setLoaded(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const evaluate = () => {
      if (cancelled) return;
      setLoaded(hasVisibleAdContent(container));
    };

    evaluate();

    const observer = new MutationObserver(evaluate);
    observer.observe(container, { childList: true, subtree: true, attributes: true });

    const timers = [1500, 4000, 8000].map((ms) => window.setTimeout(evaluate, ms));

    return () => {
      cancelled = true;
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [config, containerRef]);

  return loaded;
}
