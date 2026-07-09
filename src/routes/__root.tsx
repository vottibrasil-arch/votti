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
import { reportAppError } from "../lib/votti-error-reporting";
import { AuthProvider } from "../lib/auth/use-auth";
import { VottiFooter } from "../components/votti-footer";

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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1a2d5a" },
      { name: "google-adsense-account", content: ADSENSE_CLIENT },
      { title: "VOTTI — Sua votação em tempo real" },
      {
        name: "description",
        content: "Crie votações em menos de 1 minuto. Compartilhe pelo WhatsApp e acompanhe o resultado ao vivo.",
      },
      { property: "og:title", content: "VOTTI — Sua votação em tempo real" },
      {
        property: "og:description",
        content: "Vote uma vez. Acompanhe ao vivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "VOTTI — Sua votação em tempo real" },
      {
        name: "twitter:description",
        content: "Vote uma vez. Acompanhe ao vivo.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/logo-full.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo-full.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://pagead2.googlesyndication.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
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
        <Outlet />
        <VottiFooter />
      </AuthProvider>
    </QueryClientProvider>
  );
}
