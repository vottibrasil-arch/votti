import { resolveShareOrigin } from "./share-url";

export function buildCampeonatoSharePath(slug: string) {
  return `/campeonato/${slug}`;
}

export function buildCampeonatoShareUrl(slug: string, origin?: string) {
  return `${resolveShareOrigin(origin)}${buildCampeonatoSharePath(slug)}`;
}
