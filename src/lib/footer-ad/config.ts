import type { FooterAdConfig } from "./types";
import { getMonetagFooterZoneId, getMonetagScriptUrl } from "@/lib/monetag";
/**
 * Configuração padrão do slot de anúncio no rodapé.
 * Prioridade: prop explícita > Monetag (tag do painel, já no código).
 */
export function getFooterAdConfig(override?: FooterAdConfig, _slotFromServer?: string | null): FooterAdConfig {
  if (override) return override;

  return {
    provider: "monetag",
    monetagZoneId: getMonetagFooterZoneId(),
    monetagScriptUrl: getMonetagScriptUrl(),
  };
}

export { ADSENSE_CLIENT } from "@/lib/adsense";
