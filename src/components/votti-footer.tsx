import { useRouterState } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Plus, Share2 } from "lucide-react";
import { FooterAdSlot } from "@/components/footer/footer-ad-slot";
import { getFooterAdConfig } from "@/lib/footer-ad";

/** Rodapé fixo com ads — só em páginas de votação (futuro). Oculto no app, landing e páginas institucionais. */
const HIDE_FOOTER_ON = new Set([
  "/",
  "/como-funciona",
  "/login",
  "/cadastro",
  "/criar",
  "/criar/sucesso",
  "/minhas",
  "/minha-conta",
  "/sup",
  "/auth/callback",
  "/termos-de-uso",
  "/politica-de-privacidade",
  "/contato",
]);

export function VottiFooter() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const adConfig = getFooterAdConfig();

  if (HIDE_FOOTER_ON.has(pathname) || pathname.startsWith("/votacao/") || pathname.startsWith("/v/")) return null;

  async function handleShare() {
    const url = window.location.href;
    const title = "VOTTII — Sua votação em tempo real";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelado */
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* indisponível */
    }
  }

  return (
    <footer
      className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)] pointer-events-none"
      aria-label="Rodapé"
    >
      <div
        className="pointer-events-auto mx-auto max-w-md px-4 pb-3 pt-2 space-y-2"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--background) 80%, transparent) 20%, var(--background) 100%)",
        }}
      >
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
          >
            <Share2 className="size-3.5" />
            Compartilhar
          </button>

          <Link
            to="/criar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition"
          >
            <Plus className="size-3.5" />
            Crie sua votação gratuitamente
          </Link>
        </div>

        <div className="h-[92px] md:h-[80px] overflow-hidden rounded-xl border border-border/40 bg-surface/50">
          <FooterAdSlot config={adConfig} />
        </div>

        <p className="text-center text-[10px] text-muted-foreground/70">
          © {new Date().getFullYear()} VOTTII
        </p>
      </div>
    </footer>
  );
}
