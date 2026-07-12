/** URL pública do app (ex.: https://vottii.com). Links compartilhados usam este domínio. */
export function getPublicAppOrigin(): string {
  const configured =
    typeof import.meta !== "undefined" ? import.meta.env.VITE_APP_URL?.trim()?.replace(/\/$/, "") : undefined;

  if (typeof window !== "undefined") {
    const current = window.location.origin;
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(current)) {
      return current;
    }
    return configured || current;
  }

  return getServerPublicOrigin();
}

/** Origem usada no SSR (meta tags OG / WhatsApp). */
export function getServerPublicOrigin(): string {
  const appUrl =
    typeof import.meta !== "undefined" ? import.meta.env.VITE_APP_URL?.trim()?.replace(/\/$/, "") : undefined;
  const siteUrl =
    typeof import.meta !== "undefined"
      ? import.meta.env.VITE_VOTTI_SITE_URL?.trim()?.replace(/\/$/, "")
      : undefined;

  const configured = appUrl || siteUrl;
  if (configured && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(configured)) {
    return configured;
  }

  return "https://vottii.com";
}
