import { Link } from "@tanstack/react-router";
import { Copy, MessageCircle, Plus, Share2 } from "lucide-react";
import { useState } from "react";
import { pollPublicUrl } from "@/lib/votti/poll-store";

type PollSharePanelProps = {
  slug: string;
  title: string;
};

export function PollSharePanel({ slug, title }: PollSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const url = pollPublicUrl(slug);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Vote agora em "${title}": ${url}`)}`,
      "_blank",
    );
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `VOTTI — ${title}`,
          text: "Convide outras pessoas para votar através deste link.",
          url,
        });
        return;
      } catch {
        /* cancelado */
      }
    }
    void copyLink();
  }

  return (
    <div className="votti-share-panel animate-rise">
      <p className="votti-share-panel__label">Compartilhar votação</p>
      <p className="votti-share-panel__desc">Convide outras pessoas para votar através deste link.</p>
      <p className="votti-share-panel__url">{url}</p>

      <div className="votti-share-panel__actions">
        <button type="button" className="votti-outline-btn" onClick={shareWhatsApp}>
          <MessageCircle className="size-4" /> WhatsApp
        </button>
        <button type="button" className="votti-outline-btn" onClick={() => void copyLink()}>
          <Copy className="size-4" /> {copied ? "Copiado!" : "Copiar link"}
        </button>
        <button type="button" className="votti-outline-btn" onClick={() => void nativeShare()}>
          <Share2 className="size-4" /> Compartilhar
        </button>
      </div>

      <div className="votti-share-panel__cta">
        <p className="votti-share-panel__cta-label">Quer criar a sua?</p>
        <p className="votti-share-panel__cta-desc">
          Monte sua votação em menos de 1 minuto e compartilhe com quem quiser.
        </p>
        <Link to="/" className="votti-mega-btn votti-mega-btn--sm w-full max-w-none">
          <Plus className="size-4" /> Criar minha votação
        </Link>
      </div>
    </div>
  );
}
