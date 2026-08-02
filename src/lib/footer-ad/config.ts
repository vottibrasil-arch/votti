import type { FooterAdConfig } from "./types";

/**
 * Configuração padrão do slot de anúncio no rodapé.
 * Monetag fica somente em `/patrocinadores` — nunca no documento da votação.
 */
export function getFooterAdConfig(override?: FooterAdConfig, _slotFromServer?: string | null): FooterAdConfig {
  if (override) return override;

  return { provider: "none" };
}

export { ADSENSE_CLIENT } from "@/lib/adsense";
