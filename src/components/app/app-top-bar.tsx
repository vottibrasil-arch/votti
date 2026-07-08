import { useRouter, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { AppUserMenu } from "@/components/app/app-user-menu";
import { SecurityBadge } from "@/components/votti/security-badge";

type AppTopBarProps = {
  title?: string;
  back?: LinkProps["to"];
  trust?: boolean;
};

export function AppTopBar({ title, back = "/", trust = true }: AppTopBarProps) {
  const router = useRouter();

  return (
    <header className="votti-app-topbar animate-rise">
      <button
        type="button"
        onClick={() => router.navigate({ to: back })}
        className="votti-app-topbar__back"
        aria-label="Voltar"
      >
        <ArrowLeft className="size-5" />
      </button>
      <Logo to="/" size="sm" className="votti-nav__logo" />
      <AppUserMenu />
      {title ? <p className="votti-app-topbar__title">{title}</p> : null}
      {trust ? (
        <div className="votti-app-topbar__trust">
          <SecurityBadge compact />
        </div>
      ) : null}
    </header>
  );
}
