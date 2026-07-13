import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { ADSENSE_CLIENT, ADSENSE_SCRIPT_SRC } from "../lib/adsense";
import { MONETAG_VERIFICATION_CONTENT } from "../lib/monetag";
import { reportAppError } from "../lib/votti-error-reporting";
import { getServerPublicOrigin } from "../lib/votti/app-url";
import { VOTTI_LOGO_PATH } from "../lib/votti/brand";
import { DEFAULT_OG_LOGO_PATH } from "../lib/votti/poll-share-meta";
import { AuthProvider } from "../lib/auth/use-auth";
import { VottiFooter } from "../components/votti-footer";
import { LegalModalsProvider } from "../lib/votti/use-legal-modals";
import { LegalModalsRoot } from "../components/votti/legal/legal-modals-root";
import { PublicLegalFooter } from "../components/votti/legal/public-legal-footer";

function NotFoundComponent() {
  return (
    <main className="votti-app min-h-[100dvh] flex flex-col">
      <div className="votti-landing__bg" aria-hidden />
      <div className="votti-landing__grid" aria-hidden />
      <div className="votti-app__inner flex-1 flex items-center justify-center px-5">
        <div className="votti-quest max-w-sm w-full animate-rise">
          <p className="votti-quest__label">404</p>
          <h1 className="votti-quest__title">Página não encontrada</h1>
          <p className="votti-quest__hint">A página que você procura não existe ou foi movida.</p>
          <Link to="/" className="votti-mega-btn votti-mega-btn--sm mt-6">
            VOLTAR AO INÍCIO
          </Link>
          <PublicLegalFooter className="mt-8" />
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportAppError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente atualizar ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const origin = getServerPublicOrigin();
    const defaultImage = `${origin}${DEFAULT_OG_LOGO_PATH}`;

    return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1a2d5a" },
      { name: "google-adsense-account", content: ADSENSE_CLIENT },
      { name: "monetag", content: MONETAG_VERIFICATION_CONTENT },
      {
        name: "google-site-verification",
        content: "UVl-pT0CIRj7LcIYPCzW6Lc9J2Ot58ln21tPr1e5Ilw",
      },
      { title: "VOTTII — Sua votação em tempo real" },
      {
        name: "description",
        content: "Crie votações em menos de 1 minuto. Compartilhe pelo WhatsApp e acompanhe o resultado ao vivo.",
      },
      { property: "og:title", content: "VOTTII — Sua votação em tempo real" },
      {
        property: "og:description",
        content: "Vote uma vez. Acompanhe ao vivo.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: defaultImage },
      { property: "og:image:alt", content: "VOTTII — Vote. Compartilhe. Acompanhe ao vivo." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "VOTTII — Sua votação em tempo real" },
      {
        name: "twitter:description",
        content: "Vote uma vez. Acompanhe ao vivo.",
      },
      { name: "twitter:image", content: defaultImage },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: VOTTI_LOGO_PATH, type: "image/png", sizes: "512x512" },
      { rel: "apple-touch-icon", href: VOTTI_LOGO_PATH },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://pagead2.googlesyndication.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script async src={ADSENSE_SCRIPT_SRC} crossOrigin="anonymous" suppressHydrationWarning />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LegalModalsProvider>
          <Outlet />
          <VottiFooter />
          <LegalModalsRoot />
        </LegalModalsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
