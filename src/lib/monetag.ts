/** Verificação de propriedade do site no painel Monetag (vottii.com). */
export const MONETAG_VERIFICATION_CONTENT = "dd344fe16dccffdf175a8eed8f16b79c";

export const MONETAG_META_TAG =
  `<meta name="monetag" content="${MONETAG_VERIFICATION_CONTENT}">`;

/** Zona banner Monetag — Central de Patrocinadores (Get tag). */
export const MONETAG_FOOTER_ZONE_ID = "11483021";
export const MONETAG_FOOTER_SCRIPT_SRC = "https://nap5k.com/tag.min.js";

function pickEnv(...values: Array<string | undefined>) {
  return values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim();
}

/** URL do script Monetag (override opcional via env). */
export function getMonetagScriptUrl(): string {
  return (
    pickEnv(
      typeof import.meta !== "undefined" ? import.meta.env?.VITE_MONETAG_SCRIPT_URL : undefined,
      typeof import.meta !== "undefined" ? import.meta.env?.VITE_MONETAG_FOOTER_SCRIPT_URL : undefined,
      process.env.VITE_MONETAG_SCRIPT_URL,
      process.env.VITE_MONETAG_FOOTER_SCRIPT_URL,
    ) ?? MONETAG_FOOTER_SCRIPT_SRC
  );
}

export function getMonetagFooterZoneId(): string {
  return (
    pickEnv(
      typeof import.meta !== "undefined" ? import.meta.env?.VITE_MONETAG_FOOTER_ZONE : undefined,
      process.env.VITE_MONETAG_FOOTER_ZONE,
    ) ?? MONETAG_FOOTER_ZONE_ID
  );
}

export function injectMonetagVerification(html: string) {
  if (!html.includes("</head>")) return html;
  if (html.includes('name="monetag"')) return html;
  return html.replace("</head>", `${MONETAG_META_TAG}</head>`);
}

export type MonetagMountOptions = {
  /** Onde anexar o script (ex.: slot da Central de Patrocinadores). */
  parent?: HTMLElement;
  /** Evita colisão quando a mesma zona é usada em mais de um lugar. */
  mountId?: string;
};

/**
 * Injeta o script Monetag (data-zone + tag.min.js).
 * Nas páginas de votação use o iframe `/patrocinadores/monetag.html` — script no documento
 * pai dispara push/in-page push flutuante fora do rodapé.
 */
export function ensureMonetagScriptLoaded(
  scriptUrl = getMonetagScriptUrl(),
  zoneId = getMonetagFooterZoneId(),
  options?: MonetagMountOptions,
) {
  if (typeof document === "undefined") return false;

  const mountId = options?.mountId?.trim() || "default";
  const selector = `script[data-zone="${zoneId}"][data-monetag-mount="${mountId}"]`;
  if (document.querySelector(selector)) return true;

  const parent =
    options?.parent ??
    ([document.documentElement, document.body].filter(Boolean).pop() as HTMLElement | undefined);
  if (!parent) return false;

  const script = document.createElement("script");
  script.dataset.zone = zoneId;
  script.dataset.monetagMount = mountId;
  script.src = scriptUrl;
  parent.appendChild(script);
  return true;
}
