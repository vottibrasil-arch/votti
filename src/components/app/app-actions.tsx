import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Logo } from "@/components/logo";

type AppActionProps = {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  variant?: "primary" | "default";
};

export function AppAction({ to, icon, title, subtitle, variant = "default" }: AppActionProps) {
  return (
    <Link
      to={to}
      className={`app-action ${variant === "primary" ? "app-action--primary" : ""}`}
    >
      <span className="app-action__icon">{icon}</span>
      <span className="app-action__text">
        <span className="app-action__title">{title}</span>
        {subtitle ? <span className="app-action__sub">{subtitle}</span> : null}
      </span>
      <ChevronRight className="app-action__chevron size-5 shrink-0 opacity-40" />
    </Link>
  );
}

export function AppBrand() {
  return (
    <div className="flex justify-center">
      <Logo size="hero" />
    </div>
  );
}
