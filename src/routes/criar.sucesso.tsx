import { createFileRoute } from "@tanstack/react-router";
import { PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { AppPageFrame } from "@/components/app/app-page-frame";
import { AppPageBar } from "@/components/app/app-top-bar";
import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";
import { PollSharePanel } from "@/components/votti/poll-share-panel";
import { SecurityBadge } from "@/components/votti/security-badge";
import { getPollBySlug, pollPublicUrl, pollTelaoUrl } from "@/lib/votti/poll-store";
import type { StoredPoll } from "@/lib/votti/poll-types";

type SucessoSearch = { slug?: string };

export const Route = createFileRoute("/criar/sucesso")({
  validateSearch: (search: Record<string, unknown>): SucessoSearch => ({
    slug: typeof search.slug === "string" ? search.slug : undefined,
  }),
  head: () => ({ meta: [{ title: "VOTTI — Votação publicada" }] }),
  component: SucessoPage,
});

function SucessoPage() {
  const { slug } = Route.useSearch();
  const [title, setTitle] = useState("Sua votação");
  const [poll, setPoll] = useState<StoredPoll | null>(null);
  const url = slug ? pollPublicUrl(slug) : "";
  const telaoUrl = slug ? pollTelaoUrl(slug) : "";

  useEffect(() => {
    if (!slug) return;
    void getPollBySlug(slug).then((data) => {
      if (data) {
        setPoll(data);
        setTitle(data.title);
      }
    });
  }, [slug]);

  return (
    <AppShell>
      <AppPageFrame contentClassName="votti-app-page__body--md text-center">
        <AppPageBar back="/minhas" title="Publicada" />
        <div className="votti-success animate-rise">
          <div className="votti-success__trust">
            <SecurityBadge compact />
          </div>

          <div className="votti-success__celebrate" aria-hidden>
            <PartyPopper className="size-8 text-[oklch(0.72_0.18_145)]" />
          </div>

          <p className="votti-success__label">Publicada!</p>
          <h1 className="votti-success__title">{title}</h1>

          {slug ? (
            <>
              <div className="votti-success__qr" aria-hidden>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`}
                  alt="QR Code da votação"
                  width={180}
                  height={180}
                />
              </div>

              <p className="votti-success__url">{url}</p>

              <PollSharePanel
                slug={slug}
                title={title}
                variant="success"
                telaoUrl={telaoUrl}
              />
            </>
          ) : null}

          {poll?.questions[0] ? (
            <div className="mt-6 text-left">
              <PollRankingPreview
                title={poll.title}
                question={poll.questions[0]}
                primaryColor={poll.primaryColor}
                live
              />
            </div>
          ) : null}
        </div>
      </AppPageFrame>
    </AppShell>
  );
}
