import { Logo } from "@/components/logo";
import { LandingAuthLink } from "@/components/landing/landing-auth-link";
import { PublicLegalFooter } from "@/components/votti/legal/public-legal-footer";

/** Cabeçalho da landing para visitantes — só logo e âncoras, sem painel do usuário. */
export function LandingGuestHeader() {
  return (
    <header className="votti-nav animate-rise">
      <Logo to="/" size="sm" className="votti-nav__logo" />

      <nav className="votti-nav__links votti-nav__links--guest">
        <a href="#passos">Passos</a>
        <a href="#beneficios">Benefícios</a>
      </nav>
    </header>
  );
}

/** @deprecated Use LandingGuestHeader para visitantes ou AppHeader para logados. */
export function LandingHeader() {
  return <LandingGuestHeader />;
}

export function LandingFooter({ guest = false }: { guest?: boolean }) {
  return (
    <footer className="votti-footer">
      <div className="votti-footer__actions">
        <LandingAuthLink redirect="/criar" className="votti-mega-btn votti-mega-btn--sm">
          CRIAR VOTAÇÃO
        </LandingAuthLink>
        {!guest ? (
          <LandingAuthLink redirect="/minhas" className="votti-outline-btn votti-footer__secondary">
            Minhas votações
          </LandingAuthLink>
        ) : null}
      </div>
      <PublicLegalFooter />
    </footer>
  );
}
