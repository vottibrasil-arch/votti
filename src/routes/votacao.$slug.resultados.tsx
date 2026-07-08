import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";
import { SecurityBadge } from "@/components/votti/security-badge";
import { LiveDot } from "@/components/ui-kit";
import { getPollBySlug, getPollErrorMessage } from "@/lib/votti/poll-store";
import type { StoredPoll } from "@/lib/votti/poll-types";
import { usePollRealtime } from "@/lib/votti/use-poll-realtime";

export const Route = createFileRoute("/votacao/$slug/resultados")({
  head: () => ({ meta: [{ title: "VOTTI — Resultados" }] }),
  component: ResultadosPage,
});

function ResultadosPage() {
  const { slug } = Route.useParams();
  const [poll, setPoll] = useState<StoredPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshPoll = useCallback(async () => {
    try {
      const data = await getPollBySlug(slug);
      setPoll(data);
      setError(data ? "" : "Votação não encontrada.");
    } catch (err) {
      setError(getPollErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refreshPoll();
  }, [refreshPoll]);

  const { status } = usePollRealtime({
    pollId: poll?.id,
    enabled: Boolean(poll?.id),
    onRefresh: refreshPoll,
  });

  if (loading) {
    return (
      <AppShell>
        <div className="votti-vote-page flex-1 flex items-center justify-center px-5">
          <p className="votti-app-muted">Carregando resultados…</p>
        </div>
      </AppShell>
    );
  }

  if (!poll) {
    return (
      <AppShell>
        <div className="votti-vote-page flex-1 flex items-center justify-center px-5">
          <p className="votti-app-muted">{error || "Votação não encontrada."}</p>
        </div>
      </AppShell>
    );
  }

  const liveLabel =
    status === "connected" ? "ao vivo" : status === "connecting" ? "conectando…" : "atualizando";

  return (
    <AppShell>
      <div className="votti-vote-page flex-1 px-5 pb-10 max-w-lg mx-auto w-full">
        <div className="votti-results-hero animate-rise">
          <SecurityBadge compact />
          <h1 className="votti-results__title">{poll.title}</h1>
          <p className="votti-results__meta tabular-nums">
            <LiveDot />
            {poll.totalVotes} voto{poll.totalVotes === 1 ? "" : "s"} · {liveLabel}
          </p>
        </div>

        <div className="votti-results__stack">
          {poll.questions.map((q) => (
            <section key={q.id} className="votti-results__block animate-rise">
              <PollRankingPreview
                title={poll.title}
                question={q}
                primaryColor={poll.primaryColor}
                live
              />
            </section>
          ))}
        </div>

        <div className="votti-vote-footer">
          <Link to="/v/$slug" params={{ slug }} className="votti-mega-btn votti-mega-btn--sm">
            <BarChart3 className="size-4" /> Voltar para votar
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
