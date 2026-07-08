import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

type HomeCardProps = {
  to: LinkProps["to"];
  search?: LinkProps["search"];
  emoji: string;
  title: string;
  description: string;
  variant?: "primary";
};

export function HomeCard({ to, search, emoji, title, description, variant }: HomeCardProps) {
  return (
    <Link
      to={to}
      search={search}
      className={`votti-home-card ${variant === "primary" ? "votti-home-card--primary" : ""}`}
    >
      <span className="votti-home-card__emoji" aria-hidden>
        {emoji}
      </span>
      <span className="votti-home-card__body">
        <span className="votti-home-card__title">{title}</span>
        <span className="votti-home-card__desc">{description}</span>
      </span>
      <ChevronRight className="votti-home-card__chevron size-6" strokeWidth={2} />
    </Link>
  );
}

export function HomeCards() {
  return (
    <div className="votti-home-cards">
      <HomeCard
        to="/login"
        search={{ redirect: "/criar" }}
        emoji="➕"
        title="Criar votação"
        description="Crie uma votação em menos de 1 minuto."
        variant="primary"
      />
      <HomeCard
        to="/login"
        search={{ redirect: "/minhas" }}
        emoji="👤"
        title="Minhas votações"
        description="Gerencie todas as suas votações."
      />
    </div>
  );
}
