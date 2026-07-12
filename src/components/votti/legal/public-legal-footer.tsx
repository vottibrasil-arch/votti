import { Link } from "@tanstack/react-router";
import { useLegalModals } from "@/lib/votti/use-legal-modals";

type PublicLegalFooterProps = {
  pollUrl?: string;
  compact?: boolean;
  className?: string;
};

export function PublicLegalFooter({ pollUrl, compact, className }: PublicLegalFooterProps) {
  const { open } = useLegalModals();

  return (
    <footer
      className={`votti-legal-footer ${compact ? "votti-legal-footer--compact" : ""} ${className ?? ""}`.trim()}
    >
      <nav className="votti-legal-footer__links" aria-label="Links institucionais">
        <Link to="/termos-de-uso" className="votti-legal-footer__link">
          Termos de Uso
        </Link>
        <Link to="/politica-de-privacidade" className="votti-legal-footer__link">
          Política de Privacidade
        </Link>
        <Link to="/contato" className="votti-legal-footer__link">
          Contato
        </Link>
        <button
          type="button"
          className="votti-legal-footer__link"
          onClick={() => open("report", { pollUrl })}
        >
          Denunciar conteúdo
        </button>
      </nav>
      <p className="votti-legal-footer__copy">© 2026 VOTTI — Todos os direitos reservados.</p>
    </footer>
  );
}
