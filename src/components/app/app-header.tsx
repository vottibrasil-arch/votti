import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { AppUserMenu } from "@/components/app/app-user-menu";

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="votti-app-header animate-rise">
      <Logo to="/" size="sm" className="votti-app-header__logo" />

      <nav className="votti-app-header__nav" aria-label="Navegação principal">
        <Link
          to="/criar"
          className={`votti-app-header__link ${pathname.startsWith("/criar") ? "votti-app-header__link--active" : ""}`}
        >
          Criar votação
        </Link>
        <Link
          to="/minhas"
          className={`votti-app-header__link ${pathname === "/minhas" ? "votti-app-header__link--active" : ""}`}
        >
          Minhas votações
        </Link>
      </nav>

      <AppUserMenu className="votti-app-header__user" />
    </header>
  );
}
