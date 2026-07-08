import type { NavigateOptions } from "@tanstack/react-router";

const ALLOWED = new Set(["/criar", "/minhas"]);

export function sanitizeRedirect(path: string | undefined): "/criar" | "/minhas" | "/" {
  if (path && ALLOWED.has(path)) return path as "/criar" | "/minhas";
  return "/";
}

export function authSearch(redirect?: string) {
  const safe = sanitizeRedirect(redirect);
  return safe === "/" ? {} : { redirect: safe };
}

export function navigateAfterAuth(
  navigate: (opts: NavigateOptions) => void,
  redirect?: string,
) {
  navigate({ to: sanitizeRedirect(redirect), replace: true });
}
