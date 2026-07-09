/** URL pública do app (ex.: https://votti.app). Links compartilhados usam este domínio. */
export function getPublicAppOrigin(): string {
  const configured =
    typeof import.meta !== "undefined" ? import.meta.env.VITE_APP_URL?.trim() : undefined;

  if (configured && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(configured)) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}
