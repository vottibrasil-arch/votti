import { Copy, Download, MessageCircle, Monitor, Share2, Smartphone } from "lucide-react";
import { useState } from "react";
import { pollPublicUrl, pollTelaoUrl } from "@/lib/votti/poll-store";

type PollSharePanelProps = {
  slug: string;
  title: string;
  compact?: boolean;
};

function qrImageUrl(url: string, size = 160) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}

export function PollSharePanel({ slug, title, compact = true }: PollSharePanelProps) {
  const [copied, setCopied] = useState<"vote" | "telao" | null>(null);
  const voteUrl = pollPublicUrl(slug);
  const telaoUrl = pollTelaoUrl(slug);

  async function copy(url: string, kind: "vote" | "telao") {
    await navigator.clipboard.writeText(url);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  function shareWhatsApp(url: string) {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Vote em "${title}": ${url}`)}`,
      "_blank",
    );
  }

  async function nativeShare(url: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title: `VOTTI — ${title}`, url });
        return;
      } catch {
        /* cancelado */
      }
    }
    await copy(url, "vote");
  }

  async function downloadQr() {
    const res = await fetch(qrImageUrl(voteUrl, 400));
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `votti-${slug}-qrcode.png`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className={`votti-share-panel ${compact ? "votti-share-panel--compact" : ""} animate-rise`}>
      <p className="votti-share-panel__label">Compartilhar</p>

      <div className="votti-share-panel__grid">
        <a href={voteUrl} target="_blank" rel="noreferrer" className="votti-share-chip">
          <Smartphone className="size-3.5" /> Link votação
        </a>
        <a href={telaoUrl} target="_blank" rel="noreferrer" className="votti-share-chip">
          <Monitor className="size-3.5" /> Link telão
        </a>
        <button type="button" className="votti-share-chip" onClick={() => void copy(voteUrl, "vote")}>
          <Copy className="size-3.5" /> {copied === "vote" ? "Copiado!" : "Copiar link"}
        </button>
        <button type="button" className="votti-share-chip" onClick={() => void nativeShare(voteUrl)}>
          <Share2 className="size-3.5" /> Compartilhar
        </button>
        <button type="button" className="votti-share-chip" onClick={() => shareWhatsApp(voteUrl)}>
          <MessageCircle className="size-3.5" /> WhatsApp
        </button>
        <button type="button" className="votti-share-chip" onClick={() => void downloadQr()}>
          <Download className="size-3.5" /> Baixar QR
        </button>
      </div>

      <div className="votti-share-panel__qr-row">
        <img src={qrImageUrl(voteUrl)} alt="QR Code da votação" width={72} height={72} />
        <p className="votti-share-panel__url">{voteUrl}</p>
      </div>
    </div>
  );
}
