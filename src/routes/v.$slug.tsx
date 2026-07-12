import { createFileRoute } from "@tanstack/react-router";
import { PollVoteScreen } from "@/components/votti/poll-vote-screen";
import { getServerPublicOrigin } from "@/lib/votti/app-url";
import { loadPollShareMeta } from "@/lib/votti/poll-share-loader.server";
import { buildPollShareHead } from "@/lib/votti/poll-share-meta";
import { pollPublicUrl } from "@/lib/votti/poll-store";

export const Route = createFileRoute("/v/$slug")({
  loader: async ({ params }) => ({
    share: await loadPollShareMeta(params.slug),
  }),
  head: ({ loaderData, params }) => {
    const share = loaderData?.share;
    if (!share) {
      return { meta: [{ title: `VOTTII — Votar (${params.slug})` }] };
    }

    return buildPollShareHead(share, pollPublicUrl(params.slug), "vote", getServerPublicOrigin());
  },
  component: VotePage,
});

function VotePage() {
  const { slug } = Route.useParams();
  return <PollVoteScreen slug={slug} />;
}
