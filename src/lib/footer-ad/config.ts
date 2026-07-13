import type { FooterAdConfig } from "./types";
import { getMonetagFooterZoneId, getMonetagScriptUrl } from "@/lib/monetag";

function pickEnv(...values: Array<string | undefined>) {
  return values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim();
}

/**
 * Configuração padrão do slot de anúncio no rodapé.
 * Prioridade:
 * prop explícita > Monetag (script/zona) > AdSense slot > AdSense (cliente).
 */
export function getFooterAdConfig(override?: FooterAdConfig, slotFromServer?: string | null): FooterAdConfig {
  if (override) return override;

  const monetagScriptUrl = getMonetagScriptUrl();
  const monetagZoneId = getMonetagFooterZoneId();

  if (monetagScriptUrl || monetagZoneId) {
    return {
      provider: "monetag",
      monetagZoneId,
      monetagScriptUrl,
    };
  }

  const adsenseSlot = pickEnv(
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_ADSENSE_FOOTER_SLOT : undefined,
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_ADSENSE_SLOT : undefined,
    process.env.VITE_ADSENSE_FOOTER_SLOT,
    process.env.VITE_ADSENSE_SLOT,
  ) || slotFromServer?.trim() || undefined;

  return {
    provider: "adsense",
    adsenseSlot,
    adsenseFormat: "horizontal",
  };
}

export { ADSENSE_CLIENT } from "@/lib/adsense";
