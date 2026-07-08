import { ArrowRight } from "lucide-react";
import { AppUserMenu } from "@/components/app/app-user-menu";
import { Logo } from "@/components/logo";
import { LandingAuthLink } from "@/components/landing/landing-auth-link";

export function LandingHeader() {
  return (
    <header className="votti-nav animate-rise">
      <Logo to="/" size="sm" className="votti-nav__logo" />

      <nav className="votti-nav__links">
        <a href="#passos">Passos</a>
        <a href="#beneficios">Benefícios</a>
      </nav>

      <div className="votti-nav__actions votti-nav__actions--stack">
        <AppUserMenu className="votti-nav__user" />
        <LandingAuthLink redirect="/criar" className="votti-nav__cta">
          Criar votação
          <ArrowRight className="size-4" />
        </LandingAuthLink>
        <LandingAuthLink redirect="/minhas" className="votti-nav__secondary">
          Minhas votações
        </LandingAuthLink>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="votti-footer">
      <div className="votti-footer__actions">
        <LandingAuthLink redirect="/criar" className="votti-mega-btn votti-mega-btn--sm">
          CRIAR VOTAÇÃO
        </LandingAuthLink>
        <LandingAuthLink redirect="/minhas" className="votti-outline-btn votti-footer__secondary">
          Minhas votações
        </LandingAuthLink>
      </div>
      <p className="votti-footer__copy">© {new Date().getFullYear()} VOTTI</p>
    </footer>
  );
}
