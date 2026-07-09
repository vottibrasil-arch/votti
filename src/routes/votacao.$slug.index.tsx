import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { resolveVoterPollDestination } from "@/lib/votti/poll-store";
import { isPollLockedForVoter } from "@/lib/votti/voter-session";

export const Route = createFileRoute("/votacao/$slug/")({
  component: VotacaoEntryPage,
});

/** /votacao/:slug — redireciona para voto ou ranking. */
function VotacaoEntryPage() {
  const { slug } = Route.useParams();
  const [dest, setDest] = useState<"results" | "vote" | null>(() =>
    isPollLockedForVoter(slug) ? "results" : null,
  );

  useEffect(() => {
    if (dest) return;

    let cancelled = false;
    void resolveVoterPollDestination(slug).then((next) => {
      if (!cancelled) setDest(next);
    });

    return () => {
      cancelled = true;
    };
  }, [slug, dest]);

  if (dest === "results") {
    return <Navigate to="/votacao/$slug/resultados" params={{ slug }} replace />;
  }

  if (dest === "vote") {
    return <Navigate to="/v/$slug" params={{ slug }} replace />;
  }

  return (
    <div className="votti-vote-page flex-1 flex items-center justify-center px-5 min-h-[50dvh]">
      <p className="votti-app-muted">Carregando…</p>
    </div>
  );
}
