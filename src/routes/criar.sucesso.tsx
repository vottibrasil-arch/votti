import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, ExternalLink, MessageCircle, PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/app-shell";
import { AppTopBar } from "@/components/app/app-top-bar";
import { PollRankingPreview } from "@/components/votti/poll-ranking-preview";
import { SecurityBadge } from "@/components/votti/security-badge";
import { getPollBySlug, pollPublicUrl } from "@/lib/votti/poll-store";
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
  const [copied, setCopied] = useState(false);
  const [poll, setPoll] = useState<StoredPoll | null>(null);
  const url = slug ? pollPublicUrl(slug) : "";

  useEffect(() => {
    if (!slug) return;
    void getPollBySlug(slug).then((data) => {
      if (data) {
        setPoll(data);
        setTitle(data.title);
      }
    });
  }, [slug]);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Vote agora: ${url}`)}`, "_blank");
  }

  return (
    <AppShell feed={false}>
      <div className="votti-app-page flex-1 px-5 pb-10 max-w-md mx-auto w-full text-center">
        <AppTopBar back="/minhas" trust={false} />
        <div className="votti-success animate-rise">
          <div className="votti-success__trust">
            <SecurityBadge compact />
          </div>

          <div className="votti-success__celebrate" aria-hidden>
            <PartyPopper className="size-8 text-[oklch(0.72_0.18_145)]" />
          </div>

          <p className="votti-success__label">Publicada!</p>
          <h1 className="votti-success__title">{title}</h1>
          <p className="votti-wizard__hint mb-4">
            Compartilhe o link — o ranking atualiza ao vivo conforme os votos chegam.
          </p>

          <div className="votti-success__qr" aria-hidden>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`}
              alt="QR Code da votação"
              width={180}
              height={180}
            />
          </div>

          <p className="votti-success__url">{url}</p>

          <div className="votti-success__actions">
            <button type="button" className="votti-outline-btn" onClick={() => void copyLink()}>
              <Copy className="size-4" /> {copied ? "Copiado!" : "Copiar link"}
            </button>
            <button type="button" className="votti-outline-btn" onClick={shareWhatsApp}>
              <MessageCircle className="size-4" /> WhatsApp
            </button>
            {slug ? (
              <Link to="/v/$slug" params={{ slug }} className="votti-mega-btn votti-mega-btn--sm">
                <ExternalLink className="size-4" /> Abrir votação
              </Link>
            ) : null}
          </div>

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
      </div>
    </AppShell>
  );
}
