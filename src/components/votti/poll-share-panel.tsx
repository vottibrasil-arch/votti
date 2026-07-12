import { Link, type LinkProps } from "@tanstack/react-router";
import { Copy, ExternalLink, MessageCircle, Monitor, Plus, Share2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { pollPublicUrl } from "@/lib/votti/poll-store";

type PollSharePanelProps = {
  slug: string;
  title: string;
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
  variant = "default",
  telaoUrl,
}: PollSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const voteUrl = pollPublicUrl(slug);

  async function copy() {
    await navigator.clipboard.writeText(voteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Vote em "${title}": ${voteUrl}`)}`,
      "_blank",
    );
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `VOTTII — ${title}`, url: voteUrl });
        return;
      } catch {
        /* cancelado */
      }
    }
    await copy();
  }

  const actions: ShareAction[] = [
    {
      key: "copy",
      name: copied ? "Copiado" : "Copiar",
      icon: <Copy className="size-3.5" aria-hidden />,
      tone: "copy",
      onClick: () => void copy(),
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

  if (variant === "footer") {
    return (
      <footer className="votti-share-dock animate-rise">
        <ShareDockCard>
          <div className="votti-share-dock__head">
            <span className="votti-share-dock__label">Compartilhe</span>
            <span className="votti-share-dock__hint">espalhe o link ao vivo</span>
          </div>
          <ShareDockActions actions={actions} />
          <ShareDockLink
            to="/criar"
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
