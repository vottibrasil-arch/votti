const LOCALHOST_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function isLocalhost(origin: string): boolean {
  return LOCALHOST_ORIGIN_RE.test(normalizeOrigin(origin));
}

/** Origem pública para links gerados no servidor (SSR, e-mail, etc.). */
export function resolveServerShareOrigin(): string {
  const configured = process.env.VITE_APP_URL?.trim();
  if (configured && !isLocalhost(configured)) {
    return normalizeOrigin(configured);
  }

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    return normalizeOrigin(`https://${vercelHost}`);
  }

  if (configured) return normalizeOrigin(configured);
  return "http://localhost:8080";
}
