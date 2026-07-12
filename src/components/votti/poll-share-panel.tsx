import { Link, type LinkProps } from "@tanstack/react-router";
import { Copy, ExternalLink, MessageCircle, Monitor, Plus, Share2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { buildPollShareWhatsAppText, type PollShareKind } from "@/lib/votti/poll-share-meta";
import { getPublicAppOrigin } from "@/lib/votti/app-url";
import { pollPublicUrl, pollResultsUrl, pollTelaoUrl } from "@/lib/votti/poll-store";
import { VOTTII_DISPLAY_NAME } from "@/lib/votti/brand";

type PollSharePanelProps = {
  slug: string;
  title: string;
  description?: string;
  shareKind?: PollShareKind;
  variant?: "default" | "footer" | "success";
  telaoUrl?: string;
};

type ShareAction = {
  key: string;
  name: string;
  icon: ReactNode;
  tone: "copy" | "whatsapp" | "share";
  onClick: () => void;
};

type ShareDockLinkProps = {
  name: string;
  icon: ReactNode;
  href?: string;
  to?: LinkProps["to"];
  params?: LinkProps["params"];
};

function ShareDockCard({ children }: { children: ReactNode }) {
  return <div className="votti-share-dock__card">{children}</div>;
}

function ShareDockActions({ actions }: { actions: ShareAction[] }) {
  return (
    <div className="votti-share-dock__actions">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={`votti-share-dock__btn votti-share-dock__btn--${action.tone}`}
          onClick={action.onClick}
        >
          <span className="votti-share-dock__btn-icon">{action.icon}</span>
          <span className="votti-share-dock__btn-label">{action.name}</span>
        </button>
      ))}
    </div>
  );
}

function ShareDockLink({ name, icon, href, to, params }: ShareDockLinkProps) {
  const className = "votti-share-dock__link";
  const content = (
    <>
      <span className="votti-share-dock__link-icon">{icon}</span>
      <span className="votti-share-dock__link-label">{name}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  if (to) {
    return (
      <Link to={to} params={params} className={className}>
        {content}
      </Link>
    );
  }

  return null;
}

export function PollSharePanel({
  slug,
  title,
  description = "",
  shareKind,
  variant = "default",
  telaoUrl,
}: PollSharePanelProps) {
  const [copiedVote, setCopiedVote] = useState(false);
  const [copiedTelao, setCopiedTelao] = useState(false);

  const telaoLink = telaoUrl ?? pollTelaoUrl(slug);
  const isResultsFooter = variant === "footer";
  const kind: PollShareKind = isResultsFooter ? "vote" : (shareKind ?? "vote");
  const shareUrl = kind === "results" ? pollResultsUrl(slug) : pollPublicUrl(slug);
  const shareText = buildPollShareWhatsAppText({
    title,
    description,
    url: shareUrl,
    kind,
  });

  async function copyVoteLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedVote(true);
    setTimeout(() => setCopiedVote(false), 2000);
  }

  async function copyTelaoLink() {
    await navigator.clipboard.writeText(telaoLink);
    setCopiedTelao(true);
    setTimeout(() => setCopiedTelao(false), 2000);
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${VOTTII_DISPLAY_NAME} — ${title}`,
          text: shareText,
        });
        return;
      } catch {
        /* cancelado */
      }
    }
    await copyVoteLink();
  }

  const footerActions: ShareAction[] = [
    {
      key: "telao",
      name: copiedTelao ? "Copiado" : "Link do telão",
      icon: <Monitor className="size-3.5" aria-hidden />,
      tone: "copy",
      onClick: () => void copyTelaoLink(),
    },
    {
      key: "whatsapp",
      name: "WhatsApp",
      icon: <MessageCircle className="size-3.5" aria-hidden />,
      tone: "whatsapp",
      onClick: shareWhatsApp,
    },
    {
      key: "share",
      name: "Enviar",
      icon: <Share2 className="size-3.5" aria-hidden />,
      tone: "share",
      onClick: () => void nativeShare(),
    },
  ];

  const defaultActions: ShareAction[] = [
    {
      key: "copy",
      name: copiedVote ? "Copiado" : "Copiar",
      icon: <Copy className="size-3.5" aria-hidden />,
      tone: "copy",
      onClick: () => void copyVoteLink(),
    },
    {
      key: "whatsapp",
      name: "WhatsApp",
      icon: <MessageCircle className="size-3.5" aria-hidden />,
      tone: "whatsapp",
      onClick: shareWhatsApp,
    },
    {
      key: "share",
      name: "Enviar",
      icon: <Share2 className="size-3.5" aria-hidden />,
      tone: "share",
      onClick: () => void nativeShare(),
    },
  ];

  const actions = isResultsFooter ? footerActions : defaultActions;

  if (variant === "footer") {
    return (
      <footer className="votti-share-dock animate-rise">
        <ShareDockCard>
          <div className="votti-share-dock__head">
            <span className="votti-share-dock__label">Compartilhe</span>
            <span className="votti-share-dock__hint">convide a votar</span>
          </div>
          <ShareDockActions actions={actions} />
          <ShareDockLink
            href={getPublicAppOrigin()}
            name="Criar votação"
            icon={<Plus className="size-3.5" aria-hidden />}
          />
        </ShareDockCard>
      </footer>
    );
  }

  if (variant === "success") {
    return (
      <section className="votti-share-dock votti-share-dock--embedded animate-rise">
        <ShareDockCard>
          <div className="votti-share-dock__head">
            <span className="votti-share-dock__label">Compartilhe</span>
            <span className="votti-share-dock__hint">ranking ao vivo</span>
          </div>
          <ShareDockActions actions={actions} />
          <div className="votti-share-dock__links">
            {telaoUrl ? (
              <ShareDockLink
                href={telaoUrl}
                name="Telão"
                icon={<Monitor className="size-3.5" aria-hidden />}
              />
            ) : null}
            <ShareDockLink
              to="/votacao/$slug/resultados"
              params={{ slug }}
              name="Ver resultados"
              icon={<ExternalLink className="size-3.5" aria-hidden />}
            />
            <ShareDockLink
              to="/v/$slug"
              params={{ slug }}
              name="Abrir votação"
              icon={<ExternalLink className="size-3.5" aria-hidden />}
            />
          </div>
        </ShareDockCard>
      </section>
    );
  }

  return (
    <div className="votti-share-dock votti-share-dock--embedded animate-rise">
      <ShareDockCard>
        <div className="votti-share-dock__head">
          <span className="votti-share-dock__label">Compartilhar</span>
        </div>
        <ShareDockActions actions={actions} />
      </ShareDockCard>
    </div>
  );
}
