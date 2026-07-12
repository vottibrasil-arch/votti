import { createFileRoute } from "@tanstack/react-router";
import { PollVoteScreen } from "@/components/votti/poll-vote-screen";

export const Route = createFileRoute("/v/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `VOTTII — Votar (${params.slug})` }],
  }),
  component: VotePage,
});

function VotePage() {
  const { slug } = Route.useParams();
  return <PollVoteScreen slug={slug} />;
}
