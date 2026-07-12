import { buildPollMetaFromDb } from "@/lib/votti/ranking/poll-meta.server";
import type { PollShareMeta } from "@/lib/votti/poll-share-meta";
import { getPollCoverUrl } from "@/lib/votti/poll-types";

/** Carrega metadados para OG/WhatsApp — só no servidor (SSR). */
export async function loadPollShareMeta(slug: string): Promise<PollShareMeta | null> {
  try {
    const poll = await buildPollMetaFromDb(slug.trim());
    if (!poll) return null;

    return {
      slug: poll.slug,
      pollId: poll.id,
      title: poll.title,
      description: poll.description,
      coverUrl: getPollCoverUrl(poll),
    };
  } catch (err) {
    console.error("[votti] loadPollShareMeta failed", slug, err);
    return null;
  }
}
