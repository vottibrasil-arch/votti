import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { PollVoteScreen } from "@/components/votti/poll-vote-screen";

export const Route = createFileRoute("/v/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `VOTTI — Votar (${params.slug})` }],
  }),
  component: VotePage,
});

function VotePage() {
  const { slug } = Route.useParams();

  return (
    <AppShell>
      <PollVoteScreen slug={slug} />
    </AppShell>
  );
}
