import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/use-auth";

type LandingAuthLinkProps = {
  redirect: "/criar" | "/minhas";
  className?: string;
  children: ReactNode;
};

/** Logado → vai direto. Deslogado → login com redirect. */
export function LandingAuthLink({ redirect, className, children }: LandingAuthLinkProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <span className={className} aria-hidden>
        {children}
      </span>
    );
  }

  if (user) {
    return (
      <Link to={redirect} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <Link to="/login" search={{ redirect }} className={className}>
      {children}
    </Link>
  );
}
