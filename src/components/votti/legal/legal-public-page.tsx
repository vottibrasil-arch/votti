import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { PublicLegalFooter } from "@/components/votti/legal/public-legal-footer";

type LegalPublicPageProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export function LegalPublicPage({ title, children, action }: LegalPublicPageProps) {
  return (
    <main className="votti-app min-h-[100dvh] flex flex-col">
      <div className="votti-landing__bg" aria-hidden />
      <div className="votti-landing__grid" aria-hidden />
      <div className="votti-app__inner flex-1 px-4 py-6 pb-8 max-w-lg mx-auto w-full">
        <header className="votti-legal-page__top animate-rise">
          <Logo to="/" size="sm" className="votti-legal-page__logo" />
          <Link to="/" className="votti-legal-page__back">
            ← Voltar ao início
          </Link>
        </header>

        <article className="votti-legal-page__card animate-rise">
          <h1 className="votti-legal-page__title">{title}</h1>
          <div className="votti-legal-page__body">{children}</div>
          {action ? <div className="votti-legal-page__action">{action}</div> : null}
        </article>

        <PublicLegalFooter />
      </div>
    </main>
  );
}
