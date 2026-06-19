const LOCALHOST_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function readClientAppUrl(): string | undefined {
  if (typeof import.meta === "undefined") return undefined;
  const raw = import.meta.env?.VITE_APP_URL;
  return typeof raw === "string" && raw.trim() ? normalizeOrigin(raw.trim()) : undefined;
}

export function isLocalhostShareOrigin(origin: string): boolean {
  return LOCALHOST_ORIGIN_RE.test(normalizeOrigin(origin));
}

/** Origem para links compartilháveis — evita localhost (não abre no celular). */
export function resolveShareOrigin(explicitOrigin?: string): string {
  const configured = readClientAppUrl();

  const resolveCandidate = (candidate?: string) => {
    if (!candidate) return undefined;
    const clean = normalizeOrigin(candidate);
    if (!isLocalhostShareOrigin(clean)) return clean;
    if (configured && !isLocalhostShareOrigin(configured)) return configured;
    return clean;
  };

  const fromExplicit = resolveCandidate(explicitOrigin);
  if (fromExplicit) return fromExplicit;

  if (typeof window !== "undefined") {
    const fromWindow = resolveCandidate(window.location.origin);
    if (fromWindow) return fromWindow;
  }

  if (configured) return configured;
  return "http://localhost:8080";
}

export function getShareUrlMobileWarning(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    if (hostname !== "localhost" && hostname !== "127.0.0.1") return null;

    const configured = readClientAppUrl();
    const hint =
      configured && !isLocalhostShareOrigin(configured)
        ? ` No celular, use: ${configured} (mesma rede Wi‑Fi).`
        : " Coloque no .env: VITE_APP_URL=http://SEU-IP:8080 ou publique na Vercel.";

    return `Este link não abre no celular — localhost só funciona no computador.${hint}`;
  } catch {
    return null;
  }
}

/** URL do convidado — participação pública, nunca painel admin. */
export function buildBolaoJoinPath(slug: string) {
  return `/join?bolao=${encodeURIComponent(slug)}&guest=1`;
}

export function buildBolaoGuestJoinSearch(slug: string) {
  return { bolao: slug, guest: "1" as const };
}

/** Resultado final para convidado — nunca painel admin. */
export function buildBolaoGuestFinalPath(slug: string) {
  return `/final?bolao=${encodeURIComponent(slug)}&guest=1`;
}

export function buildBolaoGuestFinalSearch(slug: string) {
  return { bolao: slug, guest: "1" as const };
}

/** URL pública para assistir o ranking ao vivo do bolão. */
export function buildBolaoLivePath(slug: string) {
  return `/live?bolao=${encodeURIComponent(slug)}`;
}

/** Link de acesso do dono — administrar bolão (não compartilhar com participantes). */
export function buildBolaoAdminPath(slug: string) {
  return `/admin?bolao=${encodeURIComponent(slug)}`;
}

export function buildBolaoJoinUrl(slug: string, origin?: string) {
  return `${resolveShareOrigin(origin)}${buildBolaoJoinPath(slug)}`;
}

export function buildBolaoLiveUrl(slug: string, origin?: string) {
  return `${resolveShareOrigin(origin)}${buildBolaoLivePath(slug)}`;
}

export function buildBolaoAdminUrl(slug: string, origin?: string) {
  return `${resolveShareOrigin(origin)}${buildBolaoAdminPath(slug)}`;
}

export function buildBolaoGuestFinalUrl(slug: string, origin?: string) {
  return `${resolveShareOrigin(origin)}${buildBolaoGuestFinalPath(slug)}`;
}
