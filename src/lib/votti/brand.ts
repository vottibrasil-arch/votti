/** Site institucional oficial do VOTTII (política, termos, etc.). */
export const VOTTI_INSTITUTIONAL_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_VOTTI_SITE_URL?.trim()) ||
  "https://vottii.com";

/** Nome da marca exibido ao usuário (domínio: vottii.com). */
export const VOTTII_DISPLAY_NAME = "VOTTII";

/** Logo principal do site (public/logo-full.png). */
export const VOTTI_LOGO_PATH = "/logo-full.png";

/** Logo anterior preservada em public/logo-full-legacy.png. */
export const VOTTI_LOGO_LEGACY_PATH = "/logo-full-legacy.png";
