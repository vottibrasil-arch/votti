import { useEffect, useRef } from "react";
import {
  getMonetagFooterZoneId,
  getMonetagScriptUrl,
} from "@/lib/monetag";

/** Tag oficial Monetag — injetada neste container (página /patrocinadores). */
export function MonetagAdSlot() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const zoneId = getMonetagFooterZoneId();
    const scriptUrl = getMonetagScriptUrl();
    const selector = `script[data-zone="${zoneId}"][src="${scriptUrl}"]`;
    if (root.querySelector(selector)) return;

    const script = document.createElement("script");
    script.dataset.zone = zoneId;
    script.src = scriptUrl;
    root.appendChild(script);
  }, []);

  return (
    <div
      ref={rootRef}
      className="votti-patrocinadores-page__ad-root"
      data-monetag-zone-root
      aria-label="Área de publicidade"
    />
  );
}
