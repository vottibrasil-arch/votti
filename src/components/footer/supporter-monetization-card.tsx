import type { SupporterMonetizationCardProps } from "@/lib/footer-ad";
import { getFooterAdConfig } from "@/lib/footer-ad";
import { FooterAdSlot } from "./footer-ad-slot";
import { SupporterProfilePanel } from "./supporter-profile-panel";

/** Barra compacta do rodapé: apoiador (esquerda) + Google AdSense (direita). */
export function SupporterMonetizationCard({
  supporter,
  adConfig,
  advertiseHref = "/apoiar",
  className = "",
}: SupporterMonetizationCardProps) {
  const resolvedAd = getFooterAdConfig(adConfig);

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-border/50 bg-[color-mix(in_oklab,var(--surface)_90%,transparent)] shadow-sm ${className}`}
    >
      <div className="flex h-[110px] w-full md:h-[96px]">
        <a
          href={advertiseHref}
          key={supporter.id}
          className="min-h-0 w-[138px] shrink-0 animate-rise border-r border-border/40 md:w-[172px]"
          aria-label="Abrir contribuicao via Pix"
        >
          <SupporterProfilePanel supporter={supporter} />
        </a>

        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[color-mix(in_oklab,var(--surface-2)_60%,transparent)]">
          <FooterAdSlot config={resolvedAd} advertiseHref={advertiseHref} />
        </div>
      </div>
    </article>
  );
}
