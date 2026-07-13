const LEGAL_PATHS = new Set(["/termos-de-uso", "/politica-de-privacidade", "/contato"]);

export type LegalReturnSearch = {
  from?: string;
};

export function validateLegalReturnSearch(search: Record<string, unknown>): LegalReturnSearch {
  return {
    from: typeof search.from === "string" && search.from.trim() ? search.from.trim() : undefined,
  };
}

/** Aceita só rotas internas seguras (evita open redirect). */
export function parseLegalReturnPath(from: unknown): string | undefined {
  if (typeof from !== "string" || !from.trim()) return undefined;

  const value = from.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;

  const pathname = value.split("?")[0].split("#")[0];
  if (LEGAL_PATHS.has(pathname)) return undefined;

  return value;
}

export function isLegalPathname(pathname: string): boolean {
  return LEGAL_PATHS.has(pathname);
}

export function formatLocationSearch(search: unknown): string {
  if (!search) return "";
  if (typeof search === "string") {
    if (!search) return "";
    return search.startsWith("?") ? search : `?${search}`;
  }
  if (typeof search !== "object") return "";

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getSearchParam(search: unknown, key: string): string | null {
  if (typeof search === "string") {
    const qs = search.startsWith("?") ? search.slice(1) : search;
    return new URLSearchParams(qs).get(key);
  }
  if (search && typeof search === "object" && key in search) {
    const value = (search as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
    if (value != null) return String(value);
  }
  return null;
}

/** Página atual ou ?from= para links de Termos/Privacidade. */
export function resolveLegalReturnTarget(
  pathname: string,
  search: unknown,
  hash: string,
  fromParam?: string | null,
): string {
  const parsedFrom = parseLegalReturnPath(fromParam);
  if (parsedFrom) return parsedFrom;

  if (isLegalPathname(pathname)) return "/";

  return `${pathname}${formatLocationSearch(search)}${hash}`;
}

export function parseLegalBackLink(backTo: string): {
  to: string;
  search?: Record<string, string>;
  hash?: string;
} {
  const hashIndex = backTo.indexOf("#");
  const pathPart = hashIndex >= 0 ? backTo.slice(0, hashIndex) : backTo;
  const hash = hashIndex >= 0 ? backTo.slice(hashIndex) : undefined;
  const [pathname, query = ""] = pathPart.split("?");
  const params = new URLSearchParams(query);
  if (params.size === 0) {
    return { to: pathname || "/", hash };
  }
  const search: Record<string, string> = {};
  params.forEach((value, key) => {
    search[key] = value;
  });
  return { to: pathname || "/", search, hash };
}
