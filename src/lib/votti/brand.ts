/** Site institucional oficial do VOTTII (política, termos, etc.). */
export const VOTTI_INSTITUTIONAL_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_VOTTI_SITE_URL?.trim()) ||
  "https://vottii.com";

/** Nome da marca exibido ao usuário (domínio: vottii.com). */
export const VOTTII_DISPLAY_NAME = "VOTTII";

/** Partes do wordmark: VOTT + ii (dois i no final). */
export const VOTTII_WORDMARK_PREFIX = "VOTT";
export const VOTTII_WORDMARK_SUFFIX = "ii";
