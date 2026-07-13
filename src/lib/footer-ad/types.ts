/**
 * Tipos do slot de anúncio no rodapé (SupporterMonetizationCard).
 *
 * Integrações futuras — basta alterar `getFooterAdConfig()` em config.ts
 * ou passar `adConfig` como prop (ex.: banner vindo do Super ADM).
 *
 * @example Google AdSense
 * { provider: "adsense", adsenseSlot: "1234567890" }
 *
 * @example Monetag
 * { provider: "monetag", monetagZoneId: "SEU_ZONE_ID" }
 *
 * @example Banner HTML (Super ADM)
 * { provider: "html", html: "<a href='...'><img ...></a>" }
 *
 * @example Imagem patrocinador
 * { provider: "image", imageUrl: "/sponsors/x.png", imageHref: "https://..." }
 */

export type FooterAdProvider = "adsense" | "monetag" | "html" | "image" | "none";

export type FooterAdConfig = {
  provider: FooterAdProvider;
  /** Slot AdSense (data-ad-slot). Cliente vem de lib/adsense.ts */
  adsenseSlot?: string;
  /** Formato responsivo AdSense */
  adsenseFormat?: "auto" | "horizontal" | "rectangle";
  /** ID da zona Monetag */
  monetagZoneId?: string;
  /** URL do script Monetag (painel → Get tag) */
  monetagScriptUrl?: string;
  /** HTML bruto — útil para scripts/embeds do Super ADM */
  html?: string;
  /** Banner em imagem */
  imageUrl?: string;
  imageAlt?: string;
  imageHref?: string;
};

export type SupporterProfile = {
  id: string;
  name: string;
  city: string;
  initial: string;
  color: string;
  message?: string;
  /** URL de foto ou logotipo (opcional) */
  avatarUrl?: string;
};

export type SupporterMonetizationCardProps = {
  supporter: SupporterProfile;
  adConfig?: FooterAdConfig;
  advertiseHref?: string;
  className?: string;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}
