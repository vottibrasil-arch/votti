/** Site institucional oficial do VOTTI (política, termos, etc.). */
export const VOTTI_INSTITUTIONAL_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_VOTTI_SITE_URL?.trim()) ||
  "https://vottii.com";
