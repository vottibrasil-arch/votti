import { resolveShareOrigin } from "@/lib/bolao/share-url";

export function getAuthRedirectOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return resolveShareOrigin(import.meta.env.VITE_APP_URL ?? "http://localhost:8080");
}

export function buildOAuthCallbackUrl(redirectPath = "/create") {
  const origin = getAuthRedirectOrigin().replace(/\/$/, "");
  const safeRedirect = redirectPath.startsWith("/") ? redirectPath : "/create";
  return `${origin}/auth/callback?redirect=${encodeURIComponent(safeRedirect)}`;
}

export async function signInWithGoogleOAuth(redirectPath = "/create") {
  const { getSupabaseBrowser } = await import("@/lib/api/supabase-browser");
  const { error } = await getSupabaseBrowser().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildOAuthCallbackUrl(redirectPath),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}
