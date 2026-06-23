import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT } from "@/lib/adsense";
import type { FooterAdConfig } from "@/lib/footer-ad";
import { useFooterAdLoaded } from "@/lib/footer-ad/use-footer-ad-loaded";
import { FooterAdFallback } from "./footer-ad-fallback";

type Props = {
  config: FooterAdConfig;
  advertiseHref?: string;
};

function requestAdSenseFill() {
  try {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push({});
  } catch {
    /* script ainda não carregou ou bloqueado */
  }
}

/** Slot Google AdSense no rodapé — barra horizontal compacta. */
export function FooterAdSlot({ config, advertiseHref }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adLoaded = useFooterAdLoaded(config, containerRef);
  const isAdSense = config.provider === "adsense";
  const hasSlot = Boolean(config.adsenseSlot?.trim());

  useEffect(() => {
    if (!isAdSense || !hasSlot) return;

    requestAdSenseFill();

    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;

    const interval = window.setInterval(() => {
      if (!document.querySelector('script[src*="adsbygoogle.js"]')) return;
      requestAdSenseFill();
      window.clearInterval(interval);
    }, 400);

    const timeout = window.setTimeout(() => window.clearInterval(interval), 12_000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [isAdSense, hasSlot, config.adsenseSlot]);

  const showFallback =
    config.provider !== "adsense" &&
    (config.provider === "none" ||
      ((config.provider === "monetag" || config.provider === "image") && !adLoaded));

  return (
    <div className="relative flex h-full w-full items-center overflow-hidden">
      {isAdSense ? (
        <div
          ref={containerRef}
          className="flex h-full w-full items-center justify-center px-1.5"
          aria-label="Anúncio"
        >
          {hasSlot ? (
            <ins
              className="adsbygoogle block h-full min-h-[92px] w-full overflow-hidden md:min-h-[80px]"
              style={{ display: "block", width: "100%", height: "100%" }}
              data-ad-client={ADSENSE_CLIENT}
              data-ad-slot={config.adsenseSlot}
              data-ad-format={config.adsenseFormat ?? "horizontal"}
              data-full-width-responsive="true"
            />
          ) : (
            <div className="h-full min-h-[92px] w-full md:min-h-[80px]" aria-hidden />
          )}
        </div>
      ) : null}

      {config.provider === "monetag" && config.monetagZoneId ? (
        <div ref={containerRef} className="flex h-full w-full items-center justify-center px-1.5">
          <div
            id={`monetag-zone-${config.monetagZoneId}`}
            data-monetag-zone={config.monetagZoneId}
            className="h-full min-h-[92px] w-full md:min-h-[80px]"
          />
        </div>
      ) : null}

      {config.provider === "html" && config.html ? (
        <div
          ref={containerRef}
          data-footer-ad-html
          className="flex h-full w-full items-center justify-center overflow-hidden [&_a]:block [&_img]:max-h-[92px] [&_img]:w-full [&_img]:object-contain md:[&_img]:max-h-[80px]"
          dangerouslySetInnerHTML={{ __html: config.html }}
        />
      ) : null}

      {config.provider === "image" && config.imageUrl ? (
        <div ref={containerRef} className="flex h-full w-full items-center justify-center px-1.5">
          {config.imageHref ? (
            <a
              href={config.imageHref}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex h-full w-full items-center justify-center"
            >
              <img
                data-footer-ad-image
                src={config.imageUrl}
                alt={config.imageAlt ?? "Patrocinador"}
                className="max-h-[92px] w-full object-contain md:max-h-[80px]"
              />
            </a>
          ) : (
            <img
              data-footer-ad-image
              src={config.imageUrl}
              alt={config.imageAlt ?? "Patrocinador"}
              className="max-h-[92px] w-full object-contain md:max-h-[80px]"
            />
          )}
        </div>
      ) : null}

      {showFallback ? <FooterAdFallback href={advertiseHref} /> : null}
    </div>
  );
}
