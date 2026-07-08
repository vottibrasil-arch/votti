import { Link } from "@tanstack/react-router";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { pollPublicUrl } from "@/lib/votti/poll-store";

type PollSharePanelProps = {
  slug: string;
  title: string;
  variant?: "default" | "footer";
};

export function PollSharePanel({ slug, title, variant = "default" }: PollSharePanelProps) {
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

  if (variant === "footer") {
    return (
      <footer className="votti-share-footer animate-rise">
        <div className="votti-share-footer__actions">
          <button type="button" className="votti-share-footer__btn" onClick={() => void copy()} title="Copiar link">
            <Copy className="size-4" />
            <span>{copied ? "Copiado" : "Copiar"}</span>
          </button>
          <button type="button" className="votti-share-footer__btn" onClick={() => shareWhatsApp()} title="WhatsApp">
            <MessageCircle className="size-4" />
            <span>WhatsApp</span>
          </button>
          <button type="button" className="votti-share-footer__btn" onClick={() => void nativeShare()} title="Compartilhar">
            <Share2 className="size-4" />
            <span>Enviar</span>
          </button>
        </div>
        <Link to="/criar" className="votti-share-footer__create">
          Criar votação
        </Link>
      </footer>
    );
  }

  return (
    <div className="votti-share-panel votti-share-panel--compact animate-rise">
      <p className="votti-share-panel__label">Compartilhar</p>
      <div className="votti-share-panel__grid">
        <button type="button" className="votti-share-chip" onClick={() => void copy()}>
          <Copy className="size-3.5" /> {copied ? "Copiado!" : "Copiar link"}
        </button>
        <button type="button" className="votti-share-chip" onClick={() => void nativeShare()}>
          <Share2 className="size-3.5" /> Compartilhar
        </button>
        <button type="button" className="votti-share-chip" onClick={() => shareWhatsApp()}>
          <MessageCircle className="size-3.5" /> WhatsApp
        </button>
      </div>
    </div>
  );
}
