import { createServerFn } from "@tanstack/react-start";

import { buildPollMetaFromDb } from "@/lib/votti/ranking/poll-meta.server";
import type { PollShareMeta } from "@/lib/votti/poll-share-meta";
import { getPollCoverUrl } from "@/lib/votti/poll-types";

export const loadPollShareMetaFn = createServerFn({ method: "GET" })
  .validator((slug: string) => slug.trim())
  .handler(async ({ data: slug }): Promise<PollShareMeta | null> => {
    const poll = await buildPollMetaFromDb(slug);
    if (!poll) return null;

    return {
      slug: poll.slug,
      title: poll.title,
      description: poll.description,
      coverUrl: getPollCoverUrl(poll),
    };
  });
