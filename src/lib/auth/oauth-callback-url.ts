import { sanitizeRedirect } from "@/lib/auth/redirect";
import { getPublicAppOrigin } from "@/lib/votti/app-url";

/** URL de retorno do Google OAuth — deve estar cadastrada no Supabase (Authentication → URL Configuration). */
export function buildOAuthCallbackUrl(redirect?: string): string {
  const callbackUrl = new URL("/auth/callback", getPublicAppOrigin());
  const safeRedirect = sanitizeRedirect(redirect);
  if (safeRedirect !== "/") {
    callbackUrl.searchParams.set("redirect", safeRedirect);
  }
  return callbackUrl.toString();
}
