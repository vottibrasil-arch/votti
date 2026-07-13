/** Verificação de propriedade do site no painel Monetag (vottii.com). */
export const MONETAG_VERIFICATION_CONTENT = "dd344fe16dccffdf175a8eed8f16b79c";

export const MONETAG_META_TAG =
  `<meta name="monetag" content="${MONETAG_VERIFICATION_CONTENT}">`;

function pickEnv(...values: Array<string | undefined>) {
  return values.find((v) => typeof v === "string" && v.trim().length > 0)?.trim();
}

/** URL do script da zona Monetag (copie do painel → Get tag). */
export function getMonetagScriptUrl(): string | undefined {
  return pickEnv(
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_MONETAG_SCRIPT_URL : undefined,
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_MONETAG_FOOTER_SCRIPT_URL : undefined,
    process.env.VITE_MONETAG_SCRIPT_URL,
    process.env.VITE_MONETAG_FOOTER_SCRIPT_URL,
  );
}

export function getMonetagFooterZoneId(): string | undefined {
  return pickEnv(
    typeof import.meta !== "undefined" ? import.meta.env?.VITE_MONETAG_FOOTER_ZONE : undefined,
    process.env.VITE_MONETAG_FOOTER_ZONE,
  );
}

export function injectMonetagVerification(html: string) {
  if (!html.includes("</head>")) return html;
  if (html.includes('name="monetag"')) return html;
  return html.replace("</head>", `${MONETAG_META_TAG}</head>`);
}

/** Carrega o script da zona Monetag uma vez (recomendado no head). */
export function ensureMonetagScriptLoaded(scriptUrl: string, zoneId?: string) {
  if (typeof document === "undefined") return;

  const selector = zoneId
    ? `script[data-monetag-zone-id="${zoneId}"]`
    : `script[data-monetag-site="1"][src="${scriptUrl}"]`;

  if (document.querySelector(selector)) return;

  const script = document.createElement("script");
  script.src = scriptUrl;
  script.async = true;
  script.dataset.monetagSite = "1";
  if (zoneId) script.dataset.monetagZoneId = zoneId;
  document.head.appendChild(script);
}
