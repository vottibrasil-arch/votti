import { Link, useRouterState } from "@tanstack/react-router";
import { useLegalModals } from "@/lib/votti/use-legal-modals";
import { getSearchParam, resolveLegalReturnTarget } from "@/lib/votti/legal-return";

type PublicLegalFooterProps = {
  pollUrl?: string;
  compact?: boolean;
  className?: string;
};

export function PublicLegalFooter({ pollUrl, compact, className }: PublicLegalFooterProps) {
  const { open } = useLegalModals();
  const { pathname, search, hash } = useRouterState({
    select: (state) => state.location,
  });

  const fromParam = getSearchParam(search, "from");
  const returnTo = resolveLegalReturnTarget(pathname, search, hash, fromParam);
  const legalSearch = returnTo === "/" ? undefined : { from: returnTo };

  return (
    <footer
      className={`votti-legal-footer ${compact ? "votti-legal-footer--compact" : ""} ${className ?? ""}`.trim()}
    >
      <nav className="votti-legal-footer__links" aria-label="Links institucionais">
        <Link to="/termos-de-uso" search={legalSearch} className="votti-legal-footer__link">
          Termos de Uso
        </Link>
        <Link to="/politica-de-privacidade" search={legalSearch} className="votti-legal-footer__link">
          Política de Privacidade
        </Link>
        <button
          type="button"
          className="votti-legal-footer__link"
          onClick={() => open("contact")}
        >
          Contato
        </button>
        <button
          type="button"
          className="votti-legal-footer__link"
          onClick={() => open("report", { pollUrl })}
        >
          Denunciar conteúdo
        </button>
      </nav>
      <p className="votti-legal-footer__copy">© 2026 VOTTII — Todos os direitos reservados.</p>
    </footer>
  );
}
