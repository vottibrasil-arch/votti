import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PollPublicShell } from "@/components/votti/poll-public-shell";
import { PublicLegalFooter } from "@/components/votti/legal/public-legal-footer";
import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";
import { PollSharePanel } from "@/components/votti/poll-share-panel";
import { SecurityBadge } from "@/components/votti/security-badge";
import { VoteSuccessBanner } from "@/components/votti/vote-confirmed-screen";
import { getServerPublicOrigin } from "@/lib/votti/app-url";
import { loadPollShareMetaFn } from "@/lib/votti/poll-share-loader.server";
import { buildPollShareHead } from "@/lib/votti/poll-share-meta";
import { formatPollStats } from "@/lib/votti/poll-stats";
import { pollPublicUrl, pollResultsUrl } from "@/lib/votti/poll-store";
import { rankingStateToStoredPoll } from "@/lib/votti/ranking/client";
import { getPollCoverUrl } from "@/lib/votti/poll-types";
import { usePollRankingLive } from "@/lib/votti/use-poll-ranking-live";

type ResultadosSearch = {
  confirmado?: string;
};

export const Route = createFileRoute("/votacao/$slug/resultados")({
  validateSearch: (search: Record<string, unknown>): ResultadosSearch => ({
    confirmado: typeof search.confirmado === "string" ? search.confirmado : undefined,
  }),
  loader: async ({ params }) => ({
    share: await loadPollShareMetaFn({ data: params.slug }),
  }),
  head: ({ loaderData, params }) => {
    const share = loaderData?.share;
    if (!share) {
      return { meta: [{ title: "VOTTII — Ranking ao vivo" }] };
    }

    return buildPollShareHead(
      share,
      pollResultsUrl(params.slug),
      "results",
      getServerPublicOrigin(),
    );
  },
  component: ResultadosPage,
});

function ResultadosPage() {
  const { slug } = Route.useParams();
  const { confirmado } = Route.useSearch();
  const navigate = useNavigate();
  const cameFromConfirm = confirmado === "1";
  const [showSuccessBanner, setShowSuccessBanner] = useState(cameFromConfirm);

  const { state, status, error } = usePollRankingLive({ slug, enabled: true });
  const poll = useMemo(() => (state ? rankingStateToStoredPoll(state) : null), [state]);
  const displayPoll = poll;

  useEffect(() => {
    if (!cameFromConfirm) return;

    navigate({
      to: "/votacao/$slug/resultados",
      params: { slug },
      replace: true,
    });

    const hideTimer = window.setTimeout(() => setShowSuccessBanner(false), 5000);
    return () => window.clearTimeout(hideTimer);
  }, [cameFromConfirm, navigate, slug]);

  useEffect(() => {
    if (!showSuccessBanner || !displayPoll) return;

    const scrollTimer = window.setTimeout(() => {
      document.getElementById("ranking")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 220);

    return () => window.clearTimeout(scrollTimer);
  }, [showSuccessBanner, displayPoll]);

  if (status === "connecting" && !displayPoll) {
    return (
      <main className="votti-public-poll votti-public-poll--minimal-cover min-h-[100dvh] flex flex-col">
        <div className="votti-vote-page flex-1 flex flex-col px-4 pb-6 max-w-lg mx-auto w-full">
          {showSuccessBanner ? <VoteSuccessBanner className="mt-4" /> : null}
          <div id="ranking" className="votti-results-loading flex-1 flex items-center justify-center">
            <p className="votti-app-muted">Carregando ranking ao vivo…</p>
          </div>
        </div>
        <PublicLegalFooter pollUrl={pollPublicUrl(slug)} />
      </main>
    );
  }

  if (!displayPoll) {
    const syncing = status === "error" && !error.includes("não encontrada");
    return (
      <main className="votti-public-poll votti-public-poll--minimal-cover min-h-[100dvh] flex flex-col">
        <div className="votti-vote-page flex-1 flex items-center justify-center px-5 text-center">
          <div className="votti-quest max-w-sm w-full">
            <p className="votti-quest__label">{syncing ? "Ranking" : "Ops"}</p>
            <h1 className="votti-quest__title">
              {syncing ? "Sincronizando ranking…" : "Votação não encontrada"}
            </h1>
            <p className="votti-quest__hint">
              {syncing
                ? "Os votos estão no sistema; o snapshot público ainda está sendo gerado. Atualize em alguns segundos."
                : error || "Este link pode estar errado ou a votação foi encerrada."}
            </p>
          </div>
        </div>
        <PublicLegalFooter pollUrl={pollPublicUrl(slug)} />
      </main>
    );
  }

  const liveOn = status === "live";
  const liveLabel = status === "connecting" ? "CONECTANDO…" : "AO VIVO";
  const coverUrl = getPollCoverUrl(displayPoll);

  return (
    <PollPublicShell poll={displayPoll} coverStyle="minimal">
      <div className="votti-results-page flex-1 px-4 pb-6 max-w-lg mx-auto w-full">
        {showSuccessBanner ? <VoteSuccessBanner className="mt-3 mb-1" /> : null}

        <div className="votti-results-hero animate-rise">
          {coverUrl ? (
            <div
              className="votti-results-hero__cover"
              style={{ backgroundImage: `url(${coverUrl})` }}
              aria-hidden
            />
          ) : (
            <div className="votti-results-hero__cover votti-results-hero__cover--accent" aria-hidden />
          )}

          <div className="votti-results-hero__body">
            <div className="votti-results-hero__meta">
              <SecurityBadge compact />
              <span
                className={`votti-results-hero__live ${liveOn || status !== "connecting" ? "votti-results-hero__live--on" : "votti-results-hero__live--sync"}`}
              >
                <span className="votti-results-hero__live-dot" aria-hidden />
                {liveLabel}
              </span>
            </div>
            <h1 className="votti-results-hero__title">{displayPoll.title}</h1>
            <p className="votti-results-hero__stats tabular-nums">{formatPollStats(displayPoll)}</p>
          </div>
        </div>

        <div id="ranking" className="votti-results-official animate-rise scroll-mt-4">
          {displayPoll.questions.map((q) => (
            <section key={q.id}>
              <PollRankingPreview
                question={q}
                primaryColor={displayPoll.primaryColor}
                featured
                hideTitle
                hideFeaturedLive
                live={liveOn}
                sortByVotes
              />
            </section>
          ))}
        </div>

        <PollSharePanel
          slug={slug}
          title={displayPoll.title}
          description={displayPoll.description}
          shareKind="results"
          variant="footer"
        />
      </div>
    </PollPublicShell>
  );
}
