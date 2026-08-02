import type { PatrocinadoresProviderConfig } from "./types";

export { PATROCINADORES_PAGE_PATH, PATROCINADORES_FRAME_SRC } from "./config";
export type { PatrocinadoresProviderConfig, PatrocinadoresProviderId } from "./types";
export { MonetagAdSlot } from "./monetag-ad-slot";

export function getPatrocinadoresProviderConfig(): PatrocinadoresProviderConfig {
  return { id: "monetag" };
}
