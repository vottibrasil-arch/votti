import { ADSENSE_CLIENT } from "@/lib/adsense";
import type { FooterAdConfig } from "./types";

function pickEnv(...values: Array<string | undefined>) {
  return values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim();
}

/**
 * Configuração padrão do slot de anúncio no rodapé.
 * Prioridade: prop explícita > slot do servidor (Supabase) > VITE_ADSENSE_FOOTER_SLOT > Monetag > AdSense (cliente).
 */
export function getFooterAdConfig(override?: FooterAdConfig, slotFromServer?: string | null): FooterAdConfig {
  if (override) return override;

  const adsenseSlot = pickEnv(
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_ADSENSE_FOOTER_SLOT : undefined,
    process.env.VITE_ADSENSE_FOOTER_SLOT,
  ) || slotFromServer?.trim() || undefined;

  const monetagZoneId = pickEnv(
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_MONETAG_FOOTER_ZONE : undefined,
    process.env.VITE_MONETAG_FOOTER_ZONE,
  );

  if (monetagZoneId && !adsenseSlot) {
    return { provider: "monetag", monetagZoneId };
  }

  return {
    provider: "adsense",
    adsenseSlot,
    adsenseFormat: "horizontal",
  };
}

export { ADSENSE_CLIENT };
