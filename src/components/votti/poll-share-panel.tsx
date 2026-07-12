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
  hint: string;
  icon: ReactNode;
  tone: "copy" | "whatsapp" | "share";
  onClick: () => void;
};

type ShareWideCardProps = {
  name: string;
  hint: string;
  icon: ReactNode;
  tone: "create" | "telao" | "open";
  href?: string;
  to?: LinkProps["to"];
  params?: LinkProps["params"];
};

function ShareWideCard({ name, hint, icon, tone, href, to, params }: ShareWideCardProps) {
  const className = `votti-share-card votti-share-card--wide votti-share-card--${tone}`;
  const content = (
    <>
      <span className="votti-share-card__icon-wrap">{icon}</span>
      <span className="votti-share-card__body">
        <span className="votti-share-card__name">{name}</span>
        <span className="votti-share-card__hint">{hint}</span>
      </span>
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

function ShareActionGrid({ actions }: { actions: ShareAction[] }) {
  return (
    <div className="votti-share-footer__grid">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={`votti-share-card votti-share-card--${action.tone}`}
          onClick={action.onClick}
        >
          <span className="votti-share-card__icon-wrap">{action.icon}</span>
          <span className="votti-share-card__name">{action.name}</span>
          <span className="votti-share-card__hint">{action.hint}</span>
        </button>
      ))}
    </div>
  );
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
        await navigator.share({ title: `VOTTI — ${title}`, url: voteUrl });
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
      name: copied ? "Copiado!" : "Copiar",
      hint: "link",
      icon: <Copy className="size-5" aria-hidden />,
      tone: "copy",
      onClick: () => void copy(),
    },
    {
      key: "whatsapp",
      name: "WhatsApp",
      hint: "enviar",
      icon: <MessageCircle className="size-5" aria-hidden />,
      tone: "whatsapp",
      onClick: shareWhatsApp,
    },
    {
      key: "share",
      name: "Enviar",
      hint: "compartilhar",
      icon: <Share2 className="size-5" aria-hidden />,
      tone: "share",
      onClick: () => void nativeShare(),
    },
  ];

  if (variant === "footer") {
    return (
      <footer className="votti-share-footer animate-rise">
        <div className="votti-share-footer__intro">
          <p className="votti-share-footer__eyebrow">Compartilhe</p>
          <p className="votti-share-footer__subtitle">
            Espalhe o link e veja o ranking subir ao vivo.
          </p>
        </div>

        <ShareActionGrid actions={actions} />

        <ShareWideCard
          to="/criar"
          name="Criar votação"
          hint="em menos de 1 minuto"
          icon={<Plus className="size-5" aria-hidden />}
          tone="create"
        />
      </footer>
    );
  }

  if (variant === "success") {
    return (
      <section className="votti-share-footer votti-share-footer--embedded animate-rise">
        <div className="votti-share-footer__intro">
          <p className="votti-share-footer__eyebrow">Compartilhe</p>
          <p className="votti-share-footer__subtitle">
            Espalhe o link — o ranking atualiza ao vivo conforme os votos chegam.
          </p>
        </div>

        <ShareActionGrid actions={actions} />

        <div className="votti-share-footer__wide-list">
          {telaoUrl ? (
            <ShareWideCard
              href={telaoUrl}
              name="Abrir Telão"
              hint="modo tela cheia para eventos"
              icon={<Monitor className="size-5" aria-hidden />}
              tone="telao"
            />
          ) : null}
          <ShareWideCard
            to="/v/$slug"
            params={{ slug }}
            name="Abrir votação"
            hint="ver como o participante vê"
            icon={<ExternalLink className="size-5" aria-hidden />}
            tone="open"
          />
        </div>
      </section>
    );
  }

  return (
    <div className="votti-share-panel votti-share-panel--compact animate-rise">
      <p className="votti-share-panel__label">Compartilhar</p>
      <ShareActionGrid actions={actions} />
    </div>
  );
}
