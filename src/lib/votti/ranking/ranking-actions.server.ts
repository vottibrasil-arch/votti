import { createServerFn } from "@tanstack/react-start";

import { createInitialRankingSnapshot } from "@/lib/votti/ranking/snapshot.server";

export const initializePollRankingFn = createServerFn({ method: "POST" })
  .validator((data: { slug?: string }) => ({
    slug: typeof data.slug === "string" ? data.slug.trim() : "",
  }))
  .handler(async ({ data }) => {
    if (!data.slug) return { ok: false as const };
    await createInitialRankingSnapshot(data.slug);
    return { ok: true as const };
  });
